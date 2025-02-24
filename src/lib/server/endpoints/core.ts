import type { RequestEvent, RequestHandler, ServerLoad, ServerLoadEvent } from '@sveltejs/kit';
import type { EndpointHandler, MiddlewareHandler, ApiError, PageHandler } from './types';
import { isApiError, isApiResponse } from './types';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';

type ComposedHandler<TDeps> = (deps: TDeps, event: RequestEvent) => Response | Promise<Response>;
type ComposedPageHandler<TDeps, TReturn> = (
	deps: TDeps,
	event: ServerLoadEvent
) => TReturn | Promise<TReturn>;

export function successResponse<T>(data: T, status = 200): Response {
	return json({ success: true, data }, { status });
}

export function errorResponse(error: string | ApiError, status = 400): Response {
	if (typeof error === 'string') {
		return json({ success: false, error }, { status });
	}
	return json({ success: false, error: error.error }, { status: error.status ?? status });
}

async function normalizeResponse(result: unknown): Promise<Response> {
	if (result instanceof Response) {
		const contentType = result.headers.get('content-type');
		if (!contentType?.includes('application/json')) {
			throw new Error('Response must be JSON');
		}

		const cloned = result.clone();
		const parsed = await cloned.json();
		if (!isApiResponse(parsed)) {
			const details = dev ? `\n\nGot: ${JSON.stringify(parsed, null, 2)}` : '';
			throw new Error('Response must follow ApiResponse format' + details);
		}

		return result;
	}

	if (isApiError(result)) {
		return errorResponse(result);
	}

	return successResponse(result);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const compose = (...middlewares: MiddlewareHandler<any>[]) => {
	return <TDeps>(handler: EndpointHandler<TDeps>): RequestHandler => {
		const composedMiddleware = middlewares.reduceRight<ComposedHandler<TDeps>>(
			(next, middleware) => {
				return async (deps, event) => {
					const result = await middleware(deps, event, (newDeps) => next(newDeps, event));
					return normalizeResponse(result);
				};
			},
			async (deps, _event) => {
				const result = await handler(deps);
				return normalizeResponse(result);
			}
		);

		return async (event) => {
			try {
				const response = await composedMiddleware({} as TDeps, event);
				return response;
			} catch (e) {
				console.error(e);
				return errorResponse({
					error: 'Internal server error',
					status: 500,
					code: 'INTERNAL_ERROR'
				});
			}
		};
	};
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const composePage = (...middlewares: MiddlewareHandler<any>[]) => {
	return <TDeps, TReturn>(handler: PageHandler<TDeps>): ServerLoad => {
		const composedMiddleware = middlewares.reduceRight<ComposedPageHandler<TDeps, TReturn>>(
			(next, middleware) => {
				return async (deps, event) =>
					(await middleware(deps, event, (newDeps) => next(newDeps, event))) as unknown as TReturn;
			},
			async (deps, _event) => (await handler(deps)) as unknown as TReturn
		);

		return async (event) => {
			try {
				const response = await composedMiddleware({} as TDeps, event);
				return response;
			} catch (e) {
				console.error(e);
				return {};
			}
		};
	};
};
