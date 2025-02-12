import type { IAuthProvider } from '$lib/server/auth/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import type { IShopRepository } from '$lib/server/shop';
import { z } from 'zod';

export const postSchema = z.object({
	itemId: z.number()
});

export const endpoint_POST: EndpointHandler<{
	authProvider: IAuthProvider;
	shopRepository: IShopRepository;
	body: z.infer<typeof postSchema>;
}> = async ({ authProvider, shopRepository, body }) => {
	const userId = await authProvider.getUserId();

	if (!userId) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

	try {
		const order = await shopRepository.createOrder(userId, body.itemId);
		return order;
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error has occurred'
		};
	}
};
