import type { EndpointHandler } from '$lib/server/endpoints';
import type { EventsService } from '$lib/server/events/service';
import {
	NotAuthenticatedError,
	NotOrganizerError,
	AlreadyCheckedInError,
	EventNotFoundError,
	UserNotFoundError
} from '$lib/server/events/types';
import { z } from 'zod';

export const postSchema = z.object({
	userId: z.number().int().positive()
});

export const routeSchema = z.object({
	id: z.coerce.number().int().positive()
});

export const endpoint_POST: EndpointHandler<{
	eventsService: EventsService;
	body: z.infer<typeof postSchema>;
	params: z.infer<typeof routeSchema>;
}> = async ({ eventsService, body, params }) => {
	const { id: eventId } = params;
	const { userId } = body;

	try {
		await eventsService.checkInUser(eventId, userId);
		return { success: true };
	} catch (error) {
		// Map domain errors to HTTP responses
		if (error instanceof NotAuthenticatedError || error instanceof NotOrganizerError) {
			return {
				error: error.message,
				status: 401
			};
		}
		if (error instanceof EventNotFoundError || error instanceof UserNotFoundError) {
			return {
				error: error.message,
				status: 404
			};
		}
		if (error instanceof AlreadyCheckedInError) {
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
