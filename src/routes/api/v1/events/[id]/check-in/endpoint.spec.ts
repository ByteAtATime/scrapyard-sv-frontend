import { describe, it, expect, vi } from 'vitest';
import { endpoint_POST } from './endpoint';
import type { EventsService } from '$lib/server/events/service';
import {
	NotAuthenticatedError,
	NotOrganizerError,
	AlreadyCheckedInError,
	EventNotFoundError,
	UserNotFoundError
} from '$lib/server/events/types';

describe('POST /api/v1/events/[id]/check-in', () => {
	it('should return success when check-in is successful', async () => {
		const eventsService = {
			checkInUser: vi.fn().mockResolvedValue(undefined)
		} as unknown as EventsService;

		const body = { userId: 1 };
		const params = { id: 123 };

		const result = await endpoint_POST({ eventsService, body, params });

		expect(result).toEqual({ success: true });
		expect(eventsService.checkInUser).toHaveBeenCalledWith(123, 1);
	});

	it('should return 401 when user is not authenticated', async () => {
		const eventsService = {
			checkInUser: vi.fn().mockRejectedValue(new NotAuthenticatedError())
		} as unknown as EventsService;

		const body = { userId: 1 };
		const params = { id: 123 };

		const result = await endpoint_POST({ eventsService, body, params });

		expect(result).toEqual({
			error: 'User is not authenticated',
			status: 401
		});
		expect(eventsService.checkInUser).toHaveBeenCalledWith(123, 1);
	});

	it('should return 401 when user is not an organizer', async () => {
		const eventsService = {
			checkInUser: vi.fn().mockRejectedValue(new NotOrganizerError())
		} as unknown as EventsService;

		const body = { userId: 1 };
		const params = { id: 123 };

		const result = await endpoint_POST({ eventsService, body, params });

		expect(result).toEqual({
			error: 'User is not an organizer',
			status: 401
		});
		expect(eventsService.checkInUser).toHaveBeenCalledWith(123, 1);
	});

	it('should return 404 when event is not found', async () => {
		const eventsService = {
			checkInUser: vi.fn().mockRejectedValue(new EventNotFoundError(999))
		} as unknown as EventsService;

		const body = { userId: 1 };
		const params = { id: 999 };

		const result = await endpoint_POST({ eventsService, body, params });

		expect(result).toEqual({
			error: 'Event with ID 999 not found',
			status: 404
		});
		expect(eventsService.checkInUser).toHaveBeenCalledWith(999, 1);
	});

	it('should return 404 when user is not found', async () => {
		const eventsService = {
			checkInUser: vi.fn().mockRejectedValue(new UserNotFoundError(999))
		} as unknown as EventsService;

		const body = { userId: 999 };
		const params = { id: 123 };

		const result = await endpoint_POST({ eventsService, body, params });

		expect(result).toEqual({
			error: 'User with ID 999 not found',
			status: 404
		});
		expect(eventsService.checkInUser).toHaveBeenCalledWith(123, 999);
	});

	it('should return 400 when user is already checked in', async () => {
		const eventsService = {
			checkInUser: vi.fn().mockRejectedValue(new AlreadyCheckedInError(1, 123))
		} as unknown as EventsService;

		const body = { userId: 1 };
		const params = { id: 123 };

		const result = await endpoint_POST({ eventsService, body, params });

		expect(result).toEqual({
			error: 'User 1 is already checked in to event 123',
			status: 400
		});
		expect(eventsService.checkInUser).toHaveBeenCalledWith(123, 1);
	});

	it('should return 500 when unexpected error occurs', async () => {
		const eventsService = {
			checkInUser: vi.fn().mockRejectedValue(new Error('Database error'))
		} as unknown as EventsService;

		const body = { userId: 1 };
		const params = { id: 123 };

		const result = await endpoint_POST({ eventsService, body, params });

		expect(result).toEqual({
			error: 'Internal server error',
			status: 500
		});
		expect(eventsService.checkInUser).toHaveBeenCalledWith(123, 1);
	});
});
