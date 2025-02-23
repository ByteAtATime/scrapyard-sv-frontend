import type { EndpointHandler } from '$lib/server/endpoints';
import type { UserService } from '$lib/server/auth/service';
import type { IAuthProvider } from '$lib/server/auth/types';
import {
	NotAuthenticatedError,
	NotOrganizerError,
	UserNotFoundError
} from '$lib/server/auth/types';
import { z } from 'zod';

export const routeSchema = z.object({
	id: z.coerce.number().int().positive()
});

export const endpoint_GET: EndpointHandler<{
	userService: UserService;
	authProvider: IAuthProvider;
	params: z.infer<typeof routeSchema>;
}> = async ({ userService, authProvider, params }) => {
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
		return user;
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
