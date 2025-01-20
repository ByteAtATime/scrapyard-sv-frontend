import type { RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface ApiError {
	message: string;
	status?: number;
	code?: string;
}

export type ApiEndpointResult<T = unknown> =
	| T
	| ApiError
	| Response
	| Promise<T | ApiError | Response>;

// Schema for runtime validation
export const ApiErrorSchema = z.object({
	message: z.string(),
	status: z.number().optional(),
	code: z.string().optional()
});

export const isApiError = (value: unknown): value is ApiError => {
	return ApiErrorSchema.safeParse(value).success;
};

export type MiddlewareHandler<TDeps> = (
	deps: TDeps,
	event: RequestEvent,
	next: EndpointHandler<TDeps>
) => ApiEndpointResult;

export type EndpointHandler<TDeps, T = unknown> = (deps: TDeps) => ApiEndpointResult<T>;

export type Handler<TDeps> = MiddlewareHandler<TDeps> | EndpointHandler<TDeps>;

export function isApiResponse<T>(response: unknown): response is ApiResponse<T> {
	return (
		typeof response === 'object' &&
		response !== null &&
		'success' in response &&
		typeof (response as ApiResponse<T>).success === 'boolean'
	);
}
