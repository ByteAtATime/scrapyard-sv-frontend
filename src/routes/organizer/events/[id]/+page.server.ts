import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms/server';
import { z } from 'zod';
import { PostgresEventsRepository } from '$lib/server/events/postgres';
import { ClerkAuthProvider } from '$lib/server/auth/clerk';
import { zod } from 'sveltekit-superforms/adapters';

const checkInSchema = z.object({
	userId: z.number().gt(0, 'User ID is required')
});

export const load: PageServerLoad = async ({ params, locals }) => {
	const eventsRepository = new PostgresEventsRepository();
	const authProvider = new ClerkAuthProvider(locals.auth);

	const eventId = parseInt(params.id);
	if (isNaN(eventId)) {
		throw error(400, 'Invalid event ID');
	}

	const event = await eventsRepository.getEventById(eventId);
	if (!event) {
		throw error(404, 'Event not found');
	}

	const attendance = await eventsRepository.getAttendanceByEvent(eventId);
	const attendanceWithNames = await Promise.all(
		attendance.map(async (record) => {
			const user = await authProvider.getUserById(record.userId);
			const checkedInByUser = await authProvider.getUserById(record.checkedInBy);
			return {
				userId: record.userId,
				userName: user?.name ?? 'Unknown',
				checkInTime: record.checkInTime.toISOString(),
				checkedInBy: checkedInByUser?.name ?? 'Unknown'
			};
		})
	);

	return {
		event: {
			id: event.id,
			name: event.name,
			description: event.description,
			time: event.time.toISOString(),
			attendancePoints: event.attendancePoints
		},
		attendance: attendanceWithNames,
		form: await superValidate(zod(checkInSchema))
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const authProvider = new ClerkAuthProvider(locals.auth);
		if (!(await authProvider.isOrganizer())) {
			throw error(403, 'Only organizers can check in users');
		}

		const form = await superValidate(request, zod(checkInSchema));

		const eventId = parseInt(params.id);
		if (isNaN(eventId)) {
			return fail(400, { form, errors: { userId: ['Invalid event ID'] } });
		}

		if (!form.valid) {
			return fail(400, { form });
		}

		if (isNaN(form.data.userId)) {
			form.errors.userId = ['Invalid user ID'];
			return fail(400, { form });
		}

		const eventsRepository = new PostgresEventsRepository();

		try {
			const organizerId = await authProvider.getUserId();
			if (!organizerId) {
				return fail(401, { form });
			}
			await eventsRepository.checkInUser(eventId, form.data.userId, organizerId);
			return { form };
		} catch (e) {
			return fail(400, {
				form,
				error: {
					message: e instanceof Error ? e.message : 'Failed to check in user'
				}
			});
		}
	}
};
