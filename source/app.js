import {getSimpleIcon, getIconSvg} from './icon.js';

const app = (request, response) => {
	response.setHeader(
		'Cache-Control',
		'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800',
	);

	if (request.method !== 'GET') {
		return response.status(404).send({status: 404});
	}

	const {iconSlug, color, darkModeColor, viewbox} = request.query;
	const icon = getSimpleIcon(iconSlug);

	if (icon) {
		const iconSvg = getIconSvg(icon, color, darkModeColor, viewbox);
		response.setHeader('Content-Type', 'image/svg+xml');
		return response.send(iconSvg);
	}

	return response.status(404).send({status: 404});
};

export default app;
