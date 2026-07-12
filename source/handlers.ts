import { Handler } from '@std/http/unstable-route';
import { getIconSvg, getSimpleIcon } from './icon.ts';
import { formatBytes, formatCount, lastOneMonthTraffic } from './traffic.ts';
import type { Traffic } from './traffic.ts';

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

const createTrafficBadgeHandler = (
	label: string,
	formatMessage: (traffic: Traffic) => string,
): Handler => {
	return async (request) => {
		try {
			const traffic = await lastOneMonthTraffic();
			return createBadgeResponse(
				request,
				JSON.stringify({
					schemaVersion: 1,
					label,
					message: formatMessage(traffic),
					color: 'blue',
				}),
				cacheForOneDayHeader,
			);
		} catch (error) {
			console.error(`Failed to load ${label}:`, error);
			return createBadgeResponse(
				request,
				JSON.stringify({
					schemaVersion: 1,
					label,
					message: 'unavailable',
					isError: true,
				}),
				'no-store',
			);
		}
	};
};

export const requestsBadgeHandler = createTrafficBadgeHandler(
	'requests',
	(traffic) => `${formatCount(traffic.requests)}/month`,
);

export const uniqueVisitorsBadgeHandler = createTrafficBadgeHandler(
	'unique visitors',
	(traffic) => `${formatCount(traffic.uniqueVisitors)}/month`,
);

export const dataServedBadgeHandler = createTrafficBadgeHandler(
	'data served',
	(traffic) => `${formatBytes(traffic.dataServed)}/month`,
);

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
