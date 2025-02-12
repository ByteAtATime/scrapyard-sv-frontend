import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate } from 'sveltekit-superforms/server';
import { createEventSchema } from './schema';
import { PostgresEventsRepo } from '$lib/server/events/postgres';
import { zod } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async () => {
	const eventsRepo = new PostgresEventsRepo();
	const events = await eventsRepo.getEvents();

	return {
		events: events.map((event) => ({
			id: event.id,
			name: event.name,
			description: event.description,
			time: event.time.toISOString(),
			attendancePoints: event.attendancePoints
		})),
		form: await superValidate(zod(createEventSchema))
	};
};

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		const form = await superValidate(request, zod(createEventSchema));

		if (!form.valid) {
			console.error(form);
			return fail(400, { form });
		}

		try {
			const res = await fetch('/api/v1/events', {
				method: 'POST',
				body: JSON.stringify({
					...form.data,
					time: new Date(form.data.time).toISOString()
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				const data = await res.json();

				console.error(data);
				return fail(500, { form, error: { message: data.error } });
			}

			const data = await res.json();

			if (data.success) {
				return message(form, { id: data.id });
			}
		} catch (e) {
			console.error(e);
			return fail(500, { form, error: { message: 'Failed to create event' } });
		}
	}
};
