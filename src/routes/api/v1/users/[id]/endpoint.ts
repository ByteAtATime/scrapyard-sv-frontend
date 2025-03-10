import type { EndpointHandler } from '$lib/server/endpoints';
import type { UserService } from '$lib/server/auth/service';
import type { IAuthProvider } from '$lib/server/auth/types';
import {
	NotAuthenticatedError,
	NotOrganizerError,
	UserNotFoundError
} from '$lib/server/auth/types';
import { z } from 'zod';
import type { PointsService } from '$lib/server/points/service';

export const routeSchema = z.object({
	id: z.coerce.number().int().positive()
});

export const endpoint_GET: EndpointHandler<{
	userService: UserService;
	authProvider: IAuthProvider;
	pointsService: PointsService;
	params: z.infer<typeof routeSchema>;
}> = async ({ userService, authProvider, pointsService, params }) => {
	try {
		// Authorization check
		if (!(await authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		const { id: userId } = params;
		const user = await userService.getUserById(userId);

		// Get total points for the user using PointsService
		const totalPoints = await pointsService.getTotalPoints(userId);

		return {
			...user,
			totalPoints
		};
	} catch (error) {
		// Map domain errors to HTTP responses
		if (error instanceof NotAuthenticatedError || error instanceof NotOrganizerError) {
			return {
				success: false,
				error: error.message,
				status: 401
			};
		}
		if (error instanceof UserNotFoundError) {
			return {
				success: false,
				error: error.message,
				status: 404
			};
		}

		// Unexpected errors
		console.error('Unexpected error:', error);
		return {
			success: false,
			error: 'Internal server error',
			status: 500
		};
	}
};
