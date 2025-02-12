import { describe, it, expect, vi } from 'vitest';
import { endpoint_POST } from './endpoint';
import { MockAuthProvider } from '$lib/server/auth/mock';
import { MockEventsRepo } from '$lib/server/events/mock';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

describe('POST /api/v1/events/[id]/check-in', () => {
	it('should return success if user check-in is successful', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const eventsRepo = new MockEventsRepo();
		const params = { id: '1' };
		const body = { userId: 1 };
		mockDb.select().from().where().limit.mockResolvedValue([]);

		const result = await endpoint_POST({ authProvider, eventsRepo, body, params });

		expect(result).toEqual({ success: true });
		expect(eventsRepo.checkInUser).toHaveBeenCalledWith(1, 1, 1);
	});

	it('should return error if event ID is invalid', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const eventsRepo = new MockEventsRepo();
		const params = { id: 'invalid-id' };
		const body = { userId: 1 };

		const result = await endpoint_POST({ authProvider, eventsRepo, body, params });

		expect(result).toEqual({ success: false, error: 'Invalid event ID' });
		expect(eventsRepo.checkInUser).not.toHaveBeenCalled();
	});

	it('should return error if user is already checked in', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		const eventsRepo = new MockEventsRepo();
		const params = { id: '1' };
		const body = { userId: 1 };
		mockDb
			.select()
			.from()
			.where()
			.limit.mockResolvedValue([{ eventId: 1, userId: 1 }]);

		const result = await endpoint_POST({ authProvider, eventsRepo, body, params });

		expect(result).toEqual({ success: false, error: 'User is already checked in' });
		expect(eventsRepo.checkInUser).not.toHaveBeenCalled();
	});

	it('should return unauthorized if no author ID', async () => {
		const authProvider = new MockAuthProvider().mockOrganizer();
		authProvider.getUserId.mockResolvedValue(null);
		const eventsRepo = new MockEventsRepo();
		const params = { id: '1' };
		const body = { userId: 1 };

		const result = await endpoint_POST({ authProvider, eventsRepo, body, params });

		expect(result).toEqual({ success: false, error: 'Unauthorized' });
		expect(eventsRepo.checkInUser).not.toHaveBeenCalled();
	});
});
