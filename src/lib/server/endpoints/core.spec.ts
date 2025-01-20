import { describe, it, expect, vi } from 'vitest';
import { compose } from './core';
import type { RequestEvent } from '@sveltejs/kit';
import type { EndpointHandler, MiddlewareHandler } from './types';

interface TestDeps {
	a?: number;
	b?: number;
}

describe('compose', () => {
	it('should handle direct data returns', async () => {
		const handler: EndpointHandler<unknown> = () => ({ result: 'success' });
		const composed = compose()(handler);
		const response = await composed({} as RequestEvent);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			success: true,
			data: { result: 'success' }
		});
	});

	it('should handle error objects', async () => {
		const handler: EndpointHandler<unknown> = () => ({
			message: 'Invalid input',
			status: 400,
			code: 'INVALID_INPUT'
		});
		const composed = compose()(handler);
		const response = await composed({} as RequestEvent);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			success: false,
			error: 'Invalid input'
		});
	});

	it('should compose middleware with direct returns', async () => {
		const middleware1: MiddlewareHandler<TestDeps> = (deps, _event, next) => {
			return next({ ...deps, a: 1 });
		};
		const middleware2: MiddlewareHandler<TestDeps> = (deps, _event, next) => {
			return next({ ...deps, b: 2 });
		};
		const handler: EndpointHandler<TestDeps> = (deps) => ({
			sum: (deps.a ?? 0) + (deps.b ?? 0)
		});

		const composed = compose(middleware1, middleware2)(handler);
		const response = await composed({} as RequestEvent);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			success: true,
			data: { sum: 3 }
		});
	});

	it('should handle errors in middleware', async () => {
		const middleware: MiddlewareHandler<unknown> = () => ({
			message: 'Unauthorized',
			status: 401,
			code: 'UNAUTHORIZED'
		});
		const handler: EndpointHandler<unknown> = vi.fn();

		const composed = compose(middleware)(handler);
		const response = await composed({} as RequestEvent);

		expect(handler).not.toHaveBeenCalled();
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	it('should validate Response objects follow API format', async () => {
		const handler: EndpointHandler<unknown> = () =>
			new Response(JSON.stringify({ success: true, data: { test: true } }), {
				headers: { 'content-type': 'application/json' }
			});
		const composed = compose()(handler);
		const response = await composed({} as RequestEvent);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			success: true,
			data: { test: true }
		});
	});

	it('should reject non-API-format Response objects', async () => {
		const handler: EndpointHandler<unknown> = () =>
			new Response(JSON.stringify({ wrong: 'format' }), {
				headers: { 'content-type': 'application/json' }
			});
		const composed = compose()(handler);
		const response = await composed({} as RequestEvent);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			success: false,
			error: 'Internal server error'
		});
	});
});
