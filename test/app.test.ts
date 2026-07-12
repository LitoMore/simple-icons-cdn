import { assertEquals } from '@std/assert';
import serve from '../source/app.ts';
import { maxIconSize, minIconSize } from '../source/constants.ts';
import {
	cacheForOneDayHeader,
	cacheForOneYearHeader,
	cacheForSevenDaysHeader,
} from '../source/handlers.ts';
import { lastOneMonthTraffic } from '../source/traffic.ts';

const getIconResponse = (
	{ slug, color, darkModeColor, viewbox, size, method = 'GET', trailingSlash }:
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
		) + (trailingSlash ? '/' : ''),
	);
	if (viewbox) url.searchParams.set('viewbox', viewbox);
	if (size) url.searchParams.set('size', size);
	return serve.fetch(
		new Request(url, { method: method }),
	);
};

Deno.test('root URL', async () => {
	const getResponse = await getIconResponse({});
	assertEquals(getResponse.status, 307);
	assertEquals(getResponse.headers.get('Cache-Control'), cacheForOneYearHeader);
	assertEquals(
		getResponse.headers.get('Location'),
		'https://github.com/LitoMore/simple-icons-cdn',
	);
	assertEquals(getResponse.body, null);

	const headResponse = await getIconResponse({ method: 'HEAD' });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);

	const postResponse = await getIconResponse({ method: 'POST' });
	assertEquals(postResponse.status, 405);
	assertEquals(postResponse.body, null);
});

Deno.test('listen message', () => {
	const originalConsoleLog = console.log;
	const loggedMessages: unknown[][] = [];
	console.log = (...args) => loggedMessages.push(args);

	try {
		serve.onListen();
	} finally {
		console.log = originalConsoleLog;
	}

	assertEquals(loggedMessages, [[
		[
			'Test URLs:',
			'- http://0.0.0.0:8000/simpleicons',
			'- http://0.0.0.0:8000/_badge/requests',
			'- http://0.0.0.0:8000/_badge/unique-visitors',
			'- http://0.0.0.0:8000/_badge/data-served',
		].join('\n'),
	]]);
});

Deno.test('traffic badges handle request failures', async () => {
	const originalFetch = globalThis.fetch;
	const originalGetEnv = Deno.env.get;
	const originalConsoleError = console.error;
	const environment: Record<string, string> = {
		CLOUDFLARE_SI_ACCOUNT_ID: 'account-id',
		CLOUDFLARE_SI_API_TOKEN: 'api-token',
		CLOUDFLARE_SI_ZONE_ID: 'zone-id',
	};
	let fetchCalls = 0;
	const loggedErrors: unknown[][] = [];
	globalThis.fetch = () => {
		fetchCalls++;
		return Promise.reject(new Error('Cloudflare unavailable'));
	};
	Deno.env.get = (name) => environment[name];
	console.error = (...args) => loggedErrors.push(args);

	try {
		for (
			const { path, label } of [
				{ path: 'requests', label: 'requests' },
				{ path: 'unique-visitors', label: 'unique visitors' },
				{ path: 'data-served', label: 'data served' },
			]
		) {
			const url = `http://localhost:8000/_badge/${path}`;
			const getResponse = await serve.fetch(new Request(url));
			assertEquals(getResponse.status, 200);
			assertEquals(getResponse.headers.get('Content-Type'), 'application/json');
			assertEquals(getResponse.headers.get('Cache-Control'), 'no-store');
			assertEquals(await getResponse.json(), {
				schemaVersion: 1,
				label,
				message: 'unavailable',
				isError: true,
			});

			const headResponse = await serve.fetch(
				new Request(url, { method: 'HEAD' }),
			);
			assertEquals(headResponse.status, getResponse.status);
			assertEquals([...headResponse.headers.entries()], [
				...getResponse.headers.entries(),
			]);
			assertEquals(headResponse.body, null);
		}
	} finally {
		globalThis.fetch = originalFetch;
		Deno.env.get = originalGetEnv;
		console.error = originalConsoleError;
	}

	assertEquals(fetchCalls, 6);
	assertEquals(loggedErrors.length, 6);
});

