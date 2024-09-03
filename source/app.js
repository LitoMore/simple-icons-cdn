import { getIconSvg, getSimpleIcon } from './icon.js';
import { Application } from 'jsr:@oak/oak/application';
import { Router } from 'jsr:@oak/oak/router';

const allowCrossOrigin = (ctx) => {
	ctx.response.headers.set('Access-Control-Allow-Origin', '*');
};

const cacheForOneYear = (ctx) => {
	ctx.response.headers.set(
		'Cache-Control',
		'public, max-age=31536000, s-maxage=31536000, immutable',
	);
};

const cacheForSevenDays = (ctx) => {
	ctx.response.headers.set(
		'Cache-Control',
		'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800',
	);
};

const router = new Router();
router.get('/', (ctx) => {
	cacheForSevenDays(ctx);
	ctx.response.status = 307;
	ctx.response.redirect('https://github.com/LitoMore/simple-icons-cdn');
});
router.get('/favicon.ico', (ctx) => {
	cacheForOneYear(ctx);
	ctx.response.status = 204;
});
router.get('/:iconSlug/:color?/:darkModeColor?', (ctx) => {
	allowCrossOrigin(ctx);
	cacheForSevenDays(ctx);
	const { iconSlug, color, darkModeColor } = ctx.params;
	const viewbox = ctx.request.url.searchParams.get('viewbox');
	const size = ctx.request.url.searchParams.get('size');
	const icon = getSimpleIcon(iconSlug);
	if (icon) {
		const iconSvg = getIconSvg(icon, color, darkModeColor, viewbox, size);
		ctx.response.headers.set('Content-Type', 'image/svg+xml');
		ctx.response.body = iconSvg;
		return;
	}

	ctx.response.status = 404;
	return;
});

const app = new Application();
app.use(async (ctx, next) => {
	try {
		await next();
	} catch (error) {
		if (error instanceof URIError) {
			cacheForSevenDays(ctx);
			ctx.response.status = 404;
			return;
		}
		console.log(error);
		throw error;
	}
});
app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: 8080 });

console.log('Server running at http://localhost:8080/simpleicons');
