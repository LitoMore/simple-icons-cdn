import {test, type TestContext} from 'node:test';
import process from 'node:process';
import serve from '../source/app.ts';
import {maxIconSize, minIconSize} from '../source/constants.ts';
import {
	cacheForOneDayHeader,
	cacheForOneYearHeader,
	cacheForSevenDaysHeader,
} from '../source/handlers.ts';
import {lastOneMonthTraffic} from '../source/traffic.ts';

const getIconResponse = async (
	{slug, color, darkModeColor, viewbox, size, method = 'GET', trailingSlash}:
	{
		slug?: string;
		color?: string;
		darkModeColor?: string;
		viewbox?: string;
		size?: string;
		method?: string;
		trailingSlash?: boolean;
	},
) => {
	const url = new URL(
		['http://localhost:8000', slug, color, darkModeColor].filter(
			Boolean,
		).join(
			'/',
		) + (trailingSlash === true ? '/' : ''),
	);
	if (viewbox !== undefined && viewbox.length > 0) {
		url.searchParams.set('viewbox', viewbox);
	}

	if (size !== undefined && size.length > 0) {
		url.searchParams.set('size', size);
	}

	return serve.fetch(
		new Request(url, {method}),
	);
};

await test('root URL', async (t: TestContext) => {
	const response = await getIconResponse({});
	t.assert.strictEqual(response.status, 307);
	t.assert.strictEqual(response.headers.get('Cache-Control'), cacheForOneYearHeader);
	t.assert.strictEqual(
		response.headers.get('Location'),
		'https://github.com/LitoMore/simple-icons-cdn',
	);
	t.assert.strictEqual(response.body, null);

	const headResponse = await getIconResponse({method: 'HEAD'});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);

	const postResponse = await getIconResponse({method: 'POST'});
	t.assert.strictEqual(postResponse.status, 405);
	t.assert.strictEqual(postResponse.body, null);
});

await test('listen message', (t: TestContext) => {
	const loggedMessages: unknown[][] = [];
	t.mock.method(console, 'log', (...args: unknown[]) => {
		loggedMessages.push(args);
	});

	serve.onListen();

	t.assert.deepStrictEqual(loggedMessages, [[
		[
			'Test URLs:',
			'- http://0.0.0.0:8000/simpleicons',
			'- http://0.0.0.0:8000/_badge/requests',
			'- http://0.0.0.0:8000/_badge/unique-visitors',
			'- http://0.0.0.0:8000/_badge/data-served',
		].join('\n'),
	]]);
});

await test('traffic badges handle request failures', async (t: TestContext) => {
	const environment: Record<string, string> = Object.fromEntries([
		['CLOUDFLARE_SI_ACCOUNT_ID', 'account-id'],
		['CLOUDFLARE_SI_API_TOKEN', 'api-token'],
		['CLOUDFLARE_SI_ZONE_ID', 'zone-id'],
	]);
	let fetchCalls = 0;
	const loggedErrors: unknown[][] = [];
	t.mock.method(globalThis, 'fetch', async () => {
		fetchCalls++;
		throw new Error('Cloudflare unavailable');
	});

	t.mock.property(process, 'env', environment);
	t.mock.method(console, 'error', (...args: unknown[]) => {
		loggedErrors.push(args);
	});

	await Promise.all(([
		{path: 'requests', label: 'requests'},
		{path: 'unique-visitors', label: 'unique visitors'},
		{path: 'data-served', label: 'data served'},
	]).map(async ({path, label}) => {
		await t.test(`/_badge/${path}`, async (t: TestContext) => {
			const url = `http://localhost:8000/_badge/${path}`;
			const response = await serve.fetch(new Request(url));
			t.assert.strictEqual(response.status, 200);
			t.assert.strictEqual(response.headers.get('Content-Type'), 'application/json');
			t.assert.strictEqual(response.headers.get('Cache-Control'), 'no-store');
			t.assert.deepStrictEqual(await response.json(), {
				schemaVersion: 1,
				label,
				message: 'unavailable',
				isError: true,
			});

			const headResponse = await serve.fetch(
				new Request(url, {method: 'HEAD'}),
			);
			t.assert.strictEqual(headResponse.status, response.status);
			t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
			t.assert.strictEqual(headResponse.body, null);
		});
	}));

	t.assert.strictEqual(fetchCalls, 6);
	t.assert.strictEqual(loggedErrors.length, 6);
});

