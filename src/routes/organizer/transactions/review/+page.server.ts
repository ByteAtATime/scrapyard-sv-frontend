import { superValidate } from 'sveltekit-superforms/server';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { zod } from 'sveltekit-superforms/adapters';
import { approveSchema, rejectSchema, deleteSchema } from './schema';
import { pointTransactionJsonSchema } from '$lib/server/points/transaction';
import { z } from 'zod';

export const load: PageServerLoad = async ({ fetch }) => {
	const response = await fetch('/api/v1/points/transactions');
	const transactions = z
		.object({ data: z.object({ data: z.array(pointTransactionJsonSchema) }) })
		.parse(await response.json());

	const approveForm = await superValidate(zod(approveSchema));
	const rejectForm = await superValidate(zod(rejectSchema));
	const deleteForm = await superValidate(zod(deleteSchema));

	return {
		transactions: transactions.data,
		approveForm,
		rejectForm,
		deleteForm
	};
};

export const actions: Actions = {
	approve: async ({ request, fetch }) => {
		const form = await superValidate(request, zod(approveSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch('/api/v1/points/transactions/review', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					action: 'approve',
					transactionId: form.data.id
				})
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				return fail(response.status, {
					form,
					error: 'Failed to approve transaction. Please try again.',
					description: data.error
				});
			}

			return { form };
		} catch (e) {
			console.error(e);
			const description = e instanceof Error ? e.message : undefined;

			return fail(500, {
				form,
				error: 'An unexpected error occurred. Please try again.',
				description
			});
		}
	},
	reject: async ({ request, fetch }) => {
		const form = await superValidate(request, zod(rejectSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch('/api/v1/points/transactions/review', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					action: 'reject',
					transactionId: form.data.id,
					reason: form.data.reason
				})
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				return fail(response.status, {
					form,
					error: 'Failed to reject transaction. Please try again.',
					description: data.error
				});
			}

			return { form };
		} catch (e) {
			console.error(e);
			const description = e instanceof Error ? e.message : undefined;

			return fail(500, {
				form,
				error: 'An unexpected error occurred. Please try again.',
				description
			});
		}
	},
	delete: async ({ request, fetch }) => {
		const form = await superValidate(request, zod(deleteSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch('/api/v1/points/transactions/review', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'delete',
					transactionId: form.data.id,
					status: 'deleted'
				})
			});
			const data = await response.json();
			if (!response.ok || !data.success) {
				return fail(response.status, {
					form,
					error: 'Failed to delete transaction. Please try again.',
					description: data.error
				});
			}
			return { form };
		} catch (e) {
			console.error(e);
			const description = e instanceof Error ? e.message : undefined;
			return fail(500, {
				form,
				error: 'An unexpected error occurred. Please try again.',
				description
			});
		}
	}
};
