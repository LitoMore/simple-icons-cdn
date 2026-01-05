import { assertEquals } from '@std/assert';
import serve from '../source/app.ts';
import { maxIconSize, minIconSize } from '../source/constants.ts';
import {
	cacheForOneYearHeader,
	cacheForSevenDaysHeader,
} from '../source/handlers.ts';

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
	assertEquals(headResponse.headers, getResponse.headers);
	assertEquals(headResponse.body, null);

	const postResponse = await getIconResponse({ method: 'POST' });
	assertEquals(postResponse.status, 405);
	assertEquals(postResponse.body, null);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
	assertEquals(headResponse.headers, getResponse.headers);
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