await test('traffic badges', async (t: TestContext) => {
	const environment: Record<string, string> = Object.fromEntries([
		['CLOUDFLARE_SI_ACCOUNT_ID', 'account-id'],
		['CLOUDFLARE_SI_API_TOKEN', 'api-token'],
		['CLOUDFLARE_SI_ZONE_ID', 'zone-id'],
	]);
	await lastOneMonthTraffic({
		fetch: async () =>
			Response.json({
				data: {
					viewer: {
						accounts: [{
							traffic: [{
								count: 700_000_000,
								sum: {edgeResponseBytes: 9_000_000_000},
							}],
						}],
						zones: [{
							uniqueVisitors: [{
								uniq: {uniques: 45_000_000},
							}],
						}],
					},
				},
			}),
		getEnv: name => environment[name],
	});

	await Promise.all(([
		{path: 'requests', label: 'requests', message: '700 million/month'},
		{
			path: 'unique-visitors',
			label: 'unique visitors',
			message: '45 million/month',
		},
		{
			path: 'data-served',
			label: 'data served',
			message: '9 GB/month',
		},
	]).map(async ({path, label, message}) => {
		await t.test(`/_badge/${path}`, async (t: TestContext) => {
			const url = `http://localhost:8000/_badge/${path}`;
			const response = await serve.fetch(new Request(url));

			t.assert.strictEqual(response.status, 200);
			t.assert.strictEqual(response.headers.get('Content-Type'), 'application/json');
			t.assert.strictEqual(
				response.headers.get('Cache-Control'),
				cacheForOneDayHeader,
			);
			t.assert.deepStrictEqual(await response.json(), {
				schemaVersion: 1,
				label,
				message,
				color: 'blue',
			});

			const headResponse = await serve.fetch(
				new Request(url, {method: 'HEAD'}),
			);
			t.assert.strictEqual(headResponse.status, response.status);
			t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
			t.assert.strictEqual(headResponse.body, null);
		});
	}));
});

