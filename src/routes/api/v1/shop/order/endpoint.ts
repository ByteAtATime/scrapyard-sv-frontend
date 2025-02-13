import type { IAuthProvider } from '$lib/server/auth/types';
import type { IShopService } from '$lib/server/shop';
import { z } from 'zod';

export const postSchema = z.object({
	itemId: z.number()
});

export type OrderEndpointDeps = {
	authProvider: IAuthProvider;
	shopService: IShopService;
	body: { itemId: number };
};

export const orderEndpoint = async ({ authProvider, shopService, body }: OrderEndpointDeps) => {
	const user = await authProvider.getCurrentUser();

	if (!user) {
		throw new Error('Not authenticated');
	}

	const order = await shopService.purchaseItem(user.id, body.itemId);

	return { order };
};
