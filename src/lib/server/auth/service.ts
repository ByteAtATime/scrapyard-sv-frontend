import type { IAuthProvider, IAuthState, IUserRepository } from './types';
import type { UserData } from '$lib/server/db/types';
import { User } from './user';
import { clerkClient } from 'clerk-sveltekit/server';

export class AuthService implements IAuthProvider {
	constructor(
		private readonly authState: IAuthState,
		private readonly userRepo: IUserRepository
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

		return new User(user, this);
	}

	async getUserById(id: number): Promise<UserData | null> {
		return await this.userRepo.findById(id);
	}

	private async createUserFromClerk(clerkUserId: string): Promise<void> {
		const clerkUser = await clerkClient.users.getUser(clerkUserId);
		await this.userRepo.create({
			name: clerkUser.fullName ?? clerkUser.firstName + ' ' + clerkUser.lastName,
			email: clerkUser.emailAddresses[0].emailAddress,
			authProvider: 'clerk',
			authProviderId: clerkUserId
		});
	}
}