await test('basic URL', async (t: TestContext) => {
	const options = {slug: 'simpleicons'};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(response.headers.get('Content-Type'), 'image/svg+xml');
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(body.includes('fill="#111111"'), true);
	t.assert.strictEqual(body.includes('viewBox="0 0 24 24"'), true);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('colored icon URL - CSS keywords', async (t: TestContext) => {
	const options = {slug: 'simpleicons', color: 'blue'};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(body.includes('0000ff'), true);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('colored icon URL - hex code', async (t: TestContext) => {
	const options = {slug: 'simpleicons', color: '00cCfF'};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(body.includes('00cCfF'), true);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('colored icon URL - invalid color', async (t: TestContext) => {
	const options = {slug: 'simpleicons', color: 'unicorn'};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(body.includes('unicorn'), false);
	t.assert.strictEqual(body.includes('fill="#111111"'), true);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('colored dark mode icon URL - CSS Keywords', async (t: TestContext) => {
	const options = {
		slug: 'simpleicons',
		color: 'blue',
		darkModeColor: 'red',
	};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(
		body.includes(
			'<style>path{fill:#0000ff} @media (prefers-color-scheme:dark){path{fill:#ff0000}}</style>',
		),
		true,
	);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('colored dark mode icon URL - hex code', async (t: TestContext) => {
	const options = {
		slug: 'simpleicons',
		color: '0cf',
		darkModeColor: 'fff',
	};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(
		body.includes(
			'<style>path{fill:#0cf} @media (prefers-color-scheme:dark){path{fill:#fff}}</style>',
		),
		true,
	);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('colored dark mode icon URL - invalid color', async (t: TestContext) => {
	const options = {
		slug: 'simpleicons',
		color: '0cf',
		darkModeColor: 'unicorn',
	};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(body.includes('unicorn'), false);
	t.assert.strictEqual(
		body.includes(
			'<style>path{fill:#0cf} @media (prefers-color-scheme:dark){path{fill:#111111}}</style>',
		),
		true,
	);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('colored dark mode icon URL - both invalid colors', async (t: TestContext) => {
	const options = {
		slug: 'simpleicons',
		color: 'unicorn',
		darkModeColor: 'unicorn',
	};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(body.includes('unicorn'), false);
	t.assert.strictEqual(body.includes('<style>'), false);
	t.assert.strictEqual(body.includes('fill="#111111"'), true);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('colored dark mode icon URL - same result hex code', async (t: TestContext) => {
	const options = {
		slug: 'simpleicons',
		color: 'blue',
		darkModeColor: '0000ff',
	};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(body.includes('<style>'), false);
	t.assert.strictEqual(body.includes('fill="#0000ff"'), true);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('auto viewbox URL', async (t: TestContext) => {
	const options = {slug: 'simpleicons', viewbox: 'auto'};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(response.headers.get('Content-Type'), 'image/svg+xml');
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(body.includes('viewBox="0 0 15 24"'), true);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('sized URL', async (t: TestContext) => {
	const options = {slug: 'simpleicons', size: '32'};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(response.headers.get('Content-Type'), 'image/svg+xml');
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(body.includes('viewBox="0 0 24 24"'), true);
	t.assert.strictEqual(body.includes('width="32" height="32"'), true);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('partially numeric size is ignored', async (t: TestContext) => {
	const response = await getIconResponse({slug: 'simpleicons', size: '32px'});
	t.assert.strictEqual(response.status, 200);
	const body = await response.text();
	t.assert.strictEqual(body.includes('viewBox="0 0 24 24"'), true);
	t.assert.strictEqual(body.includes('width='), false);
	t.assert.strictEqual(body.includes('height='), false);
});

await test('size smaller than min-size', async (t: TestContext) => {
	const options = {slug: 'simpleicons', size: `${minIconSize - 1}`};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(response.headers.get('Content-Type'), 'image/svg+xml');
	const body = await response.text();
	t.assert.strictEqual(body.includes('viewBox="0 0 24 24"'), true);
	t.assert.strictEqual(
		body.includes(`width="${minIconSize}" height="${minIconSize}"`),
		true,
	);
});

await test('size larger than max-size', async (t: TestContext) => {
	const options = {slug: 'simpleicons', size: `${maxIconSize + 1}`};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(response.headers.get('Content-Type'), 'image/svg+xml');
	const body = await response.text();
	t.assert.strictEqual(body.includes('viewBox="0 0 24 24"'), true);
	t.assert.strictEqual(
		body.includes(`width="${maxIconSize}" height="${maxIconSize}"`),
		true,
	);
});

await test('both auto viewbox & sized URL', async (t: TestContext) => {
	const options = {slug: 'simpleicons', viewbox: 'auto', size: '32'};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 200);
	t.assert.strictEqual(response.headers.get('Content-Type'), 'image/svg+xml');
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await response.text();
	t.assert.strictEqual(body.includes('viewBox="0 0 15 24"'), true);
	t.assert.strictEqual(body.includes('width="20" height="32"'), true);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('favicon URL', async (t: TestContext) => {
	const options = {slug: 'favicon.ico'};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 204);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForOneYearHeader,
	);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('404 URL - icon not found', async (t: TestContext) => {
	const options = {slug: 'simpleicon'};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 404);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('404 URL - trailing slash', async (t: TestContext) => {
	const options = {slug: 'simpleicons', trailingSlash: true};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 404);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);

	const headResponse = await getIconResponse({method: 'HEAD', ...options});
	t.assert.strictEqual(headResponse.status, response.status);
	t.assert.deepStrictEqual(Iterator.from(headResponse.headers.entries()).toArray(), Iterator.from(response.headers.entries()).toArray());
	t.assert.strictEqual(headResponse.body, null);
});

await test('405 URL', async (t: TestContext) => {
	const options = {method: 'POST', slug: 'simpleicon'};
	const response = await getIconResponse(options);
	t.assert.strictEqual(response.status, 405);
	t.assert.strictEqual(
		response.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
});
