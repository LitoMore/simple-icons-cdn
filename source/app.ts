import { Route, route } from '@std/http/unstable-route';
import {
	dataServedBadgeHandler,
	defaultHandler,
	faviconHandler,
	homepageHandler,
	iconHandler,
	requestsBadgeHandler,
	uniqueVisitorsBadgeHandler,
} from './handlers.ts';

const routes: Route[] = [
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({ pathname: '/' }),
		handler: homepageHandler,
	},
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({ pathname: '/favicon.ico' }),
		handler: faviconHandler,
	},
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({ pathname: '/_badge/requests' }),
		handler: requestsBadgeHandler,
	},
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({ pathname: '/_badge/unique-visitors' }),
		handler: uniqueVisitorsBadgeHandler,
	},
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({ pathname: '/_badge/data-served' }),
		handler: dataServedBadgeHandler,
	},
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({ pathname: '/:iconSlug/:color?/:darkModeColor?' }),
		handler: iconHandler,
	},
];

const handler = route(routes, defaultHandler);

export default {
	fetch(req) {
		return handler(req);
	},
	onListen() {
		const urlPrefix = 'http://0.0.0.0:8000';
		const badgeEndpoint = `${urlPrefix}/_badge`;
		console.log(
			[
				'Test URLs:',
				`- ${urlPrefix}/simpleicons`,
				`- ${badgeEndpoint}/requests`,
				`- ${badgeEndpoint}/unique-visitors`,
				`- ${badgeEndpoint}/data-served`,
			].join('\n'),
		);
	},
} satisfies Deno.ServeDefaultExport;
