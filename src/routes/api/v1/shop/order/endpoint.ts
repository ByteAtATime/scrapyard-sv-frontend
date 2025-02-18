import type { IAuthProvider } from '$lib/server/auth/types';
import type { IPointsRepo } from '$lib/server/points';
import type { IShopService } from '$lib/server/shop';
import { z } from 'zod';

export const postSchema = z.object({
	itemId: z.number()
});

export type OrderEndpointDeps = {
	authProvider: IAuthProvider;
	pointsRepo: IPointsRepo;
	shopService: IShopService;
	body: { itemId: number };
};

export const orderEndpoint = async ({
	authProvider,
	shopService,
	body,
	pointsRepo
}: OrderEndpointDeps) => {
	const user = await authProvider.getCurrentUser();

	if (!user) {
		throw new Error('Not authenticated');
	}

	const item = await shopService.getItemById(body.itemId);

	if (!item) {
		return {
			success: false,
			status: 404,
			error: 'Item not found'
		};
	}

	if (!item.isOrderable) {
		return {
			success: false,
			status: 400,
			error: 'Item is not orderable'
		};
	}

	if (item.stock <= 0) {
		return {
			success: false,
			status: 400,
			error: 'Item is out of stock'
		};
	}

	const userBalance = await pointsRepo.getTotalPoints(user.id);

	if (userBalance < item.price) {
		return {
			success: false,
			status: 400,
			error: 'Insufficient balance'
		};
	}

	const order = await shopService.purchaseItem(user.id, body.itemId);

	return { order };
};
