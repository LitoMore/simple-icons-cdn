import { Route } from '@std/http/route';

export type EnhancedRoute = Omit<Route, 'method'> & {
	method?: string | string[];
};

export function route(
	routes: EnhancedRoute[],
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
				match &&
				(Array.isArray(route.method)
					? route.method.includes(request.method)
					: (route.method ?? 'GET') === request.method)
			) {
				return route.handler(request, info, match);
			}
		}
		return defaultHandler(request, info);
	};
}
