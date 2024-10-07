import { assertEquals } from '@std/assert';
import { normalizeColor } from '../source/utils.ts';

const fallback = '__fallback__';

Deno.test('normalizeColor()', () => {
	assertEquals(normalizeColor('blue', fallback), '#0000ff');

	assertEquals(normalizeColor('0cf', fallback), '#0cf');
	assertEquals(normalizeColor('0cff', fallback), '#0cff');
	assertEquals(normalizeColor('00ccff', fallback), '#00ccff');
	assertEquals(normalizeColor('00ccffff', fallback), '#00ccffff');

	assertEquals(normalizeColor('unicorn', fallback), fallback);
	assertEquals(normalizeColor('#0cf', fallback), fallback);
	assertEquals(normalizeColor('0cfff', fallback), fallback);
	assertEquals(normalizeColor('00ccfff', fallback), fallback);
});
