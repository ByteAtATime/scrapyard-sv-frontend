import type { IAuthProvider } from '$lib/server/auth/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import type { IShopRepo } from '$lib/server/shop';
import { z } from 'zod';

export const postSchema = z.object({
	itemId: z.number()
});

export const endpoint_POST: EndpointHandler<{
	authProvider: IAuthProvider;
	shopRepo: IShopRepo;
	body: z.infer<typeof postSchema>;
}> = async ({ authProvider, shopRepo, body }) => {
	const userId = await authProvider.getUserId();

	if (!userId) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

	try {
		const order = await shopRepo.createOrder(userId, body.itemId);
		return order;
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error has occurred'
		};
	}
};
