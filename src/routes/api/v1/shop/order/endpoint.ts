import type { EndpointHandler } from '$lib/server/endpoints';
import type { IShopService } from '$lib/server/shop';
import {
	ItemNotFoundError,
	ItemNotOrderableError,
	InsufficientStockError,
	InsufficientBalanceError,
	NotAuthenticatedError,
	NotOrganizerError
} from '$lib/server/shop/types';
import { z } from 'zod';

export const postSchema = z.object({
	itemId: z.number().int().positive()
});

export const endpoint_POST: EndpointHandler<{
	shopService: IShopService;
	body: z.infer<typeof postSchema>;
}> = async ({ shopService, body }) => {
	try {
		const order = await shopService.purchaseItem(body.itemId);
		return { success: true, order };
	} catch (error) {
		// Map domain errors to HTTP responses
		if (error instanceof NotAuthenticatedError || error instanceof NotOrganizerError) {
			return {
				error: error.message,
				status: 401
			};
		}
		if (error instanceof ItemNotFoundError) {
			return {
				error: error.message,
				status: 404
			};
		}
		if (
			error instanceof ItemNotOrderableError ||
			error instanceof InsufficientStockError ||
			error instanceof InsufficientBalanceError
		) {
			return {
				error: error.message,
				status: 400
			};
		}

		// Unexpected errors
		console.error('Unexpected error:', error);
		return {
			error: 'Internal server error',
			status: 500
		};
	}
};
