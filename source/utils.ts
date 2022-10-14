import {cssKeywords} from './colors';

export const normalizeColor = (style: string) => {
	if (style in cssKeywords) {
		return cssKeywords[style as keyof typeof cssKeywords];
	}

	if (/^[a-f\d]{3,8}$/i.test(style)) {
		let color = style;
		if (color.length < 6) {
			color = [...color.slice(0, 3)].map(x => x.repeat(2)).join('');
		} else if (color.length > 6) {
			color = color.slice(0, 6);
		}

		return '#' + color;
	}

	return '';
};

export const errorMessage = (text: string) => `<pre>${text}</pre>`;
