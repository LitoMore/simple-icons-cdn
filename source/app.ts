import type {VercelRequest, VercelResponse} from '@vercel/node';
import router from 'my-way';
import {getSimpleIcon, getIconSvg} from './icon';

const app = (request: VercelRequest, response: VercelResponse) => {
	response.setHeader(
		'Cache-Control',
		'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800',
	);

	if (request.method !== 'GET') {
		return response.status(404).send({status: 404});
	}

	const requestUrl = request.url ?? '/';
	const matchRoute = router('/:slug/:color?/:darkModeColor?', requestUrl);
	const {slug, color, darkModeColor} = matchRoute ?? {};
	const icon = getSimpleIcon(slug);

	if (icon) {
		const iconSvg = getIconSvg(icon, color, darkModeColor);
		response.setHeader('Content-Type', 'image/svg+xml');
		return response.send(iconSvg);
	}

	if (slug) {
		return response.status(404).send({status: 404});
	}

	if (requestUrl === '/') {
		return response.redirect(
			308,
			'https://github.com/LitoMore/simple-icons-cdn',
		);
	}

	return response.status(404).send({status: 404});
};

export default app;
