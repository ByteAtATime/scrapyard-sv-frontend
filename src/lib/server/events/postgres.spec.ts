import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresEventsRepo } from './postgres';
import { Event } from './event';
import {
	eventAttendanceTable,
	eventsTable,
	pointTransactionsTable,
	usersTable
} from '../db/schema';
import { MockAuthProvider } from '../auth/mock';
import type { EventData } from '../db/types';
import { SQL } from 'drizzle-orm';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('../db/mock');
	return mockDb;
});

vi.mock('../db', () => ({
	db: mockDb
}));

describe('PostgresEventsRepo', () => {
	let repo: PostgresEventsRepo;

	beforeEach(async () => {
		repo = new PostgresEventsRepo();
		vi.clearAllMocks();
	});

	describe('createEvent', () => {
		it('should create a new event and return its ID', async () => {
			const authProvider = new MockAuthProvider();
			const event = new Event(
				{
					id: 0,
					name: 'New Event',
					description: 'Event description',
					time: new Date('2024-08-01T12:00:00Z'),
					attendancePoints: 15,
					contactOrganizerId: 1
				},
				authProvider
			);

			mockDb.returning.mockResolvedValue([{ id: 42 }]);
			authProvider.getUserById.mockResolvedValue({ id: 1, name: 'Organizer' });

			const eventId = await repo.createEvent(event);

			expect(eventId).toBe(42);
			expect(mockDb.insert).toHaveBeenCalledWith(eventsTable);
			expect(mockDb.values).toHaveBeenCalledWith({
				name: 'New Event',
				description: 'Event description',
				time: event.time,
				attendancePoints: 15,
				contactOrganizerId: 1
			});
			expect(mockDb.returning).toHaveBeenCalledWith({ id: eventsTable.id });
		});

		it('should handle null contactOrganizerId', async () => {
			const authProvider = new MockAuthProvider();
			const event = new Event(
				{
					id: 0,
					name: 'Event without organizer',
					description: 'Description',
					time: new Date(),
					attendancePoints: 5,
					contactOrganizerId: null
				},
				authProvider
			);
			mockDb.returning.mockResolvedValue([{ id: 43 }]);

			await repo.createEvent(event);

			expect(mockDb.values).toHaveBeenCalledWith(
				expect.objectContaining({
					contactOrganizerId: undefined
				})
			);
		});
	});

	describe('getEventById', () => {
		it('should return event data if event exists', async () => {
			const eventId = 1;
			const expectedEvent: EventData = {
				id: eventId,
				name: 'Existing Event',
				description: 'Existing event description',
				time: new Date(),
				attendancePoints: 20,
				contactOrganizerId: 2
			};
			mockDb.query.eventsTable.findFirst.mockResolvedValue(expectedEvent);

			const event = await repo.getEventById(eventId);

			expect(event).toEqual(expectedEvent);
			expect(mockDb.query.eventsTable.findFirst).toHaveBeenCalledWith({
				where: expect.anything()
			});
		});

		it('should return null if event does not exist', async () => {
			const eventId = 999;
			mockDb.query.eventsTable.findFirst.mockResolvedValue(undefined);

			const event = await repo.getEventById(eventId);

			expect(event).toBeNull();
			expect(mockDb.query.eventsTable.findFirst).toHaveBeenCalledWith({
				where: expect.anything()
			});
		});
	});

	describe('getEvents', () => {
		it('should return an array of event data', async () => {
			const expectedEvents: EventData[] = [
				{
					id: 1,
					name: 'Event 1',
					description: 'Description 1',
					time: new Date(),
					attendancePoints: 10,
					contactOrganizerId: 1
				},
				{
					id: 2,
					name: 'Event 2',
					description: 'Description 2',
					time: new Date(),
					attendancePoints: 15,
					contactOrganizerId: 2
				}
			];
			mockDb.query.eventsTable.findMany.mockResolvedValue(expectedEvents);

			const events = await repo.getEvents();

			expect(events).toEqual(expectedEvents);
			expect(mockDb.query.eventsTable.findMany).toHaveBeenCalled();
		});

		it('should return an empty array if no events exist', async () => {
			mockDb.query.eventsTable.findMany.mockResolvedValue([]);

			const events = await repo.getEvents();

			expect(events).toEqual([]);
			expect(mockDb.query.eventsTable.findMany).toHaveBeenCalled();
		});
	});

	describe('updateEvent', () => {
		it('should update an existing event', async () => {
			const eventId = 1;
			const updates = { description: 'Updated description', attendancePoints: 25 };
			mockDb.query.eventsTable.findFirst.mockResolvedValue({
				id: eventId,
				name: 'Event to Update'
			});
			mockDb.update(eventsTable).set(updates).where.mockResolvedValue([]);

			await repo.updateEvent(eventId, updates);

			expect(mockDb.query.eventsTable.findFirst).toHaveBeenCalledWith({
				where: expect.anything()
			});
			expect(mockDb.update).toHaveBeenCalledWith(eventsTable);
			expect(mockDb.set).toHaveBeenCalledWith(updates);
			expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
		});

		it('should throw an error if event to update is not found', async () => {
			const eventId = 999;
			const updates = { description: 'Updated description' };
			mockDb.query.eventsTable.findFirst.mockResolvedValue(undefined);

			await expect(repo.updateEvent(eventId, updates)).rejects.toThrow('Event not found');
			expect(mockDb.update).not.toHaveBeenCalled();
		});
	});

	describe('checkInUser', () => {
		it('should check in a user to an event and award points if attendancePoints > 0', async () => {
			const eventId = 1;
			const userId = 101;
			const authorId = 201;
			const attendancePoints = 10;
			const eventData: EventData = {
				id: eventId,
				name: 'Point Event',
				description: 'Event with points',
				time: new Date(),
				attendancePoints,
				contactOrganizerId: null
			};
			mockDb.query.eventsTable.findFirst.mockResolvedValue(eventData);
			mockDb.values.mockResolvedValue([]);

			await repo.checkInUser(eventId, userId, authorId);

			expect(mockDb.query.eventsTable.findFirst).toHaveBeenCalledWith({
				where: expect.anything()
			});
			expect(mockDb.transaction).toHaveBeenCalled();
			expect(mockDb.insert).toHaveBeenCalledTimes(2);
			expect(mockDb.insert).toHaveBeenCalledWith(pointTransactionsTable);
			expect(mockDb.insert).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.values).toHaveBeenCalledWith({
				userId: userId,
				amount: attendancePoints,
				reason: `Attended event: ${eventData.name}`,
				authorId: authorId,
				status: 'approved'
			});
			expect(mockDb.values).toHaveBeenCalledWith({
				eventId: eventId,
				userId: userId,
				checkedInBy: authorId
			});
		});

		it('should check in a user to an event without awarding points if attendancePoints is 0', async () => {
			const eventId = 2;
			const userId = 102;
			const authorId = 202;
			const attendancePoints = 0;
			const eventData: EventData = {
				id: eventId,
				name: 'Free Event',
				description: 'Event without points',
				time: new Date(),
				attendancePoints: attendancePoints,
				contactOrganizerId: null
			};
			mockDb.query.eventsTable.findFirst.mockResolvedValue(eventData);
			mockDb.transaction.mockImplementation(async (cb) => await cb(mockDb));
			mockDb.values.mockResolvedValue([]);

			await repo.checkInUser(eventId, userId, authorId);

			expect(mockDb.query.eventsTable.findFirst).toHaveBeenCalledWith({
				where: expect.any(SQL)
			});
			expect(mockDb.transaction).toHaveBeenCalled();
			expect(mockDb.insert).toHaveBeenCalledTimes(1);
			expect(mockDb.insert).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.insert).not.toHaveBeenCalledWith(pointTransactionsTable);
			expect(mockDb.values).toHaveBeenCalledWith({
				eventId: eventId,
				userId: userId,
				checkedInBy: authorId
			});
		});

		it('should throw an error if event for check-in is not found', async () => {
			const eventId = 999;
			const userId = 103;
			const authorId = 203;
			mockDb.query.eventsTable.findFirst.mockResolvedValue(undefined);

			await expect(repo.checkInUser(eventId, userId, authorId)).rejects.toThrow('Event not found');
			expect(mockDb.transaction).not.toHaveBeenCalled();
		});
	});

	describe('getAttendanceByEvent', () => {
		it('should return attendance records for a given event ID', async () => {
			const eventId = 1;
			const expectedAttendance = [
				{ eventId: eventId, userId: 101, checkInTime: new Date(), checkedInBy: 201 },
				{ eventId: eventId, userId: 102, checkInTime: new Date(), checkedInBy: 202 }
			];
			mockDb.select().from(eventAttendanceTable).where.mockResolvedValue(expectedAttendance);

			const attendance = await repo.getAttendanceByEvent(eventId);

			expect(attendance).toEqual(expectedAttendance);
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
		});

		it('should return an empty array if no attendance records found for event', async () => {
			const eventId = 999;
			mockDb.select().from(eventAttendanceTable).where.mockResolvedValue([]);

			const attendance = await repo.getAttendanceByEvent(eventId);

			expect(attendance).toEqual([]);
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
		});
	});

	describe('getAttendanceByUser', () => {
		it('should return attendance records for a given user ID', async () => {
			const userId = 101;
			const expectedAttendance = [
				{ eventId: 1, userId: userId, checkInTime: new Date(), checkedInBy: 201 },
				{ eventId: 2, userId: userId, checkInTime: new Date(), checkedInBy: 202 }
			];
			mockDb.select().from(eventAttendanceTable).where.mockResolvedValue(expectedAttendance);

			const attendance = await repo.getAttendanceByUser(userId);

			expect(attendance).toEqual(expectedAttendance);
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
		});

		it('should return an empty array if no attendance records found for user', async () => {
			const userId = 999;
			mockDb.select().from(eventAttendanceTable).where.mockResolvedValue([]);

			const attendance = await repo.getAttendanceByUser(userId);

			expect(attendance).toEqual([]);
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
		});
	});

	describe('getEventStatistics', () => {
		it('should return correct statistics when there are events', async () => {
			mockDb.leftJoin.mockImplementationOnce(() =>
				Promise.resolve([
					{
						totalEvents: 5,
						totalAttendees: 20,
						totalAttendance: 50
					}
				])
			);

			const result = await repo.getEventStatistics();

			expect(result).toEqual({
				totalEvents: 5,
				totalAttendees: 20,
				averageAttendancePerEvent: 10 // 50 / 5
			});

			expect(mockDb.select).toHaveBeenCalledWith({
				totalEvents: expect.any(SQL),
				totalAttendees: expect.any(SQL),
				totalAttendance: expect.any(SQL)
			});
			expect(mockDb.from).toHaveBeenCalledWith(eventsTable);
			expect(mockDb.leftJoin).toHaveBeenCalledWith(eventAttendanceTable, expect.any(SQL));
		});

		it('should handle zero events without division errors', async () => {
			mockDb.leftJoin.mockImplementationOnce(() =>
				Promise.resolve([
					{
						totalEvents: 0,
						totalAttendees: 0,
						totalAttendance: 0
					}
				])
			);

			const result = await repo.getEventStatistics();

			expect(result).toEqual({
				totalEvents: 0,
				totalAttendees: 0,
				averageAttendancePerEvent: 0
			});
		});
	});

	describe('getUpcomingEvents', () => {
		it('should return upcoming events that user has not attended', async () => {
			const now = new Date();
			const futureDate1 = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
			const futureDate2 = new Date(now.getTime() + 48 * 60 * 60 * 1000); // day after tomorrow

			const mockEvents = [
				{
					id: 1,
					name: 'Future Event 1',
					startTime: futureDate1
				},
				{
					id: 2,
					name: 'Future Event 2',
					startTime: futureDate2
				}
			];

			mockDb.limit.mockResolvedValueOnce(mockEvents);

			const upcomingEvents = await repo.getUpcomingEvents(1);

			expect(upcomingEvents).toHaveLength(2);
			expect(upcomingEvents[0].id).toBe(1);
			expect(upcomingEvents[0].name).toBe('Future Event 1');
			expect(upcomingEvents[0].startTime).toEqual(futureDate1);
			expect(upcomingEvents[1].id).toBe(2);
			expect(upcomingEvents[1].name).toBe('Future Event 2');
			expect(upcomingEvents[1].startTime).toEqual(futureDate2);

			// Verify the query chain
			expect(mockDb.select).toHaveBeenCalledWith({
				id: eventsTable.id,
				name: eventsTable.name,
				startTime: eventsTable.time
			});
			expect(mockDb.from).toHaveBeenCalledWith(eventsTable);
			expect(mockDb.leftJoin).toHaveBeenCalled();
			expect(mockDb.where).toHaveBeenCalled();
			expect(mockDb.orderBy).toHaveBeenCalledWith(eventsTable.time);
			expect(mockDb.limit).toHaveBeenCalledWith(3);
		});

		it('should return empty array when no upcoming events', async () => {
			mockDb.limit.mockResolvedValueOnce([]);

			const upcomingEvents = await repo.getUpcomingEvents(1);
			expect(upcomingEvents).toHaveLength(0);

			// Verify the query chain
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalled();
			expect(mockDb.leftJoin).toHaveBeenCalled();
			expect(mockDb.where).toHaveBeenCalled();
			expect(mockDb.orderBy).toHaveBeenCalled();
			expect(mockDb.limit).toHaveBeenCalledWith(3);
		});
	});

	describe('getUserEventStatistics', () => {
		it('should return correct statistics for user events', async () => {
			const mockUser = { id: 1, name: 'Test User' };
			mockDb.insert(usersTable).values().returning.mockResolvedValueOnce([mockUser]);

			const mockStats = [
				{
					totalEvents: 3,
					totalAttended: 2
				}
			];

			mockDb.select().from().leftJoin.mockResolvedValueOnce(mockStats);

			const stats = await repo.getUserEventStatistics(mockUser.id);

			expect(stats.totalEventsAttended).toBe(2);
			expect(stats.attendanceRate).toBe(2 / 3);
		});

		it('should return zero statistics when user has no events', async () => {
			const mockUser = { id: 1, name: 'Test User' };
			mockDb.insert(usersTable).values().returning.mockResolvedValueOnce([mockUser]);

			const mockStats = [
				{
					totalEvents: 0,
					totalAttended: 0
				}
			];

			mockDb.select().from().leftJoin.mockResolvedValueOnce(mockStats);

			const stats = await repo.getUserEventStatistics(mockUser.id);

			expect(stats.totalEventsAttended).toBe(0);
			expect(stats.attendanceRate).toBe(0);
		});
	});
});
