import type { AuthObject } from '@clerk/backend';
import type { IAuthProvider } from './types';
import { ClerkAuthState } from './clerk-state';
import { AuthService } from './service';
import { PostgresUserRepository } from './postgres';

export class ClerkAuthProvider implements IAuthProvider {
	private service: AuthService;

	constructor(auth: AuthObject) {
		const state = new ClerkAuthState(auth);
		const repo = new PostgresUserRepository();
		this.service = new AuthService(state, repo);
	}

	isAuthenticated(): boolean {
		return this.service.isAuthenticated();
	}

	async getUserId(): Promise<number | null> {
		return await this.service.getUserId();
	}

	async isOrganizer(): Promise<boolean> {
		return await this.service.isOrganizer();
	}

	async getCurrentUser() {
		return await this.service.getCurrentUser();
	}

	async getUserById(id: number) {
		return await this.service.getUserById(id);
	}
}
