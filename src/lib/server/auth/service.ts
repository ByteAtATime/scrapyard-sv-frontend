import type { UserData } from '../db/types';
import type { IAuthProvider, IAuthState, IUserRepo } from './types';
import { NotAuthenticatedError, NotOrganizerError, UserNotFoundError } from './types';
import { User } from './user';
import { clerkClient } from 'clerk-sveltekit/server';
import type { User as ClerkUser } from '@clerk/backend';
import { db } from '../db';
import { usersTable, pointTransactionsTable } from '../db/schema';
import { eq, and, not, sql } from 'drizzle-orm';

export interface IUserService {
	getUserById(id: number): Promise<UserData>;
	getAllUsers(includePoints?: boolean): Promise<UserData[]>;
}

export class AuthService implements IAuthProvider {
	constructor(
		private readonly authState: IAuthState,
		private readonly userRepo: IUserRepo
	) {}

	isAuthenticated(): boolean {
		return this.authState.isAuthenticated;
	}

	async getUserId(): Promise<number | null> {
		const clerkUserId = this.authState.userId;
		if (!clerkUserId) return null;

		const user = await this.userRepo.findByAuthId('clerk', clerkUserId);
		if (!user) {
			await this.createUserFromClerk(clerkUserId);
			return null;
		}

		return user.id;
	}

	async isOrganizer(): Promise<boolean> {
		const clerkUserId = this.authState.userId;
		if (!clerkUserId) return false;

		const user = await this.userRepo.findByAuthId('clerk', clerkUserId);
		if (!user) {
			await this.createUserFromClerk(clerkUserId);
			return false;
		}

		return user.isOrganizer ?? false;
	}

	async getCurrentUser(): Promise<User | null> {
		const clerkUserId = this.authState.userId;
		if (!clerkUserId) return null;

		const user = await this.userRepo.findByAuthId('clerk', clerkUserId);
		if (!user) {
			await this.createUserFromClerk(clerkUserId);
			return null;
		}

		return new User(user);
	}

	async getUserById(id: number): Promise<UserData | null> {
		return await this.userRepo.findById(id);
	}

	private async createUserFromClerk(clerkUserId: string): Promise<void> {
		let clerkUser: ClerkUser;
		try {
			clerkUser = await clerkClient.users.getUser(clerkUserId);
		} catch (error) {
			console.error('Error creating user from Clerk', error);
			return;
		}
		await this.userRepo.create({
			name: clerkUser.fullName ?? clerkUser.firstName + ' ' + clerkUser.lastName,
			email: clerkUser.emailAddresses[0].emailAddress,
			authProvider: 'clerk',
			authProviderId: clerkUserId
		});
	}
}

export class UserService implements IUserService {
	constructor(private readonly authProvider: IAuthProvider) {}

	async getUserById(id: number): Promise<UserData> {
		const user = await db.query.usersTable.findFirst({
			where: eq(usersTable.id, id)
		});

		if (!user) {
			throw new UserNotFoundError(id);
		}

		return user;
	}

	async getAllUsers(includePoints = false): Promise<UserData[]> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		const users = await db.query.usersTable.findMany();

		if (includePoints) {
			// Calculate total points for each user
			const pointsPromises = users.map(async (user) => {
				const totalResult = await db
					.select({ total: sql<number>`COALESCE(SUM(${pointTransactionsTable.amount}), 0)` })
					.from(pointTransactionsTable)
					.where(
						and(
							eq(pointTransactionsTable.userId, user.id),
							not(eq(pointTransactionsTable.status, 'rejected')),
							not(eq(pointTransactionsTable.status, 'deleted'))
						)
					);
				return {
					...user,
					totalPoints: totalResult[0]?.total ?? 0
				};
			});

			return Promise.all(pointsPromises);
		}

		return users;
	}
}
