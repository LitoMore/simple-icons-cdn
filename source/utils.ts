import {cssKeywords} from './colors.ts';

export const normalizeColor = (style: string, fallback: string) => {
	if (cssKeywords.has(style)) {
		return cssKeywords.get(style);
	}

	return /^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iv.test(style) ? `#${style}` : fallback;
};
