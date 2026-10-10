import {test, type TestContext} from 'node:test';
import {siSimpleicons} from 'simple-icons';
import {getSimpleIcon} from '../source/icon.ts';

await test('getSimpleIcon()', (t: TestContext) => {
	t.assert.strictEqual(getSimpleIcon(), null);
	t.assert.strictEqual(getSimpleIcon('simpleicon'), null);
	t.assert.deepStrictEqual(getSimpleIcon('simpleicons'), siSimpleicons);
});
