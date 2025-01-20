export interface IAuthProvider {
	isAuthenticated: () => boolean;
	getUserId: () => Promise<number | null>;
	isOrganizer: () => Promise<boolean>;
}
