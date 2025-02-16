import type { IAuthProvider } from '$lib/server/auth/types';
import { db } from '$lib/server/db';
import type { EndpointHandler } from '$lib/server/endpoints';
import { pointTransactionsTable } from '$lib/server/db/schema';
import { eq, and, not, sql } from 'drizzle-orm';

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

	const totalResult = await db
		.select({ total: sql<number>`COALESCE(SUM(${pointTransactionsTable.amount}), 0)` })
		.from(pointTransactionsTable)
		.where(
			and(
				eq(pointTransactionsTable.userId, userId),
				not(eq(pointTransactionsTable.status, 'rejected')),
				not(eq(pointTransactionsTable.status, 'deleted'))
			)
		);
	const totalPoints = totalResult[0]?.total ?? 0;

	return { ...user, totalPoints };
};
