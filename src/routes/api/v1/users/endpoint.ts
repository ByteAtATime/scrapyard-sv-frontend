import type { EndpointHandler } from '$lib/server/endpoints';
import type { UserService } from '$lib/server/auth/service';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/auth/types';
import { z } from 'zod';

export const querySchema = z.object({
	includePoints: z.coerce.boolean().optional().default(false)
});

export const endpoint_GET: EndpointHandler<{
	userService: UserService;
	query: z.infer<typeof querySchema>;
}> = async ({ userService, query }) => {
	try {
		const users = await userService.getAllUsers(query.includePoints);
		return users;
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
