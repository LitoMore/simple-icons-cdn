
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {request, type IncomingHttpHeaders} from 'node:http';
import process from 'node:process';
import {test, type TestContext} from 'node:test';
import {fileURLToPath} from 'node:url';
import app from '../source/app.ts';
import {
	cacheForOneDayHeader,
	cacheForOneYearHeader,
	cacheForSevenDaysHeader,
} from '../source/handlers.ts';
import {createHttpServer, getListenPort} from '../source/serve.ts';

await test('server defaults to port 8000 when PORT is unset', (t: TestContext) => {
	const environment = {...process.env};
	delete environment.PORT;
	t.mock.property(process, 'env', environment);
	t.assert.strictEqual(getListenPort(), 8000);
});

await test('server entry point respects PORT and logs its actual address', {
	timeout: 10_000,
}, async (t: TestContext) => {
	const child = spawn(process.execPath, [
		fileURLToPath(new URL('../source/serve.ts', import.meta.url)),
	], {
		env: {...process.env, ...Object.fromEntries([['PORT', '0']])},
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	t.after(async () => {
		if (child.exitCode !== null || child.signalCode !== null) {
			return;
		}

		const exited = once(child, 'exit');
		child.kill();
		await exited;
	});
	const output = await new Promise<string>((resolve, reject) => {
		let stdout = '';
		let stderr = '';
		child.stderr.setEncoding('utf8');
		child.stdout.setEncoding('utf8');
		child.stderr.on('data', (chunk: string) => {
			stderr += chunk;
		});
		child.once('error', reject);
		child.once(
			'exit',
			() => {
				reject(new Error(`Server exited before listening: ${stderr}`));
			},
		);
		child.stdout.on('data', (chunk: string) => {
			stdout += chunk;
			if (stdout.includes('/_badge/data-served')) {
				resolve(stdout);
			}
		});
	});
	const port = /http:\/\/0\.0\.0\.0:(?<port>\d+)\//v.exec(output)?.groups?.port;
	t.assert.match(output, /Test URLs:/v);
	if (port === undefined || port === '0') {
		throw new Error('Server did not log its bound port');
	}

	const response = await fetch(`http://127.0.0.1:${port}/simpleicons`);
	t.assert.strictEqual(response.status, 200);
	t.assert.match(await response.text(), /<svg/v);
});

await test('Node.js HTTP server', async (t: TestContext) => {
	const server = createHttpServer();
	await new Promise<void>(resolve => {
		server.listen(0, '127.0.0.1', resolve);
	});
	t.after(async () => new Promise<void>((resolve, reject) => {
		server.close(error => {
			if (error) {
				reject(error);
				return;
			}

			resolve();
		});
	}));
	const address = server.address();
	if (address === null || typeof address === 'string') {
		throw new Error('No TCP address');
	}

	const getResponse = async (path: string, method = 'GET') =>
		new Promise<{
			status: number | undefined;
			headers: IncomingHttpHeaders;
			body: string;
		}>((resolve, reject) => {
			const request_ = request({
				hostname: '127.0.0.1',
				port: address.port,
				path,
				method,
			}, response => {
				let body = '';
				response.setEncoding('utf8');
				response.on('data', (chunk: string) => {
					body += chunk;
				});
				response.on('end', () => {
					resolve({status: response.statusCode, headers: response.headers, body});
				});
				response.on('error', reject);
			});
			request_.on('error', reject);
			request_.end();
		});

	await t.test('redirect and favicon preserve status and headers', async (t: TestContext) => {
		await Promise.all((['GET', 'HEAD']).map(async method => {
			await t.test(method, async (t: TestContext) => {
				const root = await getResponse('/', method);
				t.assert.strictEqual(root.status, 307);
				t.assert.strictEqual(
					root.headers.location,
					'https://github.com/LitoMore/simple-icons-cdn',
				);
				t.assert.strictEqual(root.headers['cache-control'], cacheForOneYearHeader);
				t.assert.strictEqual(root.body, '');
				const favicon = await getResponse('/favicon.ico', method);
				t.assert.strictEqual(favicon.status, 204);
				t.assert.strictEqual(favicon.body, '');
			});
		}));
	});

	await t.test('SVG colors, dark mode, viewbox and size work over HTTP', async (t: TestContext) => {
		const path = '/simpleicons/blue/white?viewbox=auto&size=48';
		const get = await getResponse(path);
		const expected = await app.fetch(new Request(`http://localhost${path}`));
		t.assert.strictEqual(get.status, 200);
		t.assert.strictEqual(get.headers['content-type'], 'image/svg+xml');
		t.assert.strictEqual(get.headers['access-control-allow-origin'], '*');
		t.assert.strictEqual(get.headers['cache-control'], cacheForSevenDaysHeader);
		t.assert.strictEqual(get.body, await expected.text());
		t.assert.match(get.body, /<svg/v);
		const head = await getResponse(path, 'HEAD');
		t.assert.strictEqual(head.status, get.status);
		t.assert.strictEqual(head.headers['content-type'], get.headers['content-type']);
		t.assert.strictEqual(head.headers['cache-control'], get.headers['cache-control']);
		t.assert.strictEqual(head.body, '');
	});

	await t.test('missing icons and trailing slashes return 404', async (t: TestContext) => {
		const cases = ['/nonexistent-icon', '/simpleicons/', '/a/b/c/d'].flatMap(path =>
			['GET', 'HEAD'].map(method => ({path, method})),
		);
		await Promise.all(cases.map(async ({path, method}) => {
			await t.test(`${method} ${path}`, async (t: TestContext) => {
				const response = await getResponse(path, method);
				t.assert.strictEqual(response.status, 404);
				t.assert.strictEqual(response.body, '');
			});
		}));
	});

	await t.test('unsupported methods return 405', async (t: TestContext) => {
		await Promise.all((['POST', 'PUT', 'DELETE', 'OPTIONS', 'TRACE']).map(async method => {
			await t.test(method, async (t: TestContext) => {
				const response = await getResponse('/simpleicons', method);
				t.assert.strictEqual(response.status, 405);
				t.assert.strictEqual(response.headers['cache-control'], cacheForSevenDaysHeader);
				t.assert.strictEqual(response.body, '');
			});
		}));
	});

	await t.test('unexpected handler failures return 500 and server stays available', async (t: TestContext) => {
		t.mock.method(console, 'error', () => {
			// Suppress expected errors in this test.
		});
		const mockedFetch = t.mock.method(app, 'fetch', async () => {
			throw new Error('Unexpected failure');
		});

		const response = await getResponse('/simpleicons');
		t.assert.strictEqual(response.status, 500);
		t.assert.strictEqual(response.headers['cache-control'], 'no-store');
		t.assert.strictEqual(response.body, 'Internal Server Error');

		mockedFetch.mock.restore();
		const recovered = await getResponse('/simpleicons');
		t.assert.strictEqual(recovered.status, 200);
	});

	await t.test('traffic badges read Node.js environment variables', async (t: TestContext) => {
		t.mock.property(process, 'env', Object.fromEntries([
			['CLOUDFLARE_SI_ACCOUNT_ID', 'account-id'],
			['CLOUDFLARE_SI_API_TOKEN', 'api-token'],
			['CLOUDFLARE_SI_ZONE_ID', 'zone-id'],
		]));
		t.mock.method(console, 'error', () => {
			// Suppress expected errors in this test.
		});
		t.mock.method(globalThis, 'fetch', async () => {
			throw new Error('Cloudflare unavailable');
		});

		const unavailable = await getResponse('/_badge/requests');
		t.assert.strictEqual(unavailable.headers['cache-control'], 'no-store');
		const unavailableBadge = JSON.parse(unavailable.body) as {isError: boolean};
		t.assert.strictEqual(unavailableBadge.isError, true);
		let fetchCalls = 0;
		t.mock.method(globalThis, 'fetch', async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
			fetchCalls++;
			t.assert.strictEqual(
				new Headers(init?.headers).get('Authorization'),
				'Bearer api-token',
			);
			return Response.json({
				data: {
					viewer: {
						accounts: [{
							traffic: [{
								count: 700_000_000,
								sum: {edgeResponseBytes: 9_000_000_000},
							}],
						}],
						zones: [{uniqueVisitors: [{uniq: {uniques: 45_000_000}}]}],
					},
				},
			});
		});

		await Promise.all(([
			['requests', 'requests', '700 million/month'],
			['unique-visitors', 'unique visitors', '45 million/month'],
			['data-served', 'data served', '9 GB/month'],
		]).map(async ([path, label, message]) => {
			await t.test(`/_badge/${path}`, async (t: TestContext) => {
				const get = await getResponse(`/_badge/${path}`);
				t.assert.strictEqual(get.status, 200);
				t.assert.strictEqual(get.headers['cache-control'], cacheForOneDayHeader);
				t.assert.deepStrictEqual(JSON.parse(get.body), {
					schemaVersion: 1,
					label,
					message,
					color: 'blue',
				});
				const head = await getResponse(`/_badge/${path}`, 'HEAD');
				t.assert.strictEqual(head.status, 200);
				t.assert.strictEqual(head.body, '');
			});
		}));

		t.assert.strictEqual(fetchCalls, 1);
	});
});
