import { describe, it, expect, vi } from 'vitest';
import { compose, composePage } from './core';
import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit';
import type { EndpointHandler, MiddlewareHandler, PageHandler } from './types';

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
			success: false,
			error: 'Invalid input',
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
			success: false,
			error: 'Unauthorized',
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

describe('composePage', () => {
	it('should return data from the handler when no middleware is used', async () => {
		const handler: PageHandler<unknown> = () => ({ data: 'test' });
		const composed = composePage()(handler);
		const event = {} as ServerLoadEvent;
		const result = await composed(event);
		expect(result).toEqual({ data: 'test' });
	});

	it('should compose middleware that modify dependencies', async () => {
		interface Deps {
			a: number;
			b: number;
		}
		const middleware1: MiddlewareHandler<Deps> = (deps, _event, next) => {
			return next({ ...deps, a: 1 });
		};
		const middleware2: MiddlewareHandler<Deps> = (deps, _event, next) => {
			return next({ ...deps, b: 2 });
		};
		const handler: PageHandler<Deps> = (deps) => ({ sum: deps.a + deps.b });
		const composed = composePage(middleware1, middleware2)(handler);
		const result = await composed({} as ServerLoadEvent);
		expect(result).toEqual({ sum: 3 });
	});

	it('should allow middleware to return data directly without calling next', async () => {
		const middleware: MiddlewareHandler<unknown> = () => ({ data: 'from middleware' });
		const handler: PageHandler<unknown> = () => ({ data: 'from handler' });
		const composed = composePage(middleware)(handler);
		const result = await composed({} as ServerLoadEvent);
		expect(result).toEqual({ data: 'from middleware' });
	});

	it('should return empty object if the handler throws an error', async () => {
		const handler: PageHandler<unknown> = () => {
			throw new Error('test error');
		};
		const composed = composePage()(handler);
		const result = await composed({} as ServerLoadEvent);
		expect(result).toEqual({});
	});

	it('should return empty object if middleware throws an error', async () => {
		const middleware: MiddlewareHandler<unknown> = () => {
			throw new Error('middleware error');
		};
		const handler: PageHandler<unknown> = vi.fn();
		const composed = composePage(middleware)(handler);
		const result = await composed({} as ServerLoadEvent);
		expect(result).toEqual({});
		expect(handler).not.toHaveBeenCalled();
	});

	it('should return data directly from middleware without invoking subsequent middlewares or handler', async () => {
		const middleware1: MiddlewareHandler<unknown> = () => ({ data: 'middleware1' });
		const middleware2: MiddlewareHandler<unknown> = vi.fn((_deps, _event, next) => next({}));
		const handler: PageHandler<unknown> = vi.fn();
		const composed = composePage(middleware1, middleware2)(handler);
		const result = await composed({} as ServerLoadEvent);
		expect(result).toEqual({ data: 'middleware1' });
		expect(middleware2).not.toHaveBeenCalled();
		expect(handler).not.toHaveBeenCalled();
	});

	it('should handle ApiError objects returned by middleware', async () => {
		const middleware: MiddlewareHandler<unknown> = () => ({
			error: 'Validation failed',
			status: 400,
			code: 'VALIDATION_ERROR'
		});
		const composed = composePage(middleware)(() => ({}));
		const result = await composed({} as ServerLoadEvent);
		expect(result).toEqual({
			error: 'Validation failed',
			status: 400,
			code: 'VALIDATION_ERROR'
		});
	});

	it('should pass modified dependencies through multiple middlewares', async () => {
		const middleware1: MiddlewareHandler<{ a: number }> = (deps, _event, next) => {
			return next({ ...deps, a: 10 });
		};
		const middleware2: MiddlewareHandler<{ a: number; b: string }> = (deps, _event, next) => {
			return next({ ...deps, b: 'test' });
		};
		const handler: PageHandler<{ a: number; b: string }> = (deps) => ({
			combined: `${deps.a} ${deps.b}`
		});
		const composed = composePage(middleware1, middleware2)(handler);
		const result = await composed({} as ServerLoadEvent);
		expect(result).toEqual({ combined: '10 test' });
	});
});
