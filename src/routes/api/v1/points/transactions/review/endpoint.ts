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
	body: z.infer<typeof postSchema>;
}> = async ({ pointsService, body }) => {
	const { transactionId, status, rejectionReason } = body;

	try {
		const result = await pointsService.reviewTransaction(transactionId, {
			status,
			rejectionReason,
			reviewerId: 0 // This will be overridden by the service
		});
		return { success: true, transaction: result };
	} catch (error) {
		// Map domain errors to HTTP responses
		if (error instanceof NotAuthenticatedError || error instanceof NotOrganizerError) {
			return {
				error: error.message,
				status: 401
			};
		}
		if (error instanceof TransactionNotFoundError) {
			return {
				error: error.message,
				status: 404
			};
		}
		if (error instanceof SelfReviewError) {
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
