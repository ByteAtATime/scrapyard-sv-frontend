import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PointTransaction, PostgresPointsRepo } from '$lib/server/points';
import type { PointTransactionData } from '$lib/server/db/types';
import { ClerkAuthProvider } from '$lib/server/auth';

export const load: PageServerLoad = async ({ params, locals }) => {
	const pointsRepo = new PostgresPointsRepo();

	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid user ID');
	}

	const authProvider = new ClerkAuthProvider(locals.auth);
	if (!(await authProvider.isOrganizer())) {
		throw error(403, 'Forbidden');
	}

	const rawTransactions = await pointsRepo.getTransactionsByUser(id);
	const transactionPromises = await Promise.allSettled(
		rawTransactions
			.filter((t: PointTransactionData) => t.status !== 'deleted')
			.map((t) => new PointTransaction(t, authProvider))
			.map((t) => t.toJson())
	);

	const user = await authProvider.getUserById(id);

	if (!user) {
		throw error(404, 'User not found');
	}

	const totalPoints = await pointsRepo.getTotalPoints(id);

	return {
		transactions: transactionPromises
			.map((t) => (t.status === 'fulfilled' ? t.value : null))
			.filter((t) => !!t),
		user,
		totalPoints
	};
};
