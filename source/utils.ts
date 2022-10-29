import {cssKeywords} from './colors';

export const normalizeColor = (style: string) => {
	if (style in cssKeywords) {
		return cssKeywords[style as keyof typeof cssKeywords];
	}

	if (/^([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(style)) {
		return '#' + style;
	}

	return '';
};
