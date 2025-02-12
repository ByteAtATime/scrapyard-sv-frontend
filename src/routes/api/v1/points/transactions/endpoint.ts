import type { IAuthProvider } from '$lib/server/auth/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import type { IPointsRepo } from '$lib/server/points/types';

export const endpoint_GET: EndpointHandler<{
	pointsRepo: IPointsRepo;
	authProvider: IAuthProvider;
}> = async ({ pointsRepo, authProvider }) => {
	if (!(await authProvider.isOrganizer())) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

	const transactions = await pointsRepo.getTransactions();

	return transactions;
};
