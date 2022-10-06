import express from 'express';
import {getSimpleIcon, getIconSvg} from './icon.js';

const app = express();

app.get('/:slug/:color?', (request, response) => {
	const {slug, color} = request.params;
	const icon = getSimpleIcon(slug);

	if (icon) {
		response.set({
			'Content-Type': 'image/svg+xml',
			'Cache-Control':
				'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800',
		});

		const iconSvg = getIconSvg(icon, color);
		response.send(iconSvg);
	} else {
		response.status(404);
	}
});

app.use('*', (_, response) => {
	response.status(403);
});

app.listen(3000);
