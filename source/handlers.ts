import { Handler } from '@std/http/unstable-route';
import { getIconSvg, getSimpleIcon } from './icon.ts';

const cacheForOneYearHeader =
	'public, max-age=31536000, s-maxage=31536000, immutable';
const cacheForSevenDaysHeader =
	'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800';

export const defaultHandler: Handler = (request) => {
	return new Response(null, {
		headers: { 'Cache-Control': cacheForSevenDaysHeader },
		status: ['GET', 'HEAD'].includes(request.method) ? 404 : 405,
	});
};

export const homepageHandler: Handler = () => {
	return new Response(
		null,
		{
			headers: {
				'Cache-Control': cacheForOneYearHeader,
				'Location': 'https://github.com/LitoMore/simple-icons-cdn',
			},
			status: 307,
		},
	);
};

export const faviconHandler: Handler = () => {
	return new Response(null, {
		headers: {
			'Cache-Control': cacheForOneYearHeader,
		},
		status: 204,
	});
};

export const iconHandler: Handler = (request, _info, params) => {
	const url = new URL(request.url);
	const viewbox = url.searchParams.get('viewbox') || undefined;
	const size = url.searchParams.get('size') || undefined;
	const iconSlug = params?.pathname.groups.iconSlug;
	const color = params?.pathname.groups.color;
	const darkModeColor = params?.pathname.groups.darkModeColor;
	const icon = getSimpleIcon(iconSlug);
	if (icon) {
		const isHeadRequestMethod = request.method === 'HEAD';
		const iconSvg = getIconSvg(icon, { color, darkModeColor, viewbox, size });
		return new Response(isHeadRequestMethod ? null : iconSvg, {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': cacheForSevenDaysHeader,
				'Content-Type': 'image/svg+xml',
			},
		});
	}

	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Cache-Control': cacheForSevenDaysHeader,
		},
		status: 404,
	});
};