Deno.test('traffic badges', async () => {
	const environment: Record<string, string> = {
		CLOUDFLARE_SI_ACCOUNT_ID: 'account-id',
		CLOUDFLARE_SI_API_TOKEN: 'api-token',
		CLOUDFLARE_SI_ZONE_ID: 'zone-id',
	};
	await lastOneMonthTraffic({
		fetch: () =>
			Promise.resolve(
				Response.json({
					data: {
						viewer: {
							accounts: [{
								traffic: [{
									count: 700_000_000,
									sum: { edgeResponseBytes: 9_000_000_000 },
								}],
							}],
							zones: [{
								uniqueVisitors: [{
									uniq: { uniques: 45_000_000 },
								}],
							}],
						},
					},
				}),
			),
		getEnv: (name) => environment[name],
	});

	for (
		const { path, label, message } of [
			{ path: 'requests', label: 'requests', message: '700M/month' },
			{
				path: 'unique-visitors',
				label: 'unique visitors',
				message: '45M/month',
			},
			{
				path: 'data-served',
				label: 'data served',
				message: '9GB/month',
			},
		]
	) {
		const url = `http://localhost:8000/_badge/${path}`;
		const getResponse = await serve.fetch(new Request(url));

		assertEquals(getResponse.status, 200);
		assertEquals(getResponse.headers.get('Content-Type'), 'application/json');
		assertEquals(
			getResponse.headers.get('Cache-Control'),
			cacheForOneDayHeader,
		);
		assertEquals(await getResponse.json(), {
			schemaVersion: 1,
			label,
			message,
			color: 'blue',
		});

		const headResponse = await serve.fetch(
			new Request(url, { method: 'HEAD' }),
		);
		assertEquals(headResponse.status, getResponse.status);
		assertEquals([...headResponse.headers.entries()], [
			...getResponse.headers.entries(),
		]);
		assertEquals(headResponse.body, null);
	}
});

