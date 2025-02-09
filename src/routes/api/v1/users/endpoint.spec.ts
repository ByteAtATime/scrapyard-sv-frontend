import { describe, it, expect, vi, beforeEach } from 'vitest';
import { endpoint_GET } from './endpoint';
import { MockAuthProvider } from '$lib/server/auth/mock';

const mockDb = vi.hoisted(() => ({
	query: {
		usersTable: {
			findMany: vi.fn()
		}
	}
}));

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe('GET /api/v1/users', () => {
	beforeEach(() => {
		mockDb.query.usersTable.findMany.mockClear();
	});

	it('should return users if organizer', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const mockUsers = [
			{ id: 1, name: 'Test User', email: 'test@example.com', totalPoints: 0, isOrganizer: false }
		];
		mockDb.query.usersTable.findMany.mockResolvedValue(mockUsers);

		const result = await endpoint_GET({ authProvider });

		expect(result).toEqual(mockUsers);
		expect(mockDb.query.usersTable.findMany).toHaveBeenCalled();
	});

	it('should return unauthorized if not organizer', async () => {
		const authProvider = new MockAuthProvider().mockSignedIn();

		const result = await endpoint_GET({ authProvider });

		expect(result).toEqual({ success: false, error: 'Unauthorized', status: 401 });
		expect(mockDb.query.usersTable.findMany).not.toHaveBeenCalled();
	});
});
