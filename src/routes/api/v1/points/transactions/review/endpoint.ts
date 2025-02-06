import type { IAuthProvider } from '$lib/server/auth/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import type { IPointsRepository } from '$lib/server/points/types';
import { z } from 'zod';

export const postSchema = z
	.object({
		transactionId: z.number().int(),
		action: z.enum(['approve', 'reject', 'delete']),
		reason: z.string().min(1).max(500).optional()
	})
	.refine((data) => !(data.action === 'reject' && !data.reason), {
		message: 'Rejection reason is required when rejecting or deleting a transaction',
		path: ['reason']
	});

export const endpoint_POST: EndpointHandler<{
	pointsRepository: IPointsRepository;
	authProvider: IAuthProvider;
	body: z.infer<typeof postSchema>;
}> = async ({ pointsRepository, authProvider, body }) => {
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

	const result = await pointsRepository.reviewTransaction({
		transactionId: body.transactionId,
		reviewerId,
		status:
			body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : 'deleted',
		rejectionReason: body.action === 'reject' ? body.reason : undefined
	});

	if (!result.success) {
		return {
			success: false,
			error: result.error
		};
	}

	return { success: true };
};
