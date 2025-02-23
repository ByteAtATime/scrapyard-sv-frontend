import { insertPointTransactionSchema } from '$lib/server/db/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import type { PointsService } from '$lib/server/points/service';
import {
	NotAuthenticatedError,
	NotOrganizerError,
	UserNotFoundError
} from '$lib/server/points/types';
import { z } from 'zod';

export const postSchema = z.object({
	userId: insertPointTransactionSchema.shape.userId,
	amount: insertPointTransactionSchema.shape.amount,
	reason: insertPointTransactionSchema.shape.reason
});

export const endpoint_POST: EndpointHandler<{
	pointsService: PointsService;
	body: z.infer<typeof postSchema>;
}> = async ({ pointsService, body }) => {
	const { userId, amount, reason } = body;

	try {
		await pointsService.awardPoints(userId, amount, reason);
		return { success: true };
	} catch (error) {
		// Map domain errors to HTTP responses
		if (error instanceof NotAuthenticatedError || error instanceof NotOrganizerError) {
			return {
				error: error.message,
				status: 401
			};
		}
		if (error instanceof UserNotFoundError) {
			return {
				error: error.message,
				status: 404
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
