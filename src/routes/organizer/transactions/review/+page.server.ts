import { superValidate } from 'sveltekit-superforms/server';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { zod } from 'sveltekit-superforms/adapters';
import { approveSchema, rejectSchema, deleteSchema } from './schema';
import { PointsService, PostgresPointsRepo } from '$lib/server/points';
import { ClerkAuthProvider } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	const pointRepo = new PostgresPointsRepo();
	const authProvider = new ClerkAuthProvider(locals.auth);

	const pointsService = new PointsService(pointRepo, authProvider);
	const transactionsData = await pointsService.getTransactions();

	const approveForm = await superValidate(zod(approveSchema));
	const rejectForm = await superValidate(zod(rejectSchema));
	const deleteForm = await superValidate(zod(deleteSchema));

	const transactionsJson = await Promise.allSettled(transactionsData.map((t) => t.toJson()));
	const transactions = transactionsJson
		.map((t) => (t.status === 'fulfilled' ? t.value : null))
		.filter((t) => !!t);

	const sortedTransactions = transactions.sort((a, b) => {
		if (a.status === 'pending' && b.status !== 'pending') return -1;
		if (a.status !== 'pending' && b.status === 'pending') return 1;
		return b.createdAt.getTime() - a.createdAt.getTime();
	});

	return {
		transactions: sortedTransactions,
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
					status: 'approved',
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
					status: 'rejected',
					transactionId: form.data.id,
					rejectionReason: form.data.reason
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
					status: 'deleted',
					transactionId: form.data.id
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
