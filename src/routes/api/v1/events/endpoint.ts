import type { EndpointHandler } from '$lib/server/endpoints';
import type { EventsService } from '$lib/server/events/service';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/events/types';
import { z } from 'zod';

export const postSchema = z.object({
	name: z.string().min(1),
	description: z.string(),
	time: z.coerce.date(),
	attendancePoints: z.number().int().positive(),
	contactOrganizerId: z.number().nullable()
});

export const endpoint_GET: EndpointHandler<{
	eventsService: EventsService;
}> = async ({ eventsService }) => {
	try {
		return await eventsService.getAllEvents();
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

export const endpoint_POST: EndpointHandler<{
	eventsService: EventsService;
	body: z.infer<typeof postSchema>;
}> = async ({ eventsService, body }) => {
	try {
		const eventId = await eventsService.createEvent(body);
		return { id: eventId };
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
