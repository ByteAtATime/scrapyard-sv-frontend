import type { AuthObject } from '@clerk/backend';
import type { IAuthState } from './types';

export class ClerkAuthState implements IAuthState {
	constructor(private auth: AuthObject) {}

	get userId(): string | null {
		return this.auth.userId ?? null;
	}

	get isAuthenticated(): boolean {
		return !!this.auth.userId;
	}
}
