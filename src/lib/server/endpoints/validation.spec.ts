/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, vi, expect } from 'vitest';
import { withBodySchema, withQuerySchema, withRouteParams } from './validation';
import { z } from 'zod';

describe('withBodySchema', () => {
	const schema = z.object({
		name: z.string(),
		age: z.number()
	});

	it('should pass valid data to next handler', async () => {
		const middleware = withBodySchema(schema);
		const next = vi.fn().mockResolvedValue(new Response());
		const validBody = { name: 'John', age: 25 };

		const event = {
			request: new Request('http://test.com', {
				method: 'POST',
				body: JSON.stringify(validBody)
			})
		} as any;

		await middleware({}, event, next);

		expect(next).toHaveBeenCalledWith({ body: validBody });
	});

	it('should return 400 for invalid JSON', async () => {
		const middleware = withBodySchema(schema);
		const next = vi.fn();

		const event = {
			request: new Request('http://test.com', {
				method: 'POST',
				body: 'invalid json'
			})
		} as any;

		const response = await middleware({}, event, next);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({
			error: 'Invalid JSON',
			details: expect.any(String)
		});
		expect(next).not.toHaveBeenCalled();
	});

	it('should return 400 for schema validation failures', async () => {
		const middleware = withBodySchema(schema);
		const next = vi.fn();
		const invalidBody = { name: 123, age: 'not a number' };

		const event = {
			request: new Request('http://test.com', {
				method: 'POST',
				body: JSON.stringify(invalidBody)
			})
		} as any;

		const response = await middleware({}, event, next);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({
			error: 'Validation failed',
			errors: expect.any(Array)
		});
		expect(next).not.toHaveBeenCalled();
	});
});

describe('withRouteParams', () => {
	it('should pass route parameters to next handler', async () => {
		const middleware = withRouteParams<
			{ id: string; slug: string },
			{ params: { id: string; slug: string } }
		>();
		const next = vi.fn().mockResolvedValue(new Response());

		const event = {
			params: { id: '123', slug: 'test-post' }
		} as any;

		await middleware({}, event, next);

		expect(next).toHaveBeenCalledWith({
			params: { id: '123', slug: 'test-post' }
		});
	});

	it('should handle missing parameters', async () => {
		const middleware = withRouteParams<
			{ id: string; slug: string },
			{ params: { id: string; slug: string } }
		>();
		const next = vi.fn().mockResolvedValue(new Response());

		const event = {
			params: { id: '123' }
		} as any;

		await middleware({}, event, next);

		expect(next).toHaveBeenCalledWith({
			params: { id: '123' }
		});
	});
});

describe('withQuerySchema', () => {
	const schema = z.object({
		page: z.string().transform(Number).pipe(z.number().positive()),
		limit: z.string().transform(Number).pipe(z.number().positive())
	});

	it('should pass valid query parameters to next handler', async () => {
		const middleware = withQuerySchema(schema);
		const next = vi.fn().mockResolvedValue(new Response());

		const event = {
			request: new Request('http://test.com?page=1&limit=10')
		} as any;

		await middleware({}, event, next);

		expect(next).toHaveBeenCalledWith({
			query: { page: 1, limit: 10 }
		});
	});

	it('should return 400 for validation failures', async () => {
		const middleware = withQuerySchema(schema);
		const next = vi.fn();

		const event = {
			request: new Request('http://test.com?page=-1&limit=invalid')
		} as any;

		const response = await middleware({}, event, next);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({
			error: 'Query validation failed',
			errors: expect.any(Array)
		});
		expect(next).not.toHaveBeenCalled();
	});

	it('should handle missing required parameters', async () => {
		const middleware = withQuerySchema(schema);
		const next = vi.fn();

		const event = {
			request: new Request('http://test.com?page=1')
		} as any;

		const response = await middleware({}, event, next);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({
			error: 'Query validation failed',
			errors: expect.any(Array)
		});
		expect(next).not.toHaveBeenCalled();
	});
});
