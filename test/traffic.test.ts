import { assertEquals, assertRejects, assertStringIncludes } from '@std/assert';
import {
	formatBytes,
	formatCount,
	lastOneMonthRequests,
	lastOneMonthTraffic,
} from '../source/traffic.ts';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const CLOUDFLARE_GRAPHQL_API_URL =
	'https://api.cloudflare.com/client/v4/graphql';

const primaryEnvironment: Record<string, string> = {
	CLOUDFLARE_SI_ACCOUNT_ID: 'account-id',
	CLOUDFLARE_SI_API_TOKEN: 'api-token',
	CLOUDFLARE_SI_ZONE_ID: 'zone-id',
};

const fallbackEnvironment: Record<string, string> = {
	CLOUDFLARE_ACCOUNT_ID: 'fallback-account-id',
	CLOUDFLARE_API_TOKEN: 'fallback-api-token',
	CLOUDFLARE_ZONE_ID: 'fallback-zone-id',
};

const getEnvFrom = (environment: Record<string, string>) => (name: string) =>
	environment[name];

const responseWithPayload = (payload: unknown) => {
	const response = new Response();
	Object.defineProperty(response, 'json', {
		value: () => Promise.resolve(payload),
	});
	return response;
};

const createTrafficPayload = (
	{
		requests,
		uniqueVisitors,
		dataServed,
	}: {
		requests: number | string | null;
		uniqueVisitors: number | string | null;
		dataServed: number | string | null;
	},
) => ({
	data: {
		viewer: {
			accounts: [{
				traffic: [{
					count: requests,
					sum: { edgeResponseBytes: dataServed },
				}],
			}],
			zones: [{
				uniqueVisitors: [{ uniq: { uniques: uniqueVisitors } }],
			}],
		},
	},
});

