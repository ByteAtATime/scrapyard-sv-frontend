import type { UserData } from '$lib/server/db/types';
import type { User } from './user';

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
