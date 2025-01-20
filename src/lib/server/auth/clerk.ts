import type { IAuthProvider } from './types';
import type { AuthObject } from '@clerk/backend';
import { db } from '$lib/server/db';
import { usersTable } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { clerkClient } from 'clerk-sveltekit/server';

export class ClerkAuthProvider implements IAuthProvider {
	constructor(private auth: AuthObject) {}

	isAuthenticated() {
		return !!this.auth.userId;
	}

	async getUserId() {
		const clerkUserId = this.auth.userId;

		if (!clerkUserId) {
			return null;
		}

		const ids = await db
			.select({ id: usersTable.id })
			.from(usersTable)
			.where(and(eq(usersTable.authProvider, 'clerk'), eq(usersTable.authProviderId, clerkUserId)))
			.execute();

		if (ids.length === 0) {
			const clerkUser = await clerkClient.users.getUser(clerkUserId);
			await db.insert(usersTable).values({
				name: clerkUser.fullName ?? clerkUser.firstName + ' ' + clerkUser.lastName,
				email: clerkUser.emailAddresses[0].emailAddress,
				authProvider: 'clerk',
				authProviderId: clerkUserId
			});
			return null;
		}

		return ids[0].id;
	}

	async isOrganizer() {
		const clerkUserId = this.auth.userId;

		if (!clerkUserId) {
			return false;
		}

		const user = await db.query.usersTable.findFirst({
			where: eq(usersTable.authProviderId, clerkUserId)
		});

		if (!user) {
			const clerkUser = await clerkClient.users.getUser(clerkUserId);
			await db.insert(usersTable).values({
				name: clerkUser.fullName ?? clerkUser.firstName + ' ' + clerkUser.lastName,
				email: clerkUser.emailAddresses[0].emailAddress,
				authProvider: 'clerk',
				authProviderId: clerkUserId
			});
			return false;
		}

		return user.isOrganizer ?? false;
	}

	async getUserById(id: number) {
		const user = await db.query.usersTable.findFirst({
			where: eq(usersTable.id, id)
		});

		return user ?? null;
	}
}
