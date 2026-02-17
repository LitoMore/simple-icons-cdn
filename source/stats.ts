import { icons } from './icon.ts';

const decoder = new TextDecoder('utf-8');
const denoLockData = await Deno.readFile('./deno.lock');
const denoLockText = decoder.decode(denoLockData);
const denoLockJson = JSON.parse(denoLockText);

const simpleIconsPackage =
	Object.keys(denoLockJson.npm).find((key) => key.startsWith('simple-icons')) ??
		'';
const [name = 'unknown', version = 'unknown'] = simpleIconsPackage.split('@');

export const stats = {
	simpleIconsPakcage: name,
	simpleIconsVersion: version,
	totalIcons: icons.size,
};
