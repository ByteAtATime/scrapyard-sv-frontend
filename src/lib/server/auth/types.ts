import type { UserData } from '$lib/server/db/types';

export interface IAuthProvider {
	isAuthenticated: () => boolean;
	getUserId: () => Promise<number | null>;
	isOrganizer: () => Promise<boolean>;

	/**
	 * User has to be an organizer to get a user
	 */
	getUserById: (id: number) => Promise<UserData | null>;
}
