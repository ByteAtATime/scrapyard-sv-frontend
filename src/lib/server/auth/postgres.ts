import { db } from '$lib/server/db';
import { usersTable } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { IUserRepository, CreateUserData } from './types';
import type { UserData } from '$lib/server/db/types';

export class PostgresUserRepository implements IUserRepository {
	async findByAuthId(provider: 'clerk', providerId: string): Promise<UserData | null> {
		const users = await db
			.select()
			.from(usersTable)
			.where(and(eq(usersTable.authProvider, provider), eq(usersTable.authProviderId, providerId)));
		return users[0] ?? null;
	}

	async findById(id: number): Promise<UserData | null> {
		const users = await db.select().from(usersTable).where(eq(usersTable.id, id));
		return users[0] ?? null;
	}

	async create(data: CreateUserData): Promise<UserData> {
		const [user] = await db
			.insert(usersTable)
			.values({
				name: data.name,
				email: data.email,
				authProvider: 'clerk' as const,
				authProviderId: data.authProviderId,
				isOrganizer: false
			})
			.returning();
		return user;
	}
}
