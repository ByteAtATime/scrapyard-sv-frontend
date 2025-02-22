import { describe, it, expect, vi } from 'vitest';
import { endpoint_GET } from './endpoint';
import { MockAuthProvider } from '$lib/server/auth/mock';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe.skip('GET /api/v1/users/[id]', () => {
	it('should return 401 if not organizer', async () => {
		const authProvider = new MockAuthProvider().mockSignedIn();
		const params = { id: '1' };

		const result = await endpoint_GET({ authProvider, params });

		expect(result).toEqual({ success: false, error: 'Unauthorized', status: 401 });
		expect(mockDb.query.usersTable.findFirst).not.toHaveBeenCalled();
	});

	it('should return 400 if id is invalid', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const params = { id: 'invalid-id' };

		const result = await endpoint_GET({ authProvider, params });

		expect(result).toEqual({ success: false, error: 'Invalid user ID', status: 400 });
		expect(mockDb.query.usersTable.findFirst).not.toHaveBeenCalled();
	});

	it('should return 404 if user not found', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const params = { id: '1' };
		mockDb.query.usersTable.findFirst.mockResolvedValue(undefined);

		const result = await endpoint_GET({ authProvider, params });

		expect(result).toEqual({ success: false, error: 'User not found', status: 404 });
		expect(mockDb.query.usersTable.findFirst).toHaveBeenCalled();
	});

	it('should return user data if organizer and user found', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const params = { id: '1' };
		const mockUser = {
			id: 1,
			name: 'Test User',
			email: 'test@example.com',
			totalPoints: 0,
			isOrganizer: false
		};
		mockDb.query.usersTable.findFirst.mockResolvedValue(mockUser);

		const result = await endpoint_GET({ authProvider, params });

		expect(result).toEqual(mockUser);
		expect(mockDb.query.usersTable.findFirst).toHaveBeenCalled();
	});
});
