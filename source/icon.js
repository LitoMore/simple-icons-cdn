const simpleIcons = require('simple-icons');
const {normalizeColor} = require('./utils.js');

const getSimpleIcon = (slug) => {
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

const getIconSvg = (icon, color = '', darkModeColor = '') => {
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

module.exports = {
	getSimpleIcon,
	getIconSvg,
};
