import type {VercelRequest, VercelResponse} from '@vercel/node';
import router from 'my-way';
import {getSimpleIcon, getIconSvg} from './icon';

const app = (request: VercelRequest, response: VercelResponse) => {
	response.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800');

	if (request.method !== 'GET') {
		return response.status(403).send({status: 403, message: 'forbidden'});
	}

	const requestUrl = request.url ?? '/';
	const matchRoute = router('/:slug/:color?', requestUrl);
	const {slug, color} = matchRoute ?? {};
	const icon = getSimpleIcon(slug);

	if (icon) {
		const iconSvg = getIconSvg(icon, color);
		response.setHeader('Content-Type', 'image/svg+xml');

		return response.send(iconSvg);
	}

	if (slug) {
		return response.status(404).send({status: 404, message: 'icon not found'});
	}

	if (requestUrl === '/') {
		return response.redirect('https://github.com/LitoMore/simple-icons-cdn');
	}

	return response.status(403).send({status: 403, message: 'forbidden'});
};

export default app;
