import {test, type TestContext} from 'node:test';
import process from 'node:process';
import {
	formatBytes,
	formatCount,
	lastOneMonthRequests,
	lastOneMonthTraffic,
} from '../source/traffic.ts';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const CLOUDFLARE_GRAPHQL_API_URL =
	'https://api.cloudflare.com/client/v4/graphql';

const primaryEnvironment: Record<string, string> = Object.fromEntries([
	['CLOUDFLARE_SI_ACCOUNT_ID', 'account-id'],
	['CLOUDFLARE_SI_API_TOKEN', 'api-token'],
	['CLOUDFLARE_SI_ZONE_ID', 'zone-id'],
]);

const fallbackEnvironment: Record<string, string> = Object.fromEntries([
	['CLOUDFLARE_ACCOUNT_ID', 'fallback-account-id'],
	['CLOUDFLARE_API_TOKEN', 'fallback-api-token'],
	['CLOUDFLARE_ZONE_ID', 'fallback-zone-id'],
]);

const getEnvFrom = (environment: Record<string, string>) => (name: string) =>
	environment[name];

const responseWithPayload = (payload: unknown) => {
	const response = new Response();
	Object.defineProperty(response, 'json', {
		value: async () => payload,
	});
	return response;
};

const createTrafficPayload = (
	{
		requests,
		uniqueVisitors,
		dataServed,
	}: {
		requests: number | string | undefined;
		uniqueVisitors: number | string | undefined;
		dataServed: number | string | undefined;
	},
) => ({
	data: {
		viewer: {
			accounts: [{
				traffic: [{
					count: requests,
					sum: {edgeResponseBytes: dataServed},
				}],
			}],
			zones: [{
				uniqueVisitors: [{uniq: {uniques: uniqueVisitors}}],
			}],
		},
	},
});

