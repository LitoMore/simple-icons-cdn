import { Handler } from '@std/http/unstable-route';
import { getIconSvg, getSimpleIcon } from './icon.ts';
import { formatCount, lastOneMonthRequests } from './traffic.ts';

export const cacheForOneYearHeader =
	'public, max-age=31536000, s-maxage=31536000, immutable';
export const cacheForSevenDaysHeader =
	'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800';
export const cacheForOneDayHeader = 'public, max-age=86400, s-maxage=86400';

export const defaultHandler = (request: Request) => {
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

const createBadgeResponse = (
	request: Request,
	body: string,
	cacheControl: string,
) => {
	return new Response(request.method === 'HEAD' ? null : body, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Cache-Control': cacheControl,
			'Content-Type': 'application/json',
		},
	});
};

export const requestsBadgeHandler: Handler = async (request) => {
	try {
		const count = await lastOneMonthRequests();
		return createBadgeResponse(
			request,
			JSON.stringify({
				schemaVersion: 1,
				label: 'requests',
				message: `${formatCount(count)}/month`,
				color: 'blue',
			}),
			cacheForOneDayHeader,
		);
	} catch (error) {
		console.error('Failed to load traffic count:', error);
		return createBadgeResponse(
			request,
			JSON.stringify({
				schemaVersion: 1,
				label: 'requests',
				message: 'unavailable',
				isError: true,
			}),
			'no-store',
		);
	}
};

export const iconHandler: Handler = (request, params) => {
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
