import * as si from 'simple-icons';
import svgpath from 'svgpath';
import { getIconSize, resetIconPosition } from '../source/icon.ts';

const checkAutoViewboxPath = (icon: si.SimpleIcon) => {
	const start = performance.now();
	const pathInstance = svgpath(icon.path);
	try {
		const { width, height } = getIconSize(pathInstance);
		const { path } = resetIconPosition(
			pathInstance,
			width,
			height,
		);
		const end = performance.now();
		if (path) {
			return { title: icon.title, time: end - start };
		}
		throw new Error('Path is empty');
	} catch (error) {
		const end = performance.now();
		console.error(
			`Error in icon: ${icon.title}: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
		);
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
