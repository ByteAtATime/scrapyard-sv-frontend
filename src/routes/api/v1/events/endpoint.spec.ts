import { MockAuthProvider } from '$lib/server/auth/mock';
import { MockEventsRepository } from '$lib/server/events/mock';
import { describe, expect, it, vi } from 'vitest';
import { endpoint_GET, endpoint_POST } from './endpoint';
import { Event, type EventJson } from '$lib/server/events/event';
import type { UserData } from '$lib/server/db/types';

const mockOrganizer = {
	id: 1,
	email: 'zrl@hackclub.com',
	name: 'Zach Latta',
	isOrganizer: true,
	authProvider: 'clerk',
	authProviderId: 'zrl123',
	totalPoints: -1
} satisfies UserData;
const mockEventData = {
	id: 1,
	name: 'Test Event',
	description: 'Test Description',
	time: new Date(),
	attendancePoints: 5,
	contactOrganizer: mockOrganizer
} satisfies EventJson;

describe('events', () => {
	describe('GET', () => {
		it('should return a list of events', async () => {
			const authProvider = new MockAuthProvider().mockOrganizer();
			const eventsRepository = new MockEventsRepository();
			eventsRepository.getEvents.mockResolvedValue([mockEventData]);

			vi.spyOn(Event.prototype, 'toJson').mockResolvedValue({
				...mockEventData,
				contactOrganizer: mockOrganizer
			});

			const result = await endpoint_GET({ eventsRepository, authProvider });

			expect(eventsRepository.getEvents).toHaveBeenCalled();
			expect(result).toEqual([
				{
					...mockEventData,
					contactOrganizer: mockOrganizer
				}
			]);
		});

		it('should filter out events that fail serialization', async () => {
			const authProvider = new MockAuthProvider().mockOrganizer();
			const eventsRepository = new MockEventsRepository();
			eventsRepository.getEvents.mockResolvedValue([mockEventData, { ...mockEventData, id: 2 }]);

			vi.spyOn(Event.prototype, 'toJson')
				.mockRejectedValueOnce(new Error('Unauthorized'))
				.mockResolvedValueOnce({ ...mockEventData, id: 2 });

			const result = await endpoint_GET({ eventsRepository, authProvider });

			expect(result).toEqual([{ ...mockEventData, id: 2 }]);
		});

		it('should return empty array when no events exist', async () => {
			const authProvider = new MockAuthProvider().mockOrganizer();
			const eventsRepository = new MockEventsRepository();
			eventsRepository.getEvents.mockResolvedValue([]);

			const result = await endpoint_GET({ eventsRepository, authProvider });

			expect(result).toEqual([]);
		});
	});

	describe('POST', () => {
		it('should allow organizer to create event', async () => {
			const authProvider = new MockAuthProvider().mockOrganizer();
			const eventsRepository = new MockEventsRepository();
			eventsRepository.createEvent.mockResolvedValue(123);

			const body = {
				name: 'Test Event',
				description: 'Test Description',
				time: new Date('2024-01-01'),
				attendancePoints: 5,
				contactOrganizerId: 1
			};

			const result = await endpoint_POST({ authProvider, eventsRepository, body });

			expect(eventsRepository.createEvent).toHaveBeenCalledWith(expect.any(Event));
			expect(result).toEqual({ id: 123 });
		});

		it('should return 403 if user is not organizer', async () => {
			const authProvider = new MockAuthProvider().mockSignedIn();
			const eventsRepository = new MockEventsRepository();
			const body = {
				name: 'Test Event',
				description: 'Test Description',
				time: new Date(),
				attendancePoints: 5,
				contactOrganizerId: 1
			};

			const result = await endpoint_POST({ authProvider, eventsRepository, body });

			expect(eventsRepository.createEvent).not.toHaveBeenCalled();
			expect(result).toEqual({
				status: 403,
				error: 'Unauthorized'
			});
		});

		it('should handle nullable contactOrganizerId', async () => {
			const authProvider = new MockAuthProvider().mockOrganizer();
			const eventsRepository = new MockEventsRepository();
			eventsRepository.createEvent.mockResolvedValue(124);

			const body = {
				name: 'Test Event',
				description: 'Test Description',
				time: new Date(),
				attendancePoints: 5,
				contactOrganizerId: null
			};

			await endpoint_POST({ authProvider, eventsRepository, body });

			const createdEvent = eventsRepository.createEvent.mock.calls[0][0];
			expect(createdEvent.contactOrganizerId).toBeUndefined();
		});
	});
});
