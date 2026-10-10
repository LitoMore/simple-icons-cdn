import {test, type TestContext} from 'node:test';
import {normalizeColor} from '../source/utils.ts';

const fallback = '__fallback__';

await test('normalizeColor()', (t: TestContext) => {
	t.assert.strictEqual(normalizeColor('blue', fallback), '#0000ff');

	t.assert.strictEqual(normalizeColor('0cf', fallback), '#0cf');
	t.assert.strictEqual(normalizeColor('0cff', fallback), '#0cff');
	t.assert.strictEqual(normalizeColor('00ccff', fallback), '#00ccff');
	t.assert.strictEqual(normalizeColor('00ccffff', fallback), '#00ccffff');

	t.assert.strictEqual(normalizeColor('unicorn', fallback), fallback);
	t.assert.strictEqual(normalizeColor('#0cf', fallback), fallback);
	t.assert.strictEqual(normalizeColor('0cfff', fallback), fallback);
	t.assert.strictEqual(normalizeColor('00ccfff', fallback), fallback);
});
