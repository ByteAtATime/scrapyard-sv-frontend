import { vi } from 'vitest';
import type { IAuthProvider } from './types';

export class MockAuthProvider implements IAuthProvider {
	isAuthenticated = vi.fn();
	getUserId = vi.fn();
	isOrganizer = vi.fn();
	getCurrentUser = vi.fn();

	getUserById = vi.fn();

	public mockSignedIn() {
		this.isAuthenticated.mockResolvedValue(true);
		this.getUserId.mockResolvedValue(1);
		this.isOrganizer.mockResolvedValue(false);

		return this;
	}

	public mockSignedOut() {
		this.isAuthenticated.mockResolvedValue(false);
		this.getUserId.mockResolvedValue(null);
		this.isOrganizer.mockResolvedValue(false);

		return this;
	}

	public mockOrganizer() {
		this.mockSignedIn();
		this.isOrganizer.mockResolvedValue(true);

		return this;
	}
}
