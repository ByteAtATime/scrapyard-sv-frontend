import type { EndpointHandler } from '$lib/server/endpoints';
import type { PointsService } from '$lib/server/points/service';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/points/types';

export const endpoint_GET: EndpointHandler<{
	pointsService: PointsService;
}> = async ({ pointsService }) => {
	try {
		const transactions = await pointsService.getTransactions();
		return transactions;
	} catch (error) {
		// Map domain errors to HTTP responses
		if (error instanceof NotAuthenticatedError || error instanceof NotOrganizerError) {
			return {
				error: error.message,
				status: 401
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
