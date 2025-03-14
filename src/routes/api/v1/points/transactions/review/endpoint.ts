import type { IAuthProvider } from '$lib/server/auth';
import type { EndpointHandler } from '$lib/server/endpoints';
import type { PointsService } from '$lib/server/points/service';
import {
	NotAuthenticatedError,
	NotOrganizerError,
	TransactionNotFoundError,
	SelfReviewError
} from '$lib/server/points/types';
import { z } from 'zod';

export const postSchema = z.object({
	transactionId: z.number().int().positive(),
	status: z.enum(['approved', 'rejected', 'deleted']),
	rejectionReason: z.string().optional()
});

export const endpoint_POST: EndpointHandler<{
	pointsService: PointsService;
	authProvider: IAuthProvider;
	body: z.infer<typeof postSchema>;
}> = async ({ pointsService, authProvider, body }) => {
	const { transactionId, status, rejectionReason } = body;

	if (!(await authProvider.isOrganizer())) {
		return {
			success: false,
			error: 'Not authorized',
			status: 403
		};
	}

	try {
		const result = await pointsService.reviewTransaction(transactionId, {
			status,
			rejectionReason,
			reviewerId: (await authProvider.getUserId())!
		});
		return { success: true, transaction: result };
	} catch (error) {
		// Map domain errors to HTTP responses
		if (error instanceof NotAuthenticatedError || error instanceof NotOrganizerError) {
			return {
				success: false,
				error: error.message,
				status: 401
			};
		}
		if (error instanceof TransactionNotFoundError) {
			return {
				success: false,
				error: error.message,
				status: 404
			};
		}
		if (error instanceof SelfReviewError) {
			return {
				success: false,
				error: error.message,
				status: 400
			};
		}

		throw error;
	}
};
