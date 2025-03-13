import { describe, it, expect } from 'vitest';
import { Event, type EventJson } from './event';
import { MockAuthProvider } from '../auth/mock';
import type { EventData, UserData } from '../db/types';
import { User } from '../auth/user';

describe('Event', () => {
	const mockAuthProvider = new MockAuthProvider();
	const mockEventData: EventData = {
		id: 1,
		name: 'Test Event',
		description: 'Event Description',
		time: new Date('2024-07-20T10:00:00Z'),
		attendancePoints: 10,
		contactOrganizerId: 123
	};
	const mockContactOrganizerData: UserData = {
		id: 123,
		name: 'Organizer Name',
		email: 'organizer@example.com',
		authProvider: 'clerk',
		authProviderId: 'clerk-org-id',
		totalPoints: 0,
		avatarUrl: 'https://example.com/avatar.jpg',
		isOrganizer: true
	};

	it('should correctly initialize with data', () => {
		const event = new Event(mockEventData, mockAuthProvider);
		expect(event.id).toBe(mockEventData.id);
		expect(event.name).toBe(mockEventData.name);
		expect(event.description).toBe(mockEventData.description);
		expect(event.time).toEqual(mockEventData.time);
		expect(event.attendancePoints).toBe(mockEventData.attendancePoints);
	});

	it('getters should return correct values', () => {
		const event = new Event(mockEventData, mockAuthProvider);
		expect(event.id).toBe(1);
		expect(event.name).toBe('Test Event');
		expect(event.description).toBe('Event Description');
		expect(event.time).toEqual(new Date('2024-07-20T10:00:00Z'));
		expect(event.attendancePoints).toBe(10);
	});

	describe('getContactOrganizer', () => {
		it('should return User object if contactOrganizerId is valid and user exists', async () => {
			mockAuthProvider.getUserById.mockResolvedValue(mockContactOrganizerData);
			const event = new Event(mockEventData, mockAuthProvider);
			const organizer = await event.getContactOrganizer();
			expect(organizer).toBeInstanceOf(User);
			expect(organizer?.id).toBe(mockContactOrganizerData.id);
			expect(mockAuthProvider.getUserById).toHaveBeenCalledWith(mockEventData.contactOrganizerId);
		});

		it('should return null if contactOrganizerId is null', async () => {
			const eventDataNoOrganizer = { ...mockEventData, contactOrganizerId: null };
			const event = new Event(eventDataNoOrganizer, mockAuthProvider);
			const organizer = await event.getContactOrganizer();
			expect(organizer).toBeNull();
			expect(mockAuthProvider.getUserById).not.toHaveBeenCalled();
		});

		it('should return null if user for contactOrganizerId is not found', async () => {
			mockAuthProvider.getUserById.mockResolvedValue(null);
			const event = new Event(mockEventData, mockAuthProvider);
			const organizer = await event.getContactOrganizer();
			expect(organizer).toBeNull();
			expect(mockAuthProvider.getUserById).toHaveBeenCalledWith(mockEventData.contactOrganizerId);
		});
	});

	describe('toJson', () => {
		it('should return EventJson with contact organizer details', async () => {
			mockAuthProvider.getUserById.mockResolvedValue(mockContactOrganizerData);
			const event = new Event(mockEventData, mockAuthProvider);
			const json = await event.toJson();

			const expectedJson: EventJson = {
				id: 1,
				name: 'Test Event',
				description: 'Event Description',
				time: new Date('2024-07-20T10:00:00Z'),
				attendancePoints: 10,
				contactOrganizer: {
					id: 123,
					name: 'Organizer Name',
					avatarUrl: 'https://example.com/avatar.jpg',
					email: 'organizer@example.com',
					totalPoints: 0,
					isOrganizer: true
				}
			};
			expect(json).toEqual(expectedJson);
			expect(mockAuthProvider.getUserById).toHaveBeenCalledWith(mockEventData.contactOrganizerId);
		});

		it('should return EventJson with null contactOrganizer if contactOrganizerId is null', async () => {
			const eventDataNoOrganizer = { ...mockEventData, contactOrganizerId: null };
			const event = new Event(eventDataNoOrganizer, mockAuthProvider);
			const json = await event.toJson();

			const expectedJson: EventJson = {
				id: 1,
				name: 'Test Event',
				description: 'Event Description',
				time: new Date('2024-07-20T10:00:00Z'),
				attendancePoints: 10,
				contactOrganizer: null
			};
			expect(json).toEqual(expectedJson);
			expect(mockAuthProvider.getUserById).not.toHaveBeenCalled();
		});
	});
});
