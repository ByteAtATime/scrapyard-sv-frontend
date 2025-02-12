import type { PageServerLoad } from './$types';
import { ClerkAuthProvider } from '$lib/server/auth/clerk';
import { pointsRepo } from '$lib/server/points';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		return { error: 'Invalid user ID' };
	}

	const authProvider = new ClerkAuthProvider(locals.auth);
	const user = await authProvider.getUserById(id);

	if (!user) {
		return { error: 'User not found' };
	}

	const rawTransactions = await pointsRepo.getTransactionsByUser(id);
	const transactions = rawTransactions.filter((t) => t.status !== 'deleted');

	return { user, transactions };
};
