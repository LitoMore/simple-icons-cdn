import process from 'node:process';
import {test, type TestContext} from 'node:test';
import * as si from 'simple-icons';
import {getIconSvg} from '../source/icon.ts';

const icons = new Map<string, si.SimpleIcon>(
	Object.entries(si).map((
		[k, v],
	) => [k.slice(2).toLowerCase(), v as si.SimpleIcon]),
);

await test('check auto-viewbox', (t: TestContext) => {
	const result: Array<{title: string; time: number; fail: boolean}> = [];
	for (const [, icon] of icons) {
		const start = performance.now();
		const iconSvg = getIconSvg(icon, {viewbox: 'auto'});
		const end = performance.now();
		result.push({title: icon.title, time: end - start, fail: iconSvg.length === 0});
	}

	const iconsFailed = result.filter(r => r.fail);
	console.log('Top 10 slow icons:');
	console.table(
		result.toSorted((a, b) => b.time - a.time).slice(0, 10).map(x => ({
			title: x.title,
			'time (ms)': Number(x.time.toFixed(3)),
		})),
	);

	const iconArgs = new Set(process.argv.slice(2));
	if (iconArgs.size > 0) {
		console.table(
			result.filter(r => iconArgs.has(r.title)).map(x => ({
				title: x.title,
				'time (ms)': Number(x.time.toFixed(3)),
			})),
		);
	}

	t.assert.deepStrictEqual(iconsFailed, []);
});
