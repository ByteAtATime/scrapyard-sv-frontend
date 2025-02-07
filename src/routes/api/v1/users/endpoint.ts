import type { IAuthProvider } from '$lib/server/auth/types';
import { db } from '$lib/server/db';
import type { EndpointHandler } from '$lib/server/endpoints';

export const endpoint_GET: EndpointHandler<{
	authProvider: IAuthProvider;
}> = async ({ authProvider }) => {
	if (!(await authProvider.isOrganizer())) {
		return {
			success: false,
			error: 'Unauthorized',
			status: 401
		};
	}

	const users = await db.query.usersTable.findMany();
	return users;
};
