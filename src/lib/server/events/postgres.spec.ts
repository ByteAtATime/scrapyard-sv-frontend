import { describe, it, expect, beforeEach } from 'vitest';
import { PostgresEventsRepo } from './postgres';
import {
	eventAttendanceTable,
	eventsTable,
	pointTransactionsTable,
	usersTable
} from '../db/schema';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { EventData, EventAttendanceData } from '../db/types';
import { Event } from './event';
import { MockAuthProvider } from '../auth/mock';

describe('PostgresEventsRepo', () => {
	let repository: PostgresEventsRepo;

	// Helper function to create a user
	const createUser = async (userId: number, name: string) => {
		await db.insert(usersTable).values({
			id: userId,
			name,
			email: `${name.toLowerCase().replace(/\s/g, '')}@example.com`,
			authProvider: 'clerk',
			authProviderId: `test-id-${userId}`
		});
		return userId;
	};

	// Helper function to create an event
	const createTestEvent = ({
		id = 1,
		name = 'Test Event',
		description = 'Test Description',
		time = new Date(),
		attendancePoints = 100,
		contactOrganizerId = null
	}: Partial<EventData> = {}): EventData => {
		return {
			id,
			name,
			description,
			time,
			attendancePoints,
			contactOrganizerId
		};
	};

	// Helper function to create event attendance
	const createTestAttendance = (
		eventId: number,
		userId: number,
		checkedInBy: number
	): EventAttendanceData => {
		return {
			eventId,
			userId,
			checkedInBy,
			checkInTime: new Date(),
			awardPointsTransactionId: null
		};
	};

	beforeEach(() => {
		repository = new PostgresEventsRepo();
	});

	describe('createEvent', () => {
		it('should create a new event and return its ID', async () => {
			// Given: event data is prepared
			const eventData = createTestEvent();
			const expectedId = 1;
			const authProvider = new MockAuthProvider();
			const event = new Event(eventData, authProvider);

			// When: createEvent is called
			const id = await repository.createEvent(event);

			// Then: the event should be created with the correct data
			expect(id).toBe(expectedId);

			// And: the event should be retrievable from the database
			const dbEvent = await repository.getEventById(id);
			expect(dbEvent).toMatchObject({
				name: eventData.name,
				description: eventData.description,
				attendancePoints: eventData.attendancePoints
			});
		});

		it('should handle null contactOrganizerId', async () => {
			// Given: event data is prepared with null organizer
			const authProvider = new MockAuthProvider();
			const event = new Event(
				createTestEvent({
					id: 0,
					name: 'Event without organizer',
					description: 'Description',
					attendancePoints: 5,
					contactOrganizerId: null
				}),
				authProvider
			);

			// When: createEvent is called
			const id = await repository.createEvent(event);

			// Then: the event should be created with null contactOrganizerId
			const dbEvent = await repository.getEventById(id);
			expect(dbEvent?.contactOrganizerId).toBeNull();
		});
	});

	describe('getEventById', () => {
		it('should return null for non-existent event', async () => {
			// Given: no events exist
			const nonExistentId = 999;

			// When: getEventById is called with a non-existent ID
			const event = await repository.getEventById(nonExistentId);

			// Then: null should be returned
			expect(event).toBeNull();
		});

		it('should return the event with the specified ID', async () => {
			// Given: an event exists
			const eventData = createTestEvent();
			await db.insert(eventsTable).values(eventData);

			// When: getEventById is called
			const event = await repository.getEventById(eventData.id);

			// Then: the correct event should be returned
			expect(event).toMatchObject(eventData);
		});

		it('should use cache for subsequent calls', async () => {
			// Given: an event exists
			const eventData = createTestEvent();
			await db.insert(eventsTable).values(eventData);

			// When: getEventById is called multiple times
			const firstCall = await repository.getEventById(eventData.id);

			// And: the event is updated in the database
			await db
				.update(eventsTable)
				.set({ name: 'Updated Name' })
				.where(eq(eventsTable.id, eventData.id));

			const secondCall = await repository.getEventById(eventData.id);

			// Then: both calls should return the same (cached) data
			expect(firstCall).toEqual(secondCall);
			expect(secondCall?.name).toBe(eventData.name);
		});
	});

	describe('getEvents', () => {
		it('should return all events', async () => {
			// Given: multiple events exist
			const events = [
				createTestEvent({ id: 1, name: 'Event 1' }),
				createTestEvent({ id: 2, name: 'Event 2' }),
				createTestEvent({ id: 3, name: 'Event 3' })
			];
			await db.insert(eventsTable).values(events);

			// When: getEvents is called
			const result = await repository.getEvents();

			// Then: all events should be returned
			expect(result).toHaveLength(3);
			expect(result.map((e) => e.name)).toEqual(['Event 1', 'Event 2', 'Event 3']);
		});

		it('should return empty array when no events exist', async () => {
			// When: getEvents is called with no events in database
			const result = await repository.getEvents();

			// Then: an empty array should be returned
			expect(result).toEqual([]);
		});
	});

	describe('updateEvent', () => {
		it('should update an existing event', async () => {
			// Given: an event exists
			const eventData = createTestEvent();
			await db.insert(eventsTable).values(eventData);

			// When: updateEvent is called with updates
			const updates = { description: 'Updated description', attendancePoints: 25 };
			await repository.updateEvent(eventData.id, updates);

			// Then: the event should be updated in the database
			const updatedEvent = await repository.getEventById(eventData.id);
			expect(updatedEvent).toMatchObject({
				...eventData,
				...updates
			});
		});

		it('should throw an error if event to update is not found', async () => {
			// Given: no event exists
			const nonExistentId = 999;
			const updates = { description: 'Updated description' };

			// When/Then: updateEvent should throw error
			await expect(repository.updateEvent(nonExistentId, updates)).rejects.toThrow(
				'Event not found'
			);
		});
	});

	describe('checkInUser', () => {
		it('should check in user and award points', async () => {
			// Given: an event and user exist
			const userId = await createUser(1, 'Test User');
			const authorId = await createUser(2, 'Author User');
			const eventData = createTestEvent({ attendancePoints: 100 });
			await db.insert(eventsTable).values(eventData);

			// When: checkInUser is called
			await repository.checkInUser(eventData.id, userId, authorId);

			// Then: attendance should be recorded
			const attendance = await repository.getAttendanceByEvent(eventData.id);
			expect(attendance).toHaveLength(1);
			expect(attendance[0]).toMatchObject({
				eventId: eventData.id,
				userId,
				checkedInBy: authorId
			});

			// And: points should be awarded
			const pointTransactions = await db
				.select()
				.from(pointTransactionsTable)
				.where(eq(pointTransactionsTable.userId, userId));
			expect(pointTransactions).toHaveLength(1);
			expect(pointTransactions[0]).toMatchObject({
				amount: eventData.attendancePoints,
				status: 'approved'
			});
		});

		it('should not award points if attendancePoints is 0', async () => {
			// Given: an event exists with 0 attendance points
			const userId = await createUser(1, 'Test User');
			const authorId = await createUser(2, 'Author User');
			const eventData = createTestEvent({ attendancePoints: 0 });
			await db.insert(eventsTable).values(eventData);

			// When: checkInUser is called
			await repository.checkInUser(eventData.id, userId, authorId);

			// Then: attendance should be recorded
			const attendance = await repository.getAttendanceByEvent(eventData.id);
			expect(attendance).toHaveLength(1);

			// But: no points should be awarded
			const pointTransactions = await db
				.select()
				.from(pointTransactionsTable)
				.where(eq(pointTransactionsTable.userId, userId));
			expect(pointTransactions).toHaveLength(0);
		});

		it('should throw error for non-existent event', async () => {
			// Given: a user exists but event doesn't
			const userId = await createUser(1, 'Test User');
			const authorId = await createUser(2, 'Author User');
			const nonExistentEventId = 999;

			// When/Then: checkInUser should throw error
			await expect(repository.checkInUser(nonExistentEventId, userId, authorId)).rejects.toThrow(
				'Event not found'
			);
		});
	});

	describe('getAttendanceByEvent', () => {
		it('should return attendance records for a given event ID', async () => {
			// Given: an event exists with multiple attendees
			const eventData = createTestEvent();
			await db.insert(eventsTable).values(eventData);

			const user1 = await createUser(1, 'User One');
			const user2 = await createUser(2, 'User Two');
			const author = await createUser(3, 'Author');

			await db
				.insert(eventAttendanceTable)
				.values([
					createTestAttendance(eventData.id, user1, author),
					createTestAttendance(eventData.id, user2, author)
				]);

			// When: getAttendanceByEvent is called
			const attendance = await repository.getAttendanceByEvent(eventData.id);

			// Then: all attendance records should be returned
			expect(attendance).toHaveLength(2);
			expect(attendance.map((a) => a.userId).sort()).toEqual([user1, user2].sort());
			expect(attendance.every((a) => a.eventId === eventData.id)).toBe(true);
			expect(attendance.every((a) => a.checkedInBy === author)).toBe(true);
		});

		it('should return an empty array if no attendance records found for event', async () => {
			// Given: an event exists with no attendees
			const eventData = createTestEvent();
			await db.insert(eventsTable).values(eventData);

			// When: getAttendanceByEvent is called
			const attendance = await repository.getAttendanceByEvent(eventData.id);

			// Then: an empty array should be returned
			expect(attendance).toEqual([]);
		});
	});

	describe('getAttendanceByUser', () => {
		it('should return attendance records for a given user ID', async () => {
			// Given: multiple events exist and a user has attended them
			const userId = await createUser(1, 'Test User');
			const authorId = await createUser(2, 'Author');

			const events = [
				createTestEvent({ id: 1, name: 'Event 1' }),
				createTestEvent({ id: 2, name: 'Event 2' })
			];
			await db.insert(eventsTable).values(events);

			await db
				.insert(eventAttendanceTable)
				.values([
					createTestAttendance(1, userId, authorId),
					createTestAttendance(2, userId, authorId)
				]);

			// When: getAttendanceByUser is called
			const attendance = await repository.getAttendanceByUser(userId);

			// Then: all attendance records should be returned
			expect(attendance).toHaveLength(2);
			expect(attendance.every((a) => a.userId === userId)).toBe(true);
			expect(attendance.map((a) => a.eventId).sort()).toEqual([1, 2]);
		});

		it('should return an empty array if no attendance records found for user', async () => {
			// Given: a user exists but hasn't attended any events
			const userId = await createUser(1, 'No Attendance User');

			// When: getAttendanceByUser is called
			const attendance = await repository.getAttendanceByUser(userId);

			// Then: an empty array should be returned
			expect(attendance).toEqual([]);
		});

		it('should use cache for subsequent calls', async () => {
			// Given: a user exists with attendance records
			const userId = await createUser(1, 'Cache Test User');
			const authorId = await createUser(2, 'Author');

			const event = createTestEvent();
			await db.insert(eventsTable).values(event);
			await db
				.insert(eventAttendanceTable)
				.values(createTestAttendance(event.id, userId, authorId));

			// When: getAttendanceByUser is called multiple times
			const firstCall = await repository.getAttendanceByUser(userId);

			// Add another attendance that shouldn't affect cached result
			const event2 = createTestEvent({ id: 2 });
			await db.insert(eventsTable).values(event2);
			await db
				.insert(eventAttendanceTable)
				.values(createTestAttendance(event2.id, userId, authorId));

			const secondCall = await repository.getAttendanceByUser(userId);

			// Then: both calls should return the same (cached) data
			expect(firstCall).toEqual(secondCall);
			expect(secondCall).toHaveLength(1);
		});
	});

	describe('getEventStatistics', () => {
		it('should return zero statistics when no events exist', async () => {
			// When: getEventStatistics is called with no events
			const stats = await repository.getEventStatistics();

			// Then: all statistics should be zero
			expect(stats).toEqual({
				totalEvents: 0,
				totalAttendees: 0,
				averageAttendancePerEvent: 0
			});
		});

		it('should calculate correct statistics for multiple events', async () => {
			// Given: multiple events and attendances exist
			const user1 = await createUser(1, 'User One');
			const user2 = await createUser(2, 'User Two');
			const user3 = await createUser(3, 'User Three');

			const event1 = createTestEvent({ id: 1, name: 'Event 1' });
			const event2 = createTestEvent({ id: 2, name: 'Event 2' });
			await db.insert(eventsTable).values([event1, event2]);

			// User1 attends both events, User2 attends event1, User3 attends event2
			await db
				.insert(eventAttendanceTable)
				.values([
					createTestAttendance(event1.id, user1, user1),
					createTestAttendance(event1.id, user2, user1),
					createTestAttendance(event2.id, user1, user1),
					createTestAttendance(event2.id, user3, user1)
				]);

			// When: getEventStatistics is called
			const stats = await repository.getEventStatistics();

			// Then: statistics should be correctly calculated
			expect(stats).toEqual({
				totalEvents: 2,
				totalAttendees: 3,
				averageAttendancePerEvent: 2 // 4 total attendances / 2 events
			});
		});
	});

	describe('getUpcomingEvents', () => {
		it('should return upcoming events for user', async () => {
			// Given: a user exists with some future events
			const userId = await createUser(1, 'Test User');
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			const events = [
				createTestEvent({ id: 1, name: 'Future Event 1', time: futureDate }),
				createTestEvent({
					id: 2,
					name: 'Future Event 2',
					time: new Date(futureDate.getTime() + 86400000)
				})
			];
			await db.insert(eventsTable).values(events);

			// When: getUpcomingEvents is called
			const upcomingEvents = await repository.getUpcomingEvents(userId);

			// Then: future events should be returned
			expect(upcomingEvents).toHaveLength(2);
			expect(upcomingEvents.map((e) => e.name)).toEqual(['Future Event 1', 'Future Event 2']);
		});

		it('should not return events user is already attending', async () => {
			// Given: a user exists with future events, some already attended
			const userId = await createUser(1, 'Test User');
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			const events = [
				createTestEvent({ id: 1, name: 'Attended Event', time: futureDate }),
				createTestEvent({ id: 2, name: 'Unattended Event', time: futureDate })
			];
			await db.insert(eventsTable).values(events);

			// Mark first event as attended
			await db.insert(eventAttendanceTable).values(createTestAttendance(1, userId, userId));

			// When: getUpcomingEvents is called
			const upcomingEvents = await repository.getUpcomingEvents(userId);

			// Then: only unattended future events should be returned
			expect(upcomingEvents).toHaveLength(1);
			expect(upcomingEvents[0].name).toBe('Unattended Event');
		});
	});

	describe('getUserEventStatistics', () => {
		it('should return zero statistics for user with no attendance', async () => {
			// Given: a user exists but hasn't attended any events
			const userId = await createUser(1, 'No Attendance User');

			// When: getUserEventStatistics is called
			const stats = await repository.getUserEventStatistics(userId);

			// Then: statistics should show zero attendance
			expect(stats).toEqual({
				totalEventsAttended: 0,
				attendanceRate: 0
			});
		});

		it('should calculate correct statistics for user with attendance', async () => {
			// Given: a user exists with event attendance
			const userId = await createUser(1, 'Active User');

			// Create 3 events, user attends 2
			const events = [
				createTestEvent({ id: 1, name: 'Event 1' }),
				createTestEvent({ id: 2, name: 'Event 2' }),
				createTestEvent({ id: 3, name: 'Event 3' })
			];
			await db.insert(eventsTable).values(events);

			// Record attendance for 2 events
			await db
				.insert(eventAttendanceTable)
				.values([createTestAttendance(1, userId, userId), createTestAttendance(2, userId, userId)]);

			// When: getUserEventStatistics is called
			const stats = await repository.getUserEventStatistics(userId);

			// Then: statistics should be correctly calculated
			expect(stats).toEqual({
				totalEventsAttended: 2,
				attendanceRate: 2 / 3 // 2 attended out of 3 total events
			});
		});

		it('should use cache for subsequent calls', async () => {
			// Given: a user exists with event attendance
			const userId = await createUser(1, 'Cache Test User');
			await db.insert(eventsTable).values([createTestEvent({ id: 1, name: 'Event 1' })]);
			await db.insert(eventAttendanceTable).values(createTestAttendance(1, userId, userId));

			// When: getUserEventStatistics is called multiple times
			const firstStats = await repository.getUserEventStatistics(userId);

			// Add another attendance that shouldn't affect cached result
			await db.insert(eventsTable).values([createTestEvent({ id: 2, name: 'Event 2' })]);
			await db.insert(eventAttendanceTable).values(createTestAttendance(2, userId, userId));

			const secondStats = await repository.getUserEventStatistics(userId);

			// Then: both calls should return the same (cached) statistics
			expect(firstStats).toEqual(secondStats);
		});
	});
});