Deno.test('basic URL', async () => {
	const options = { slug: 'simpleicons' };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(getResponse.headers.get('Content-Type'), 'image/svg+xml');
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await getResponse.text();
	assertEquals(body.includes('fill="#111111"'), true);
	assertEquals(body.includes('viewBox="0 0 24 24"'), true);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('colored icon URL - CSS keywords', async () => {
	const options = { slug: 'simpleicons', color: 'blue' };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	assertEquals((await getResponse.text()).includes('0000ff'), true);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('colored icon URL - hex code', async () => {
	const options = { slug: 'simpleicons', color: '00cCfF' };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	assertEquals((await getResponse.text()).includes('00cCfF'), true);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('colored icon URL - invalid color', async () => {
	const options = { slug: 'simpleicons', color: 'unicorn' };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await getResponse.text();
	assertEquals(body.includes('unicorn'), false);
	assertEquals(body.includes('fill="#111111"'), true);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('colored dark mode icon URL - CSS Keywords', async () => {
	const options = {
		slug: 'simpleicons',
		color: 'blue',
		darkModeColor: 'red',
	};
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await getResponse.text();
	assertEquals(
		body.includes(
			'<style>path{fill:#0000ff} @media (prefers-color-scheme:dark){path{fill:#ff0000}}</style>',
		),
		true,
	);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('colored dark mode icon URL - hex code', async () => {
	const options = {
		slug: 'simpleicons',
		color: '0cf',
		darkModeColor: 'fff',
	};
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await getResponse.text();
	assertEquals(
		body.includes(
			'<style>path{fill:#0cf} @media (prefers-color-scheme:dark){path{fill:#fff}}</style>',
		),
		true,
	);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('colored dark mode icon URL - invalid color', async () => {
	const options = {
		slug: 'simpleicons',
		color: '0cf',
		darkModeColor: 'unicorn',
	};
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await getResponse.text();
	assertEquals(body.includes('unicorn'), false);
	assertEquals(
		body.includes(
			'<style>path{fill:#0cf} @media (prefers-color-scheme:dark){path{fill:#111111}}</style>',
		),
		true,
	);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('colored dark mode icon URL - both invalid colors', async () => {
	const options = {
		slug: 'simpleicons',
		color: 'unicorn',
		darkModeColor: 'unicorn',
	};
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await getResponse.text();
	assertEquals(body.includes('unicorn'), false);
	assertEquals(body.includes('<style>'), false);
	assertEquals(body.includes('fill="#111111"'), true);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('colored dark mode icon URL - same result hex code', async () => {
	const options = {
		slug: 'simpleicons',
		color: 'blue',
		darkModeColor: '0000ff',
	};
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await getResponse.text();
	assertEquals(body.includes('<style>'), false);
	assertEquals(body.includes('fill="#0000ff"'), true);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('auto viewbox URL', async () => {
	const options = { slug: 'simpleicons', viewbox: 'auto' };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(getResponse.headers.get('Content-Type'), 'image/svg+xml');
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await getResponse.text();
	assertEquals(body.includes('viewBox="0 0 15 24"'), true);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('sized URL', async () => {
	const options = { slug: 'simpleicons', size: '32' };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(getResponse.headers.get('Content-Type'), 'image/svg+xml');
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await getResponse.text();
	assertEquals(body.includes('viewBox="0 0 24 24"'), true);
	assertEquals(body.includes('width="32" height="32"'), true);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('size smaller than min-size', async () => {
	const options = { slug: 'simpleicons', size: `${minIconSize - 1}` };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(getResponse.headers.get('Content-Type'), 'image/svg+xml');
	const body = await getResponse.text();
	assertEquals(body.includes('viewBox="0 0 24 24"'), true);
	assertEquals(
		body.includes(`width="${minIconSize}" height="${minIconSize}"`),
		true,
	);
});

Deno.test('size larger than max-size', async () => {
	const options = { slug: 'simpleicons', size: `${maxIconSize + 1}` };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(getResponse.headers.get('Content-Type'), 'image/svg+xml');
	const body = await getResponse.text();
	assertEquals(body.includes('viewBox="0 0 24 24"'), true);
	assertEquals(
		body.includes(`width="${maxIconSize}" height="${maxIconSize}"`),
		true,
	);
});

Deno.test('both auto viewbox & sized URL', async () => {
	const options = { slug: 'simpleicons', viewbox: 'auto', size: '32' };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 200);
	assertEquals(getResponse.headers.get('Content-Type'), 'image/svg+xml');
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
	const body = await getResponse.text();
	assertEquals(body.includes('viewBox="0 0 15 24"'), true);
	assertEquals(body.includes('width="20" height="32"'), true);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('favicon URL', async () => {
	const options = { slug: 'favicon.ico' };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 204);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForOneYearHeader,
	);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('404 URL - icon not found', async () => {
	const options = { slug: 'simpleicon' };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 404);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('404 URL - trailing slash', async () => {
	const options = { slug: 'simpleicons', trailingSlash: true };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 404);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);

	const headResponse = await getIconResponse({ method: 'HEAD', ...options });
	assertEquals(headResponse.status, getResponse.status);
	assertEquals([...headResponse.headers.entries()], [
		...getResponse.headers.entries(),
	]);
	assertEquals(headResponse.body, null);
});

Deno.test('405 URL', async () => {
	const options = { method: 'POST', slug: 'simpleicon' };
	const getResponse = await getIconResponse(options);
	assertEquals(getResponse.status, 405);
	assertEquals(
		getResponse.headers.get('Cache-Control'),
		cacheForSevenDaysHeader,
	);
});
