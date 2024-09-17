import { EnhancedRoute, route } from './route.ts';
import {
	defaultHandler,
	faviconHandler,
	homepageHandler,
	iconHandler,
} from './handlers.ts';

const routes: EnhancedRoute[] = [
	{
		pattern: new URLPattern({ pathname: '/' }),
		handler: homepageHandler,
	},
	{
		pattern: new URLPattern({ pathname: '/favicon.ico' }),
		handler: faviconHandler,
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
} satisfies Deno.ServeDefaultExport;
