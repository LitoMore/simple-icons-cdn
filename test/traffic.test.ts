import { assertEquals, assertRejects, assertStringIncludes } from '@std/assert';
import { formatCount, lastOneMonthRequests } from '../source/traffic.ts';

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

Deno.test('Cloudflare traffic requests', async (test) => {
	let currentTime = new Date('2000-01-31T12:34:56Z');
	const now = () => currentTime;

	await test.step('formats request counts', () => {
		assertEquals(formatCount(1_500_000_000), '2B');
		assertEquals(formatCount(1_500_000), '2M');
		assertEquals(formatCount(1_500), '2K');
		assertEquals(formatCount(999), '999');
	});

	await test.step('queries Cloudflare and parses all count formats', async () => {
		let requestedUrl: string | undefined;
		let requestedInit: RequestInit | undefined;
		const mockFetch: typeof fetch = (input, init) => {
			requestedUrl = String(input);
			requestedInit = init;
			return Promise.resolve(
				responseWithPayload({
					errors: [],
					data: {
						viewer: {
							accounts: [{
								requests: [
									{ count: 123 },
									{ count: Number.NaN },
									{ count: null },
									{ count: '   ' },
									{ count: '1K' },
									{ count: '2M' },
									{ count: '3B' },
									{ count: '456' },
									{ count: 'invalid' },
								],
							}],
						},
					},
				}),
			);
		};

		const count = await lastOneMonthRequests({
			fetch: mockFetch,
			getEnv: getEnvFrom(primaryEnvironment),
			now,
		});

		assertEquals(count, 3_002_001_579);
		assertEquals(requestedUrl, CLOUDFLARE_GRAPHQL_API_URL);
		assertEquals(requestedInit?.method, 'POST');
		assertEquals(
			new Headers(requestedInit?.headers).get('Authorization'),
			'Bearer api-token',
		);
		assertEquals(
			new Headers(requestedInit?.headers).get('Content-Type'),
			'application/json',
		);

		const requestBody = JSON.parse(String(requestedInit?.body));
		assertStringIncludes(requestBody.query, 'httpRequestsAdaptiveGroups');
		assertEquals(requestBody.variables, {
			accountTag: 'account-id',
			end: '2000-01-31T00:00:00Z',
			hostname: 'cdn.simpleicons.org',
			start: '2000-01-01T00:00:00Z',
			zoneTag: 'zone-id',
		});
	});

	await test.step('caches results and merges concurrent requests', async () => {
		currentTime = new Date(currentTime.getTime() + 2 * DAY_IN_MILLISECONDS);
		const firstResponse = Promise.withResolvers<Response>();
		let fetchCalls = 0;
		const mockFetch: typeof fetch = () => {
			fetchCalls++;
			if (fetchCalls === 1) {
				return firstResponse.promise;
			}

			return Promise.resolve(
				Response.json({
					data: {
						viewer: {
							accounts: [{ requests: [{ count: 456 }] }],
						},
					},
				}),
			);
		};
		const options = {
			fetch: mockFetch,
			getEnv: getEnvFrom(primaryEnvironment),
			now,
		};

		const firstCount = lastOneMonthRequests(options);
		const concurrentCount = lastOneMonthRequests(options);
		assertEquals(fetchCalls, 1);
		firstResponse.resolve(
			Response.json({
				data: {
					viewer: {
						accounts: [{ requests: [{ count: 123 }] }],
					},
				},
			}),
		);
		assertEquals(await Promise.all([firstCount, concurrentCount]), [123, 123]);

		currentTime = new Date(
			currentTime.getTime() + DAY_IN_MILLISECONDS - 1,
		);
		assertEquals(await lastOneMonthRequests(options), 123);
		assertEquals(fetchCalls, 1);

		currentTime = new Date(currentTime.getTime() + 1);
		assertEquals(await lastOneMonthRequests(options), 456);
		assertEquals(fetchCalls, 2);
	});

	await test.step('does not cache missing environment errors', async () => {
		currentTime = new Date(currentTime.getTime() + 2 * DAY_IN_MILLISECONDS);
		let fetchCalls = 0;
		await assertRejects(
			() =>
				lastOneMonthRequests({
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
				lastOneMonthRequests({
					fetch: () =>
						Promise.resolve(
							new Response('Forbidden', { status: 403 }),
						),
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
				lastOneMonthRequests({
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
				lastOneMonthRequests({
					fetch: () => Promise.resolve(Response.json({})),
					getEnv: getEnvFrom(primaryEnvironment),
					now,
				}),
			Error,
			'Cloudflare GraphQL API did not return account traffic data.',
		);
	});

	await test.step('uses fallback environment names and handles no requests', async () => {
		let requestedInit: RequestInit | undefined;
		const count = await lastOneMonthRequests({
			fetch: (_input, init) => {
				requestedInit = init;
				return Promise.resolve(
					Response.json({
						errors: [],
						data: { viewer: { accounts: [{}] } },
					}),
				);
			},
			getEnv: getEnvFrom(fallbackEnvironment),
			now,
		});

		assertEquals(count, 0);
		assertEquals(
			new Headers(requestedInit?.headers).get('Authorization'),
			'Bearer fallback-api-token',
		);
		assertEquals(JSON.parse(String(requestedInit?.body)).variables, {
			accountTag: 'fallback-account-id',
			end: '2000-02-05T00:00:00Z',
			hostname: 'cdn.simpleicons.org',
			start: '2000-01-06T00:00:00Z',
			zoneTag: 'fallback-zone-id',
		});
	});

	await test.step('uses default dependencies without network access', async () => {
		const originalFetch = globalThis.fetch;
		const originalGetEnv = Deno.env.get;
		let fetchCalls = 0;
		globalThis.fetch = () => {
			fetchCalls++;
			return Promise.resolve(
				Response.json({
					data: {
						viewer: {
							accounts: [{ requests: [{ count: 789 }] }],
						},
					},
				}),
			);
		};
		Deno.env.get = getEnvFrom(primaryEnvironment);

		try {
			assertEquals(await lastOneMonthRequests(), 789);
			assertEquals(fetchCalls, 1);
		} finally {
			globalThis.fetch = originalFetch;
			Deno.env.get = originalGetEnv;
		}
	});
});
