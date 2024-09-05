import * as si from 'npm:simple-icons';
import { getIconSize, resetIconPosition } from '../source/icon.ts';

const checkAutoViewboxPath = (icon: si.SimpleIcon) => {
	const start = performance.now();
	try {
		const { path } = icon;
		const { width, height } = getIconSize(path);
		resetIconPosition(
			path,
			width,
			height,
		);
		const end = performance.now();
		return { title: icon.title, time: end - start };
	} catch (e) {
		const end = performance.now();
		console.error(`Error in icon: ${icon.title}: ${e.message}`);
		return { title: icon.title, time: end - start, fail: true };
	}
};

const result = Object.values(si).map((icon) =>
	checkAutoViewboxPath(icon as si.SimpleIcon)
);
const iconsFailed = result.filter((r) => r.fail);

console.log('Top 10 slow icons:');
console.table(
	result.sort((a, b) => b.time - a.time).slice(0, 10).map((x) => ({
		title: x.title,
		['time (ms)']: x.time,
	})),
);

if (iconsFailed.length > 0) {
	console.log(`Failed icons:`);
	console.table(iconsFailed);
	Deno.exit(1);
} else {
	console.log('All icons passed');
	Deno.exit(0);
}
