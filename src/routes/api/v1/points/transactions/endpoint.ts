import type { IAuthProvider } from '$lib/server/auth/types';
import type { EndpointHandler } from '$lib/server/endpoints';
import type { IPointsRepository } from '$lib/server/points/types';

export const endpoint_GET: EndpointHandler<{
	pointsRepository: IPointsRepository;
	authProvider: IAuthProvider;
}> = async ({ pointsRepository, authProvider }) => {
	if (!(await authProvider.isOrganizer())) {
		return {
			success: false,
			error: 'Unauthorized'
		};
	}

	const transactions = await pointsRepository.getTransactions();

	return {
		success: true,
		data: transactions
	};
};