Deno.test('Cloudflare traffic', async (test) => {
	let currentTime = new Date('2000-01-31T12:34:56Z');
	const now = () => currentTime;

	await test.step('formats counts and byte sizes', () => {
		assertEquals(formatCount(1_500_000_000), '1.5 billion');
		assertEquals(formatCount(1_250_000_000), '1.25 billion');
		assertEquals(formatCount(1_000_000_000), '1 billion');
		assertEquals(formatCount(1_500_000), '2M');
		assertEquals(formatCount(1_500), '2K');
		assertEquals(formatCount(999), '999');

		assertEquals(formatBytes(1_500_000_000_000_000), '2PB');
		assertEquals(formatBytes(1_500_000_000_000), '1.5TB');
		assertEquals(formatBytes(1_250_000_000_000), '1.25TB');
		assertEquals(formatBytes(1_000_000_000_000), '1TB');
		assertEquals(formatBytes(1_500_000_000), '2GB');
		assertEquals(formatBytes(1_500_000), '2MB');
		assertEquals(formatBytes(1_500), '2KB');
		assertEquals(formatBytes(999), '999B');
	});

	await test.step('queries Cloudflare and parses all traffic metrics', async () => {
		const requestedUrls: string[] = [];
		const requestedInits: RequestInit[] = [];
		const mockFetch: typeof fetch = (input, init) => {
			requestedUrls.push(String(input));
			requestedInits.push(init ?? {});
			return Promise.resolve(
				responseWithPayload({
					errors: [],
					data: {
						viewer: {
							accounts: [{
								traffic: [
									{ count: 123, sum: { edgeResponseBytes: 500 } },
									{
										count: Number.NaN,
										sum: { edgeResponseBytes: Number.NaN },
									},
									{ count: null, sum: { edgeResponseBytes: null } },
									{ count: '   ', sum: { edgeResponseBytes: '   ' } },
									{ count: '1K', sum: { edgeResponseBytes: '1K' } },
									{ count: '2M', sum: { edgeResponseBytes: '2M' } },
									{ count: '3B', sum: { edgeResponseBytes: '3B' } },
									{ count: '456', sum: { edgeResponseBytes: '456' } },
									{ count: 'invalid', sum: { edgeResponseBytes: 'invalid' } },
								],
							}],
							zones: [{
								uniqueVisitors: [
									{ uniq: { uniques: 12 } },
									{ uniq: { uniques: null } },
									{ uniq: { uniques: '1K' } },
									{ uniq: { uniques: '34' } },
									{ uniq: { uniques: 'invalid' } },
								],
							}],
						},
					},
				}),
			);
		};

		const traffic = await lastOneMonthTraffic({
			fetch: mockFetch,
			getEnv: getEnvFrom(primaryEnvironment),
			now,
		});

		assertEquals(traffic, {
			requests: 3_002_001_579,
			uniqueVisitors: 1_046,
			dataServed: 3_002_001_956,
		});
		assertEquals(requestedUrls, [CLOUDFLARE_GRAPHQL_API_URL]);
		for (const init of requestedInits) {
			assertEquals(init.method, 'POST');
			assertEquals(
				new Headers(init.headers).get('Authorization'),
				'Bearer api-token',
			);
			assertEquals(
				new Headers(init.headers).get('Content-Type'),
				'application/json',
			);
		}

		const requestBodies = requestedInits.map((init) =>
			JSON.parse(String(init.body))
		);
		const requestBody = requestBodies[0];
		assertStringIncludes(
			requestBody.query,
			'traffic: httpRequestsAdaptiveGroups',
		);
		assertStringIncludes(requestBody.query, 'count');
		assertStringIncludes(requestBody.query, 'edgeResponseBytes');
		assertStringIncludes(
			requestBody.query,
			'uniqueVisitors: httpRequests1dGroups',
		);
		assertStringIncludes(requestBody.query, 'uniques');
		assertStringIncludes(
			requestBody.query,
			'clientRequestHTTPHost: $hostname',
		);
		assertStringIncludes(requestBody.query, '$hostname: string');
		assertEquals(
			requestBody.query.match(/clientRequestHTTPHost/g)?.length,
			1,
		);
		assertEquals(requestBody.query.match(/zoneTag: \$zoneTag/g)?.length, 2);
		assertStringIncludes(requestBody.query, 'datetime_geq: $start');
		assertStringIncludes(requestBody.query, 'datetime_lt: $end');
		assertStringIncludes(requestBody.query, 'date_geq: $startDate');
		assertStringIncludes(requestBody.query, 'date_lt: $endDate');
		assertStringIncludes(requestBody.query, 'requestSource: "eyeball"');
		assertEquals(requestBody.variables, {
			accountTag: 'account-id',
			end: '2000-01-31T00:00:00Z',
			endDate: '2000-01-31',
			hostname: 'cdn.simpleicons.org',
			start: '2000-01-01T00:00:00Z',
			startDate: '2000-01-01',
			zoneTag: 'zone-id',
		});
	});

	await test.step('caches all metrics and merges concurrent requests', async () => {
		currentTime = new Date(currentTime.getTime() + 2 * DAY_IN_MILLISECONDS);
		const firstResponse = Promise.withResolvers<Response>();
		const refreshedPayload = createTrafficPayload({
			requests: 456,
			uniqueVisitors: 78,
			dataServed: 9_000,
		});
		let fetchCalls = 0;
		const mockFetch: typeof fetch = () => {
			const callIndex = fetchCalls++;
			return callIndex === 0
				? firstResponse.promise
				: Promise.resolve(Response.json(refreshedPayload));
		};
		const options = {
			fetch: mockFetch,
			getEnv: getEnvFrom(primaryEnvironment),
			now,
		};

		const firstTraffic = lastOneMonthTraffic(options);
		const concurrentRequests = lastOneMonthRequests(options);
		assertEquals(fetchCalls, 1);
		firstResponse.resolve(
			Response.json(
				createTrafficPayload({
					requests: 123,
					uniqueVisitors: 45,
					dataServed: 6_000,
				}),
			),
		);
		assertEquals(await Promise.all([firstTraffic, concurrentRequests]), [
			{ requests: 123, uniqueVisitors: 45, dataServed: 6_000 },
			123,
		]);

		currentTime = new Date(
			currentTime.getTime() + DAY_IN_MILLISECONDS - 1,
		);
		assertEquals(await lastOneMonthTraffic(options), {
			requests: 123,
			uniqueVisitors: 45,
			dataServed: 6_000,
		});
		assertEquals(fetchCalls, 1);

		currentTime = new Date(currentTime.getTime() + 1);
		assertEquals(await lastOneMonthTraffic(options), {
			requests: 456,
			uniqueVisitors: 78,
			dataServed: 9_000,
		});
		assertEquals(fetchCalls, 2);
	});

	await test.step('does not cache missing environment errors', async () => {
		currentTime = new Date(currentTime.getTime() + 2 * DAY_IN_MILLISECONDS);
		let fetchCalls = 0;
		await assertRejects(
			() =>
				lastOneMonthTraffic({
					fetch: () => {
						fetchCalls++;
						return Promise.resolve(new Response());
					},
					getEnv: () => undefined,
					now,
				}),
			Error,
			'Missing required environment variable: CLOUDFLARE_SI_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID',
		);
		assertEquals(fetchCalls, 0);
	});

	await test.step('reports Cloudflare HTTP errors', async () => {
		await assertRejects(
			() =>
				lastOneMonthTraffic({
					fetch: () =>
						Promise.resolve(new Response('Forbidden', { status: 403 })),
					getEnv: getEnvFrom(primaryEnvironment),
					now,
				}),
			Error,
			'Cloudflare GraphQL API request failed with 403: Forbidden',
		);
	});

	await test.step('reports Cloudflare GraphQL errors', async () => {
		await assertRejects(
			() =>
				lastOneMonthTraffic({
					fetch: () =>
						Promise.resolve(
							Response.json({
								errors: [{ message: 'Known error' }, {}],
							}),
						),
					getEnv: getEnvFrom(primaryEnvironment),
					now,
				}),
			Error,
			'Cloudflare GraphQL API returned errors: Known error, Unknown error',
		);
	});

	await test.step('reports missing account data', async () => {
		await assertRejects(
			() =>
				lastOneMonthTraffic({
					fetch: () => Promise.resolve(Response.json({})),
					getEnv: getEnvFrom(primaryEnvironment),
					now,
				}),
			Error,
			'Cloudflare GraphQL API did not return account traffic data.',
		);
	});

	await test.step('reports missing zone data', async () => {
		await assertRejects(
			() =>
				lastOneMonthTraffic({
					fetch: () =>
						Promise.resolve(
							Response.json({
								data: { viewer: { accounts: [{}] } },
							}),
						),
					getEnv: getEnvFrom(primaryEnvironment),
					now,
				}),
			Error,
			'Cloudflare GraphQL API did not return zone traffic data.',
		);
	});

	await test.step('uses fallback environment names and handles no traffic', async () => {
		const requestedInits: RequestInit[] = [];
		const traffic = await lastOneMonthTraffic({
			fetch: (_input, init) => {
				requestedInits.push(init ?? {});
				return Promise.resolve(
					Response.json({
						errors: [],
						data: {
							viewer: { accounts: [{}], zones: [{}] },
						},
					}),
				);
			},
			getEnv: getEnvFrom(fallbackEnvironment),
			now,
		});

		assertEquals(traffic, {
			requests: 0,
			uniqueVisitors: 0,
			dataServed: 0,
		});
		assertEquals(requestedInits.length, 1);
		const requestedInit = requestedInits[0];
		assertEquals(
			new Headers(requestedInit.headers).get('Authorization'),
			'Bearer fallback-api-token',
		);
		assertEquals(
			JSON.parse(String(requestedInit.body)).variables,
			{
				accountTag: 'fallback-account-id',
				end: '2000-02-05T00:00:00Z',
				endDate: '2000-02-05',
				hostname: 'cdn.simpleicons.org',
				start: '2000-01-06T00:00:00Z',
				startDate: '2000-01-06',
				zoneTag: 'fallback-zone-id',
			},
		);
	});

	await test.step('uses default dependencies without network access', async () => {
		const originalFetch = globalThis.fetch;
		const originalGetEnv = Deno.env.get;
		let fetchCalls = 0;
		globalThis.fetch = () => {
			fetchCalls++;
			return Promise.resolve(
				Response.json(
					createTrafficPayload({
						requests: 789,
						uniqueVisitors: 67,
						dataServed: 8_900,
					}),
				),
			);
		};
		Deno.env.get = getEnvFrom(primaryEnvironment);

		try {
			assertEquals(await lastOneMonthTraffic(), {
				requests: 789,
				uniqueVisitors: 67,
				dataServed: 8_900,
			});
			assertEquals(await lastOneMonthRequests(), 789);
			assertEquals(fetchCalls, 1);
		} finally {
			globalThis.fetch = originalFetch;
			Deno.env.get = originalGetEnv;
		}
	});
});
