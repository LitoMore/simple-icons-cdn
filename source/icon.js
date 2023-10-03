import * as simpleIcons from 'simple-icons/index.mjs';
import {normalizeColor} from './utils.js';

export const getSimpleIcon = (slug) => {
	if (!slug) {
		return null;
	}

	const normaizedSlug = slug
		.toLowerCase()
		.replaceAll(' ', 'plus')
		.replaceAll('+', 'plus')
		.replaceAll('.', 'dot');

	const iconKey =
		'si' + normaizedSlug.charAt(0).toUpperCase() + normaizedSlug.slice(1);

	if (iconKey in simpleIcons) {
		return simpleIcons[iconKey];
	}

	return null;
};

export const getIconSvg = (icon, color = '', darkModeColor = '') => {
	const hex = normalizeColor(color) || `#${icon.hex}`;
	const darkModeHex = normalizeColor(darkModeColor);

	if (darkModeColor && hex !== darkModeHex) {
		return icon.svg.replace(
			'<path ',
			`<style>path{fill:${hex}} @media (prefers-color-scheme:dark){path{fill:${darkModeHex}}}</style><path `,
		);
	}

	return icon.svg.replace('<svg ', `<svg fill="${hex}" `);
};
