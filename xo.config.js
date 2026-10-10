export default [{
	settings: {
		n: {
			// Node.js runs TypeScript directly, so preserve source file extensions.
			typescriptExtensionMap: [],
		},
	},
}, {
	files: ['test/**/*.test.ts'],
	rules: {
		// Node.js parent tests and subtests use the same context name.
		'@typescript-eslint/no-shadow': ['error', {
			allow: ['t'],
			ignoreOnInitialization: true,
		}],
	},
}];
