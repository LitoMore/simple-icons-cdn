import {Buffer} from 'node:buffer';
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import process from 'node:process';
import app from './app.ts';
import {defaultHandler} from './handlers.ts';

const handleRequest = async (request: IncomingMessage, response: ServerResponse) => {
	try {
		// Node.js populates method and url on incoming server requests.
		const method = request.method!;
		const result = ['GET', 'HEAD'].includes(method)
			? await app.fetch(
				new Request(new URL(request.url!, 'http://localhost'), {
					method,
				}),
			)
			: defaultHandler({method});
		const body = await result.arrayBuffer();
		response.writeHead(result.status, Object.fromEntries(result.headers));
		response.end(Buffer.from(body));
	} catch (error) {
		console.error('Failed to handle request:', error);
		response.writeHead(500, {
			'Cache-Control': 'no-store',
			'Content-Type': 'text/plain',
		});
		response.end('Internal Server Error');
	}
};

export const createHttpServer = () => createServer((request, response) => {
	void handleRequest(request, response);
});

export const getListenPort = () => Number(process.env.PORT ?? 8000);

if (import.meta.main) {
	const hostname = '0.0.0.0';
	const server = createHttpServer();
	const shutdown = () => {
		server.close();
	};

	process.once('SIGINT', shutdown);
	process.once('SIGTERM', shutdown);
	server.listen(getListenPort(), hostname, () => {
		const address = server.address();
		if (address !== null && typeof address === 'object') {
			app.onListen(hostname, address.port);
		}
	});
}
