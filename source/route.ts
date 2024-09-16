import { Route } from '@std/http/route';

export function route(
	routes: Route[],
	defaultHandler: (
		request: Request,
		info?: Deno.ServeHandlerInfo,
	) => Response | Promise<Response>,
): (
	request: Request,
	info?: Deno.ServeHandlerInfo,
) => Response | Promise<Response> {
	return (request: Request, info?: Deno.ServeHandlerInfo) => {
		for (const route of routes) {
			const match = route.pattern.exec(request.url);
			if (
				// This always allows HEAD requests to be handled
				match && ['HEAD', route.method ?? 'GET'].includes(request.method)
			) {
				return route.handler(request, info, match);
			}
		}
		return defaultHandler(request, info);
	};
}
