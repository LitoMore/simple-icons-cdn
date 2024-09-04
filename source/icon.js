import * as simpleIcons from 'npm:simple-icons';
import { svgPathBbox } from 'svg-path-bbox';
import svgpath from 'svgpath';
import { normalizeColor } from './utils.js';

export const getSimpleIcon = (slug) => {
	if (!slug) {
		return null;
	}

	const normaizedSlug = slug
		.toLowerCase()
		.replaceAll(' ', 'plus')
		.replaceAll('+', 'plus')
		.replaceAll('.', 'dot');

	const iconKey = 'si' + normaizedSlug.charAt(0).toUpperCase() +
		normaizedSlug.slice(1);

	if (iconKey in simpleIcons) {
		return simpleIcons[iconKey];
	}

	return null;
};

export const getIconSize = (path) => {
	const [x0, y0, x1, y1] = svgPathBbox(path);
	return { width: x1 - x0, height: y1 - y0 };
};

export const resetIconPosition = (path, iconWidth, iconHeight) => {
	const scale = 24 / iconHeight;
	const actualViewboxWidth = iconWidth > iconHeight
		? iconWidth * scale
		: iconWidth;
	const betterViewboxWidth = Math.ceil(actualViewboxWidth);
	const betterOffset = (betterViewboxWidth - actualViewboxWidth) / 2;
	const pathRescale = iconWidth > iconHeight
		? svgpath(path).scale(scale)
		: path;
	const [offsetX, offsetY] = svgPathBbox(pathRescale);
	const pathReset = svgpath(pathRescale).translate(
		-offsetX + betterOffset,
		-offsetY,
	)
		.toString();
	return { path: pathReset, betterViewboxWidth };
};

export const getIconSvg = (
	icon,
	color = '',
	darkModeColor = '',
	viewbox,
	size,
) => {
	const hex = normalizeColor(color) || `#${icon.hex}`;
	const darkModeHex = normalizeColor(darkModeColor) || `#${icon.hex}`;
	let iconSvg = icon.svg;

	if (viewbox === 'auto') {
		const { width: iconWidth, height: iconHeight } = getIconSize(icon.path);
		const { path, betterViewboxWidth } = resetIconPosition(
			icon.path,
			iconWidth,
			iconHeight,
		);
		iconSvg = iconSvg
			.replace(
				'viewBox="0 0 24 24"',
				`viewBox="0 0 ${betterViewboxWidth} 24"`,
			)
			.replace(/<path d=".*"\/>/, `<path d="${path}"/>`);
	}

	const iconSize = parseInt(size, 10);
	if (iconSize && iconSize > 0) {
		const sizePattern = /viewBox="0 0 (?<width>\d+) (?<height>\d+)"/;
		const sizeMatch = sizePattern.exec(iconSvg);
		const width = sizeMatch?.groups?.width;
		const height = sizeMatch?.groups?.height;
		if (Number(width) && Number(height)) {
			const maxScale = (2 ** 14 - 1) / 24;
			const minScale = 3 / 24;
			const scale = Math.max(Math.min(maxScale, iconSize / 24), minScale);
			const iconWidth = Math.round(width * scale);
			const iconHeight = Math.round(height * scale);
			iconSvg = iconSvg.replace(
				'<svg ',
				`<svg width="${iconWidth}" height="${iconHeight}" `,
			);
		}
	}

	if (darkModeColor && hex !== darkModeHex) {
		return iconSvg.replace(
			'<path ',
			`<style>path{fill:${hex}} @media (prefers-color-scheme:dark){path{fill:${darkModeHex}}}</style><path `,
		);
	}

	return iconSvg.replace('<svg ', `<svg fill="${hex}" `);
};
