import type { IAuthProvider } from '$lib/server/auth/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { eventAttendanceTable } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { IEventsRepo } from '$lib/server/events/types';

export const postSchema = z.object({
	userId: z.number()
});

export const endpoint_POST: EndpointHandler<{
	authProvider: IAuthProvider;
	eventsRepo: IEventsRepo;
	body: z.infer<typeof postSchema>;
	params: { id: string };
}> = async ({ authProvider, body, params, eventsRepo }) => {
	if (!(await authProvider.isOrganizer())) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

	const authorId = await authProvider.getUserId();

	if (!authorId) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

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

	await eventsRepo.checkInUser(eventId, userId, authorId);

	return { success: true };
};
