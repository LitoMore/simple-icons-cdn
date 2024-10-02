import { cssKeywords } from './colors.ts';

export const normalizeColor = (style: string, fallback: string) => {
	if (cssKeywords.has(style)) {
		return cssKeywords.get(style);
	}

	if (/^([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(style)) {
		return `#${style}`;
	}

	return fallback;
};
