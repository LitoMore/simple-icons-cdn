import type {VercelRequest, VercelResponse} from '@vercel/node';
import router from 'my-way';
import {getSimpleIcon, getIconSvg} from './icon';

const app = (request: VercelRequest, response: VercelResponse) => {
	if (request.method !== 'GET') {
		return response.status(403).send('');
	}

	const matchRoute = router('/:slug/:color?', request.url ?? '/');
	const {slug, color} = matchRoute ?? {};
	const icon = getSimpleIcon(slug);

	if (icon) {
		const iconSvg = getIconSvg(icon, color);
		response.setHeader('Content-Type', 'image/svg+xml');
		response.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800');
		return response.send(iconSvg);
	}

	return response.status(404).send('');
};

export default app;
