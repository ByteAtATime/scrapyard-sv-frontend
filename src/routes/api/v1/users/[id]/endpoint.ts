import type { IAuthProvider } from '$lib/server/auth/types';
import { db } from '$lib/server/db';
import type { EndpointHandler } from '$lib/server/endpoints';

type RouteParams = {
	id: string;
};

export const endpoint_GET: EndpointHandler<{
	authProvider: IAuthProvider;
	params: RouteParams;
}> = async ({ authProvider, params }) => {
	if (!(await authProvider.isOrganizer())) {
		return {
			success: false,
			error: 'Unauthorized',
			status: 401
		};
	}

	const userId = parseInt(params.id);
	if (isNaN(userId)) {
		return {
			success: false,
			error: 'Invalid user ID',
			status: 400
		};
	}

	const user = await db.query.usersTable.findFirst({
		where: (users, { eq }) => eq(users.id, userId)
	});

	if (!user) {
		return {
			success: false,
			error: 'User not found',
			status: 404
		};
	}

	return user;
};
