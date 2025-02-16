import type { User } from './user';
import type { UserData } from '$lib/server/db/types';

export interface IAuthState {
	userId: string | null;
	isAuthenticated: boolean;
}

export interface CreateUserData {
	name: string;
	email: string;
	authProvider: string;
	authProviderId: string;
}

export interface IUserRepository {
	findByAuthId(provider: string, providerId: string): Promise<UserData | null>;
	findById(id: number): Promise<UserData | null>;
	create(data: CreateUserData): Promise<UserData>;
}

export interface IAuthProvider {
	isAuthenticated: () => boolean;
	getUserId: () => Promise<number | null>;
	isOrganizer: () => Promise<boolean>;
	getCurrentUser: () => Promise<User | null>;

	/**
	 * User has to be an organizer to get a user
	 */
	getUserById: (id: number) => Promise<UserData | null>;
}
