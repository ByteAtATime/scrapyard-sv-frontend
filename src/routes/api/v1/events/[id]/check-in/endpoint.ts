import type { IAuthProvider } from '$lib/server/auth/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { eventAttendanceTable } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { IEventsRepository } from '$lib/server/events/types';

export const postSchema = z.object({
	userId: z.number()
});

export const endpoint_POST: EndpointHandler<{
	authProvider: IAuthProvider;
	eventsRepository: IEventsRepository;
	body: z.infer<typeof postSchema>;
	params: { id: string };
}> = async ({ authProvider, body, params, eventsRepository }) => {
	const eventId = parseInt(params.id);
	if (isNaN(eventId)) {
		return {
			success: false,
			error: 'Invalid event ID'
		};
	}

	const { userId } = body;

	const existing = await db
		.select()
		.from(eventAttendanceTable)
		.where(and(eq(eventAttendanceTable.eventId, eventId), eq(eventAttendanceTable.userId, userId)))
		.limit(1);

	if (existing.length > 0) {
		return {
			success: false,
			error: 'User is already checked in'
		};
	}

	const authorId = await authProvider.getUserId();
	if (!authorId) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

	await eventsRepository.checkInUser(eventId, userId, authorId);

	return { success: true };
};
