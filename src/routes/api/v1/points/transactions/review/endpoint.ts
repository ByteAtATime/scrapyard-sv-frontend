import type { IAuthProvider } from '$lib/server/auth/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import type { IPointsRepo } from '$lib/server/points/types';
import { z } from 'zod';

export const postSchema = z.object({
	transactionId: z.number(),
	status: z.enum(['approved', 'rejected', 'deleted']),
	rejectionReason: z.string().optional()
});

type PostDeps = {
	pointsRepo: IPointsRepo;
	authProvider: IAuthProvider;
	body: z.infer<typeof postSchema>;
};

export const endpoint_POST: EndpointHandler<PostDeps> = async ({
	pointsRepo,
	authProvider,
	body
}) => {
	if (!(await authProvider.isOrganizer())) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

	const reviewerId = await authProvider.getUserId();
	if (!reviewerId) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

	const transaction = await pointsRepo.reviewTransaction(body.transactionId, {
		reviewerId,
		status: body.status,
		rejectionReason: body.rejectionReason
	});

	return transaction;
};
