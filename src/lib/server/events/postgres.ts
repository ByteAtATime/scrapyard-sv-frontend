import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import type { EventData, EventAttendanceData } from '../db/types';
import type { IEventsRepo, EventStatistics } from './types';
import { eventAttendanceTable, eventsTable, pointTransactionsTable } from '../db/schema';
import type { Event } from './event';

export class PostgresEventsRepo implements IEventsRepo {
	async createEvent(event: Event): Promise<number> {
		const result = await db
			.insert(eventsTable)
			.values({
				name: event.name,
				description: event.description,
				time: event.time,
				attendancePoints: event.attendancePoints,
				contactOrganizerId: (await event.getContactOrganizer())?.id
			})
			.returning({ id: eventsTable.id });

		return result[0].id;
	}

	async getEventById(id: number): Promise<EventData | null> {
		const event = await db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, id)
		});

		return event ?? null;
	}

	async getEvents(): Promise<EventData[]> {
		return db.query.eventsTable.findMany();
	}

	async updateEvent(id: number, updates: Partial<EventData>): Promise<void> {
		const event = await db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, id)
		});

		if (!event) {
			throw new Error('Event not found');
		}

		await db.update(eventsTable).set(updates).where(eq(eventsTable.id, id));
	}

	async checkInUser(eventId: number, userId: number, author: number): Promise<void> {
		const event = await db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, eventId)
		});

		if (!event) {
			throw new Error('Event not found');
		}

		await db.transaction(async (tx) => {
			const pointValue = event.attendancePoints;

			if (pointValue) {
				await tx.insert(pointTransactionsTable).values({
					userId,
					amount: pointValue,
					reason: `Attended event: ${event.name}`,
					authorId: author,
					status: 'approved'
				});
			}

			await tx.insert(eventAttendanceTable).values({
				eventId,
				userId,
				checkedInBy: author
			});
		});
	}

	async getAttendanceByEvent(eventId: number): Promise<EventAttendanceData[]> {
		return db.select().from(eventAttendanceTable).where(eq(eventAttendanceTable.eventId, eventId));
	}

	async getAttendanceByUser(userId: number): Promise<EventAttendanceData[]> {
		return db.select().from(eventAttendanceTable).where(eq(eventAttendanceTable.userId, userId));
	}

	async getEventStatistics(): Promise<EventStatistics> {
		const result = await db
			.select({
				totalEvents: sql<number>`COUNT(DISTINCT ${eventsTable.id})`,
				totalAttendees: sql<number>`COUNT(DISTINCT ${eventAttendanceTable.userId})`,
				totalAttendance: sql<number>`COUNT(${eventAttendanceTable.eventId})`
			})
			.from(eventsTable)
			.leftJoin(eventAttendanceTable, sql`${eventsTable.id} = ${eventAttendanceTable.eventId}`);

		const stats = result[0];
		const totalEvents = Number(stats.totalEvents);

		return {
			totalEvents,
			totalAttendees: Number(stats.totalAttendees),
			averageAttendancePerEvent: totalEvents > 0 ? Number(stats.totalAttendance) / totalEvents : 0
		};
	}
}
