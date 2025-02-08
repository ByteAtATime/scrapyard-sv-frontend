import type { IAuthProvider } from '$lib/server/auth/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import type { IEventsRepository } from '$lib/server/events/types';
import { Event } from '$lib/server/events/event';
import { z } from 'zod';

export const endpoint_GET: EndpointHandler<{
	eventsRepository: IEventsRepository;
	authProvider: IAuthProvider;
}> = async ({ eventsRepository, authProvider }) => {
	const events = await eventsRepository.getEvents();
	const settled = await Promise.allSettled(
		events.map((event) => new Event(event, authProvider).toJson())
	);

	return settled
		.map((result) => (result.status === 'fulfilled' ? result.value : null))
		.filter(Boolean);
};

export const postSchema = z.object({
	name: z.string(),
	description: z.string(),
	time: z.coerce.date(),
	attendancePoints: z.number(),
	contactOrganizerId: z.number().nullable()
});

export const endpoint_POST: EndpointHandler<{
	authProvider: IAuthProvider;
	eventsRepository: IEventsRepository;
	body: z.infer<typeof postSchema>;
}> = async ({ authProvider, eventsRepository, body }) => {
	if (!(await authProvider.isOrganizer())) {
		return {
			status: 403,
			error: 'Unauthorized'
		};
	}

	const event = new Event(
		{
			name: body.name,
			description: body.description,
			attendancePoints: body.attendancePoints,
			time: body.time,
			contactOrganizerId: body.contactOrganizerId,

			// ignored
			id: 0
		},
		authProvider
	);

	const eventId = await eventsRepository.createEvent(event);

	return {
		id: eventId
	};
};
