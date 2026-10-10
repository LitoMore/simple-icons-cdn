import {
	dataServedBadgeHandler,
	defaultHandler,
	faviconHandler,
	homepageHandler,
	iconHandler,
	requestsBadgeHandler,
	uniqueVisitorsBadgeHandler,
	type Handler,
} from './handlers.ts';

const routes: Array<{method: string[]; pattern: URLPattern; handler: Handler}> = [
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({pathname: '/'}),
		handler: homepageHandler,
	},
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({pathname: '/favicon.ico'}),
		handler: faviconHandler,
	},
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({pathname: '/_badge/requests'}),
		handler: requestsBadgeHandler,
	},
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({pathname: '/_badge/unique-visitors'}),
		handler: uniqueVisitorsBadgeHandler,
	},
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({pathname: '/_badge/data-served'}),
		handler: dataServedBadgeHandler,
	},
	{
		method: ['GET', 'HEAD'],
		pattern: new URLPattern({pathname: '/:iconSlug/:color?/:darkModeColor?'}),
		handler: iconHandler,
	},
];

const app = {
	async fetch(request: Request) {
		for (const {method, pattern, handler} of routes) {
			if (!method.includes(request.method)) {
				continue;
			}

			const parameters = pattern.exec(request.url);
			if (parameters) {
				return handler(request, parameters);
			}
		}

		return defaultHandler(request);
	},
	onListen(hostname = '0.0.0.0', port = 8000) {
		const urlPrefix = `http://${hostname}:${port}`;
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
};

export default app;
