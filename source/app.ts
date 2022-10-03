import type {IncomingMessage, ServerResponse} from 'node:http';
import {send} from 'micro';
import type {SimpleIcon} from 'simple-icons';
import * as si from 'simple-icons/icons'; // eslint-disable-line n/file-extension-in-import

const simpleIcons: Record<string, SimpleIcon> = si;

const generateIcon = (
	simpleIcon: SimpleIcon,
	options?: {
		fill?: string;
	},
) =>
	simpleIcon.svg.replace(
		/^<svg /,
		`<svg fill="${options?.fill ?? '#' + simpleIcon.hex}" `,
	);

const serveIcon = async (
	request: IncomingMessage,
	response: ServerResponse,
	parameters: {
		slug: string;
		color: string;
	},
) => {
	if (request.method !== 'GET') return send(response, 403);

	const {slug, color} = parameters ?? {};
	const icon = simpleIcons[slug];

	if (icon) {
		response.setHeader('Content-Type', 'image/svg+xml');
		response.setHeader(
			'Cache-Control',
			'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800',
		);
		return send(response, 200, generateIcon(icon, {fill: color}));
	}

	return send(response, 404);
};

export default serveIcon;
