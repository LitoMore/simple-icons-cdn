import { siSimpleicons } from 'simple-icons';
import { assertEquals } from '@std/assert';
import { getSimpleIcon } from '../source/icon.ts';

Deno.test('getSimpleIcon()', () => {
	assertEquals(getSimpleIcon(), null);
	assertEquals(getSimpleIcon('simpleicon'), null);
	assertEquals(getSimpleIcon('simpleicons'), siSimpleicons);
});
