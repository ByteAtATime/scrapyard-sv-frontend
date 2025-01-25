import type { IAuthProvider } from '$lib/server/auth/types';
import { insertPointTransactionSchema } from '$lib/server/db/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import { PointTransaction } from '$lib/server/points/transaction';
import type { IPointsRepository } from '$lib/server/points/types';
import { z } from 'zod';

export const postSchema = z.object({
	userId: insertPointTransactionSchema.shape.userId,
	amount: insertPointTransactionSchema.shape.amount,
	reason: insertPointTransactionSchema.shape.reason
});

export const endpoint_POST: EndpointHandler<{
	pointsRepository: IPointsRepository;
	authProvider: IAuthProvider;
	body: z.infer<typeof postSchema>;
}> = async ({ pointsRepository, authProvider, body }) => {
	const { userId, amount, reason } = body;

	if (!(await authProvider.isOrganizer())) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

	const authorId = await authProvider.getUserId();

	if (!authorId) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

	const user = await authProvider.getUserById(userId);

	if (!user) {
		return {
			success: false,
			error: 'User not found'
		};
	}

	const transaction = new PointTransaction(
		{
			userId,
			amount,
			reason,
			authorId,

			// ignored
			id: 0,
			createdAt: new Date(),
			status: 'pending',
			reviewerId: null,
			reviewedAt: null,
			rejectionReason: null
		},
		authProvider
	);
	await pointsRepository.awardPoints(transaction);

	return { success: true };
};
