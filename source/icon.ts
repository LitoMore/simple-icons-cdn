import * as simpleIcons from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';
import { svgPathBbox } from 'svg-path-bbox';
import svgpath from 'svgpath';
import { normalizeColor } from './utils.ts';

const icons = new Map(Object.entries(simpleIcons));

export const getSimpleIcon = (slug?: string) => {
	if (!slug) {
		return null;
	}

	const normaizedSlug = slug
		.toLowerCase()
		.replaceAll(/[ +]/g, 'plus')
		.replaceAll('.', 'dot');

	const iconKey = 'si' + normaizedSlug.charAt(0).toUpperCase() +
		normaizedSlug.slice(1) as keyof typeof simpleIcons;

	if (icons.has(iconKey)) {
		return icons.get(iconKey) as SimpleIcon;
	}

	return null;
};

export const getIconSize = (path: typeof svgpath) => {
	const [x0, y0, x1, y1] = svgPathBbox(path);
	return { width: x1 - x0, height: y1 - y0 };
};

export const resetIconPosition = (
	pathInstance: typeof svgpath,
	iconWidth: number,
	iconHeight: number,
) => {
	const scale = 24 / iconHeight;
	const actualViewboxWidth = iconWidth > iconHeight
		? iconWidth * scale
		: iconWidth;
	const betterViewboxWidth = Math.ceil(actualViewboxWidth);
	const betterOffset = (betterViewboxWidth - actualViewboxWidth) / 2;
	const pathRescale = iconWidth > iconHeight
		? pathInstance.scale(scale)
		: pathInstance;
	const [offsetX, offsetY] = svgPathBbox(pathRescale);
	const pathReset = pathRescale.translate(
		-offsetX + betterOffset,
		-offsetY,
	)
		.round(3)
		.toString();
	return { path: pathReset, betterViewboxWidth };
};

export const getIconSvg = (icon: SimpleIcon, options?: {
	color?: string;
	darkModeColor?: string;
	viewbox?: string;
	size?: string;
}) => {
	const { color = '', darkModeColor = '', viewbox = '', size = '' } = options ||
		{};
	const hex = normalizeColor(color) || `#${icon.hex}`;
	const darkModeHex = normalizeColor(darkModeColor) || `#${icon.hex}`;
	let iconSvg = icon.svg;

	if (viewbox === 'auto') {
		const pathInstance = svgpath(icon.path);
		const { width: iconWidth, height: iconHeight } = getIconSize(pathInstance);
		if (iconWidth !== iconHeight) {
			const { path, betterViewboxWidth } = resetIconPosition(
				pathInstance,
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
	}

	const iconSize = parseInt(size, 10);
	if (iconSize && iconSize > 0) {
		const sizePattern = /viewBox="0 0 (?<width>\d+) (?<height>\d+)"/;
		const sizeMatch = sizePattern.exec(iconSvg);
		const width = Number(sizeMatch?.groups?.width);
		const height = Number(sizeMatch?.groups?.height);
		if (width && height) {
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
