import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { MiddlewareHandler } from './types';

export const withBodySchema = <TDeps extends { body: z.infer<TSchema> }, TSchema extends z.ZodType>(
	schema: TSchema
): MiddlewareHandler<Omit<TDeps, 'body'>> => {
	return async (deps, event, next) => {
		let rawBody: unknown;

		try {
			rawBody = await event.request.json();
		} catch (e) {
			if (e instanceof SyntaxError) {
				return json({ error: 'Invalid JSON', details: e.message }, { status: 400 });
			}
			return json({ error: 'Internal server error' }, { status: 500 });
		}

		try {
			const body = schema.parse(rawBody);
			return next({ ...deps, body } as TDeps);
		} catch (e) {
			console.log(e);
			if (e instanceof z.ZodError) {
				return json(
					{
						success: false,
						error: 'Validation failed',
						errors: e.errors.map((err) => ({
							path: err.path.join('.'),
							message: err.message
						}))
					},
					{ status: 400 }
				);
			}
			return json({ error: 'Internal server error' }, { status: 500 });
		}
	};
};

export const withRouteParams = <
	TParams extends Record<string, string | number>,
	TDeps extends { params: TParams } = { params: TParams }
>(
	routeSchema: z.ZodType<TParams>
): MiddlewareHandler<Omit<TDeps, 'params'>> => {
	return async (deps, event, next) => {
		try {
			const params = routeSchema.parse(event.params);
			return next({ ...deps, params } as TDeps);
		} catch (e) {
			console.log(e);
			if (e instanceof z.ZodError) {
				return json(
					{
						error: 'Route parameter validation failed',
						errors: e.errors.map((err) => ({
							path: err.path.join('.'),
							message: err.message
						}))
					},
					{ status: 400 }
				);
			}
			return json({ error: 'Internal server error' }, { status: 500 });
		}
	};
};

export const withQuerySchema = <
	TDeps extends { query: z.infer<TSchema> },
	TSchema extends z.ZodType
>(
	schema: TSchema
): MiddlewareHandler<Omit<TDeps, 'query'>> => {
	return async (deps, event, next) => {
		const rawQuery = Object.fromEntries(new URL(event.request.url).searchParams);

		try {
			const query = schema.parse(rawQuery);
			return next({ ...deps, query } as TDeps);
		} catch (e) {
			console.log(e);
			if (e instanceof z.ZodError) {
				return json(
					{
						error: 'Query validation failed',
						errors: e.errors.map((err) => ({
							path: err.path.join('.'),
							message: err.message
						}))
					},
					{ status: 400 }
				);
			}
			return json({ error: 'Internal server error' }, { status: 500 });
		}
	};
};
