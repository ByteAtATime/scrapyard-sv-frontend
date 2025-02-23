import { describe, expect, it, vi } from 'vitest';
import { endpoint_GET, endpoint_POST } from './endpoint';
import type { EventsService } from '$lib/server/events/service';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/events/types';
import type { EventData } from '$lib/server/db/types';
import { Event } from '$lib/server/events/event';
import type { IAuthProvider } from '$lib/server/auth/types';

describe('events', () => {
	const mockEventData: EventData = {
		id: 2,
		name: 'Test Event',
		description: 'Test Description',
		time: new Date('2025-02-22T23:33:57.980Z'),
		attendancePoints: 5,
		contactOrganizerId: 1
	};

	const mockAuthProvider: IAuthProvider = {
		isAuthenticated: vi.fn().mockReturnValue(true),
		getUserId: vi.fn().mockResolvedValue(1),
		isOrganizer: vi.fn().mockResolvedValue(true),
		getCurrentUser: vi.fn().mockResolvedValue(null),
		getUserById: vi.fn().mockResolvedValue(null)
	};

	const mockEvent = new Event(mockEventData, mockAuthProvider);

	describe('GET', () => {
		it('should return a list of events', async () => {
			const eventsService = {
				getAllEvents: vi.fn().mockResolvedValue([mockEvent])
			} as unknown as EventsService;

			const result = await endpoint_GET({ eventsService });

			expect(result).toEqual([mockEvent]);
			expect(eventsService.getAllEvents).toHaveBeenCalled();
		});

		it('should filter out events that fail serialization', async () => {
			const mockEvent2 = new Event({ ...mockEventData, id: 2 }, mockAuthProvider);

			const eventsService = {
				getAllEvents: vi.fn().mockResolvedValue([mockEvent, mockEvent2])
			} as unknown as EventsService;

			const result = await endpoint_GET({ eventsService });

			expect(result).toEqual([mockEvent, mockEvent2]);
			expect(eventsService.getAllEvents).toHaveBeenCalled();
		});

		it('should return empty array when no events exist', async () => {
			const eventsService = {
				getAllEvents: vi.fn().mockResolvedValue([])
			} as unknown as EventsService;

			const result = await endpoint_GET({ eventsService });

			expect(result).toEqual([]);
			expect(eventsService.getAllEvents).toHaveBeenCalled();
		});

		it('should return 401 when user is not authenticated', async () => {
			const eventsService = {
				getAllEvents: vi.fn().mockRejectedValue(new NotAuthenticatedError())
			} as unknown as EventsService;

			const result = await endpoint_GET({ eventsService });

			expect(result).toEqual({
				error: 'User is not authenticated',
				status: 401
			});
		});

		it('should return 401 when user is not an organizer', async () => {
			const eventsService = {
				getAllEvents: vi.fn().mockRejectedValue(new NotOrganizerError())
			} as unknown as EventsService;

			const result = await endpoint_GET({ eventsService });

			expect(result).toEqual({
				error: 'User is not an organizer',
				status: 401
			});
		});
	});

	describe('POST', () => {
		const body = {
			name: 'Test Event',
			description: 'Test Description',
			time: new Date('2025-02-22T23:33:57.980Z'),
			attendancePoints: 5,
			contactOrganizerId: 1
		};

		it('should allow organizer to create event', async () => {
			const eventsService = {
				createEvent: vi.fn().mockResolvedValue(123)
			} as unknown as EventsService;

			const result = await endpoint_POST({ eventsService, body });

			expect(eventsService.createEvent).toHaveBeenCalledWith(body);
			expect(result).toEqual({ id: 123 });
		});

		it('should return 401 when user is not authenticated', async () => {
			const eventsService = {
				createEvent: vi.fn().mockRejectedValue(new NotAuthenticatedError())
			} as unknown as EventsService;

			const result = await endpoint_POST({ eventsService, body });

			expect(result).toEqual({
				error: 'User is not authenticated',
				status: 401
			});
			expect(eventsService.createEvent).toHaveBeenCalledWith(body);
		});

		it('should return 401 when user is not an organizer', async () => {
			const eventsService = {
				createEvent: vi.fn().mockRejectedValue(new NotOrganizerError())
			} as unknown as EventsService;

			const result = await endpoint_POST({ eventsService, body });

			expect(result).toEqual({
				error: 'User is not an organizer',
				status: 401
			});
			expect(eventsService.createEvent).toHaveBeenCalledWith(body);
		});

		it('should handle nullable contactOrganizerId', async () => {
			const eventsService = {
				createEvent: vi.fn().mockResolvedValue(123)
			} as unknown as EventsService;

			const bodyWithNullContact = {
				...body,
				contactOrganizerId: null
			};

			const result = await endpoint_POST({ eventsService, body: bodyWithNullContact });

			expect(eventsService.createEvent).toHaveBeenCalledWith(bodyWithNullContact);
			expect(result).toEqual({ id: 123 });
		});
	});
});