await test('Cloudflare traffic', async (t: TestContext) => {
	let currentTime = new Date('2000-01-31T12:34:56Z');
	const now = () => currentTime;

	await t.test('formats counts and byte sizes', async (t: TestContext) => {
		t.assert.strictEqual(formatCount(1_500_000_000), '1.5 billion');
		t.assert.strictEqual(formatCount(1_250_000_000), '1.25 billion');
		t.assert.strictEqual(formatCount(1_000_000_000), '1 billion');
		t.assert.strictEqual(formatCount(1_500_000), '1.5 million');
		const units = [[1_000_000, 'million'], [1_000_000_000, 'billion']] as const;
		const values = [
			[1, '1'],
			[1.234567, '1.23'],
			[1.239999, '1.23'],
			[1.24, '1.24'],
			[9.999999, '9.99'],
			[10, '10'],
			[12.345678, '12.3'],
			[99.999999, '99.9'],
			[100, '100'],
			[123.456789, '123'],
			[999.999999, '999'],
		] as const;
		const cases = units.flatMap(([divisor, suffix]) =>
			values.map(([value, expected]) => ({
				value: value * divisor,
				expected: `${expected} ${suffix}`,
			})),
		);
		await Promise.all(cases.map(async ({value, expected}) => {
			await t.test(`formats ${value} as ${expected}`, (t: TestContext) => {
				t.assert.strictEqual(formatCount(value), expected);
			});
		}));

		t.assert.strictEqual(formatCount(1500), '2k');
		t.assert.strictEqual(formatCount(999), '999');

		t.assert.strictEqual(formatBytes(1_500_000_000_000_000), '2 PB');
		t.assert.strictEqual(formatBytes(1_500_000_000_000), '1.5 TB');
		t.assert.strictEqual(formatBytes(1_250_000_000_000), '1.25 TB');
		t.assert.strictEqual(formatBytes(1_000_000_000_000), '1 TB');
		t.assert.strictEqual(formatBytes(1_500_000_000), '2 GB');
		t.assert.strictEqual(formatBytes(1_500_000), '2 MB');
		t.assert.strictEqual(formatBytes(1500), '2 KB');
		t.assert.strictEqual(formatBytes(999), '999 B');
	});

	await t.test('queries Cloudflare and parses all traffic metrics', async (t: TestContext) => {
		const requestedUrls: string[] = [];
		const requestedInits: RequestInit[] = [];
		const mockFetch: typeof fetch = async (input, init) => {
			requestedUrls.push(input instanceof Request ? input.url : input.toString());
			requestedInits.push(init ?? {});
			return responseWithPayload({
				errors: [],
				data: {
					viewer: {
						accounts: [{
							traffic: [
								{count: 123, sum: {edgeResponseBytes: 500}},
								{
									count: NaN,
									sum: {edgeResponseBytes: NaN},
								},
								{count: null, sum: {edgeResponseBytes: null}},
								{count: ' '.repeat(3), sum: {edgeResponseBytes: ' '.repeat(3)}},
								{count: '1K', sum: {edgeResponseBytes: '1K'}},
								{count: '2M', sum: {edgeResponseBytes: '2M'}},
								{count: '3B', sum: {edgeResponseBytes: '3B'}},
								{count: '456', sum: {edgeResponseBytes: '456'}},
								{count: 'invalid', sum: {edgeResponseBytes: 'invalid'}},
							],
						}],
						zones: [{
							uniqueVisitors: [
								{uniq: {uniques: 12}},
								{uniq: {uniques: null}},
								{uniq: {uniques: '1K'}},
								{uniq: {uniques: '34'}},
								{uniq: {uniques: 'invalid'}},
							],
						}],
					},
				},
			});
		};

		const traffic = await lastOneMonthTraffic({
			fetch: mockFetch,
			getEnv: getEnvFrom(primaryEnvironment),
			now,
		});

		t.assert.deepStrictEqual(traffic, {
			requests: 3_002_001_579,
			uniqueVisitors: 1046,
			dataServed: 3_002_001_956,
		});
		t.assert.deepStrictEqual(requestedUrls, [CLOUDFLARE_GRAPHQL_API_URL]);
		t.assert.strictEqual(requestedInits.length, 1);
		const requestedInit = requestedInits[0];
		t.assert.strictEqual(requestedInit.method, 'POST');
		t.assert.strictEqual(new Headers(requestedInit.headers).get('Authorization'), 'Bearer api-token');
		t.assert.strictEqual(new Headers(requestedInit.headers).get('Content-Type'), 'application/json');
		t.assert.strictEqual(typeof requestedInit.body, 'string');
		const requestBody = JSON.parse(requestedInit.body as string) as {
			query: string;
			variables: Record<string, string>;
		};
		t.assert.ok(requestBody.query.includes('traffic: httpRequestsAdaptiveGroups'));
		t.assert.ok(requestBody.query.includes('count'));
		t.assert.ok(requestBody.query.includes('edgeResponseBytes'));
		t.assert.ok(requestBody.query.includes('uniqueVisitors: httpRequests1dGroups'));
		t.assert.ok(requestBody.query.includes('uniques'));
		t.assert.ok(requestBody.query.includes('clientRequestHTTPHost: $hostname'));
		t.assert.ok(requestBody.query.includes('$hostname: string'));
		t.assert.strictEqual(
			requestBody.query.match(/clientRequestHTTPHost/gv)?.length,
			1,
		);
		t.assert.strictEqual(requestBody.query.match(/zoneTag: \$zoneTag/gv)?.length, 2);
		t.assert.ok(requestBody.query.includes('datetime_geq: $start'));
		t.assert.ok(requestBody.query.includes('datetime_lt: $end'));
		t.assert.ok(requestBody.query.includes('date_geq: $startDate'));
		t.assert.ok(requestBody.query.includes('date_lt: $endDate'));
		t.assert.ok(requestBody.query.includes('requestSource: "eyeball"'));
		t.assert.deepStrictEqual(requestBody.variables, {
			accountTag: 'account-id',
			end: '2000-01-31T00:00:00Z',
			endDate: '2000-01-31',
			hostname: 'cdn.simpleicons.org',
			start: '2000-01-01T00:00:00Z',
			startDate: '2000-01-01',
			zoneTag: 'zone-id',
		});
	});

	await t.test('caches all metrics and merges concurrent requests', async (t: TestContext) => {
		currentTime = new Date(currentTime.getTime() + (2 * DAY_IN_MILLISECONDS));
		const firstResponse = Promise.withResolvers<Response>();
		const refreshedPayload = createTrafficPayload({
			requests: 456,
			uniqueVisitors: 78,
			dataServed: 9000,
		});
		let fetchCalls = 0;
		const mockFetch: typeof fetch = async () => {
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
		t.assert.strictEqual(fetchCalls, 1);
		firstResponse.resolve(
			Response.json(
				createTrafficPayload({
					requests: 123,
					uniqueVisitors: 45,
					dataServed: 6000,
				}),
			),
		);
		t.assert.deepStrictEqual(await Promise.all([firstTraffic, concurrentRequests]), [
			{requests: 123, uniqueVisitors: 45, dataServed: 6000},
			123,
		]);

		currentTime = new Date(
			currentTime.getTime() + DAY_IN_MILLISECONDS - 1,
		);
		t.assert.deepStrictEqual(await lastOneMonthTraffic(options), {
			requests: 123,
			uniqueVisitors: 45,
			dataServed: 6000,
		});
		t.assert.strictEqual(fetchCalls, 1);

		currentTime = new Date(currentTime.getTime() + 1);
		t.assert.deepStrictEqual(await lastOneMonthTraffic(options), {
			requests: 456,
			uniqueVisitors: 78,
			dataServed: 9000,
		});
		t.assert.strictEqual(fetchCalls, 2);
	});

	await t.test('does not cache missing environment errors', async (t: TestContext) => {
		currentTime = new Date(currentTime.getTime() + (2 * DAY_IN_MILLISECONDS));
		let fetchCalls = 0;
		await t.assert.rejects(
			async () =>
				lastOneMonthTraffic({
					async fetch() {
						fetchCalls++;
						return new Response();
					},
					getEnv: () => undefined,
					now,
				}),
			{
				name: 'Error',
				message: 'Missing required environment variable: CLOUDFLARE_SI_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID',
			},
		);
		t.assert.strictEqual(fetchCalls, 0);
	});

	await t.test('reports Cloudflare HTTP errors', async (t: TestContext) => {
		await t.assert.rejects(
			async () =>
				lastOneMonthTraffic({
					fetch: async () =>
						new Response('Forbidden', {status: 403}),
					getEnv: getEnvFrom(primaryEnvironment),
					now,
				}),
			{
				name: 'Error',
				message: 'Cloudflare GraphQL API request failed with 403: Forbidden',
			},
		);
	});

	await t.test('reports Cloudflare GraphQL errors', async (t: TestContext) => {
		await t.assert.rejects(
			async () =>
				lastOneMonthTraffic({
					fetch: async () =>
						Response.json({
							errors: [{message: 'Known error'}, {}],
						}),
					getEnv: getEnvFrom(primaryEnvironment),
					now,
				}),
			{
				name: 'Error',
				message: 'Cloudflare GraphQL API returned errors: Known error, Unknown error',
			},
		);
	});

	await t.test('reports missing account data', async (t: TestContext) => {
		await t.assert.rejects(
			async () =>
				lastOneMonthTraffic({
					fetch: async () => Response.json({}),
					getEnv: getEnvFrom(primaryEnvironment),
					now,
				}),
			{
				name: 'Error',
				message: 'Cloudflare GraphQL API did not return account traffic data.',
			},
		);
	});

	await t.test('reports missing zone data', async (t: TestContext) => {
		await t.assert.rejects(
			async () =>
				lastOneMonthTraffic({
					fetch: async () =>
						Response.json({
							data: {viewer: {accounts: [{}]}},
						}),
					getEnv: getEnvFrom(primaryEnvironment),
					now,
				}),
			{
				name: 'Error',
				message: 'Cloudflare GraphQL API did not return zone traffic data.',
			},
		);
	});

	await t.test('uses fallback environment names and handles no traffic', async (t: TestContext) => {
		const requestedInits: RequestInit[] = [];
		const traffic = await lastOneMonthTraffic({
			async fetch(_input, init) {
				requestedInits.push(init ?? {});
				return Response.json({
					errors: [],
					data: {
						viewer: {accounts: [{}], zones: [{}]},
					},
				});
			},
			getEnv: getEnvFrom(fallbackEnvironment),
			now,
		});

		t.assert.deepStrictEqual(traffic, {
			requests: 0,
			uniqueVisitors: 0,
			dataServed: 0,
		});
		t.assert.strictEqual(requestedInits.length, 1);
		const requestedInit = requestedInits[0];
		t.assert.strictEqual(
			new Headers(requestedInit.headers).get('Authorization'),
			'Bearer fallback-api-token',
		);
		t.assert.strictEqual(typeof requestedInit.body, 'string');
		const requestBody = JSON.parse(requestedInit.body as string) as {variables: Record<string, string>};
		t.assert.deepStrictEqual(
			requestBody.variables,
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

	await t.test('uses default dependencies without network access', async (t: TestContext) => {
		let fetchCalls = 0;
		t.mock.method(globalThis, 'fetch', async () => {
			fetchCalls++;
			return Response.json(
				createTrafficPayload({
					requests: 789,
					uniqueVisitors: 67,
					dataServed: 8900,
				}),
			);
		});

		t.mock.property(process, 'env', primaryEnvironment);

		t.assert.deepStrictEqual(await lastOneMonthTraffic(), {
			requests: 789,
			uniqueVisitors: 67,
			dataServed: 8900,
		});
		t.assert.strictEqual(await lastOneMonthRequests(), 789);
		t.assert.strictEqual(fetchCalls, 1);
	});
});
