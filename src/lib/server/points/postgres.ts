import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usersTable } from '$lib/server/db/schema';
import type { IPointsRepository } from './types';

export class PostgresPointsRepository implements IPointsRepository {
	async getTotalPoints(userId: number): Promise<number> {
		const result = await db.query.usersTable.findFirst({
			where: eq(usersTable.id, userId),
			columns: {
				totalPoints: true
			}
		});

		if (!result || !result.totalPoints) {
			throw new Error('User not found');
		}

		return result.totalPoints;
	}
}
