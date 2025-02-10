import { describe, it, expect } from 'vitest';
import { PostgresEventsRepository } from './postgres';
import { Event } from './event';
import {
	eventsTable,
	eventAttendanceTable,
	pointTransactionsTable,
	usersTable
} from '../db/schema';
import { MockAuthProvider } from '../auth/mock';
import { mockDb } from '../db/mock';
import type { EventData } from '../db/types';

describe('PostgresEventsRepository', () => {
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

			const repo = new PostgresEventsRepository();
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

			const repo = new PostgresEventsRepository();
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

			const repo = new PostgresEventsRepository();
			const event = await repo.getEventById(eventId);

			expect(event).toEqual(expectedEvent);
			expect(mockDb.query.eventsTable.findFirst).toHaveBeenCalledWith({
				where: expect.anything()
			});
		});

		it('should return null if event does not exist', async () => {
			const eventId = 999;
			mockDb.query.eventsTable.findFirst.mockResolvedValue(undefined);

			const repo = new PostgresEventsRepository();
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

			const repo = new PostgresEventsRepository();
			const events = await repo.getEvents();

			expect(events).toEqual(expectedEvents);
			expect(mockDb.query.eventsTable.findMany).toHaveBeenCalled();
		});

		it('should return an empty array if no events exist', async () => {
			mockDb.query.eventsTable.findMany.mockResolvedValue([]);

			const repo = new PostgresEventsRepository();
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

			const repo = new PostgresEventsRepository();
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

			const repo = new PostgresEventsRepository();
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

			const repo = new PostgresEventsRepository();
			await repo.checkInUser(eventId, userId, authorId);

			expect(mockDb.query.eventsTable.findFirst).toHaveBeenCalledWith({
				where: expect.anything()
			});
			expect(mockDb.transaction).toHaveBeenCalled();
			expect(mockDb.insert).toHaveBeenCalledTimes(2);
			expect(mockDb.insert).toHaveBeenCalledWith(pointTransactionsTable);
			expect(mockDb.insert).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.update).toHaveBeenCalledWith(usersTable);
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
			expect(mockDb.set).toHaveBeenCalledWith({
				totalPoints: expect.any(Object) // sql`${usersTable.totalPoints} + ${pointValue}`
			});
			expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
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

			const repo = new PostgresEventsRepository();
			await repo.checkInUser(eventId, userId, authorId);

			expect(mockDb.query.eventsTable.findFirst).toHaveBeenCalledWith({
				where: expect.anything()
			});
			expect(mockDb.transaction).toHaveBeenCalled();
			expect(mockDb.insert).toHaveBeenCalledTimes(1);
			expect(mockDb.insert).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.insert).not.toHaveBeenCalledWith(pointTransactionsTable);
			expect(mockDb.update).not.toHaveBeenCalledWith(usersTable);
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

			const repo = new PostgresEventsRepository();
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

			const repo = new PostgresEventsRepository();
			const attendance = await repo.getAttendanceByEvent(eventId);

			expect(attendance).toEqual(expectedAttendance);
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
		});

		it('should return an empty array if no attendance records found for event', async () => {
			const eventId = 999;
			mockDb.select().from(eventAttendanceTable).where.mockResolvedValue([]);

			const repo = new PostgresEventsRepository();
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

			const repo = new PostgresEventsRepository();
			const attendance = await repo.getAttendanceByUser(userId);

			expect(attendance).toEqual(expectedAttendance);
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
		});

		it('should return an empty array if no attendance records found for user', async () => {
			const userId = 999;
			mockDb.select().from(eventAttendanceTable).where.mockResolvedValue([]);

			const repo = new PostgresEventsRepository();
			const attendance = await repo.getAttendanceByUser(userId);

			expect(attendance).toEqual([]);
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalledWith(eventAttendanceTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
		});
	});
});
