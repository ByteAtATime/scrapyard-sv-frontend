import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import type { EventData, EventAttendanceData } from '../db/types';
import type { IEventsRepo, EventStatistics, UpcomingEvent, UserEventStatistics } from './types';
import { eventAttendanceTable, eventsTable, pointTransactionsTable } from '../db/schema';
import type { Event } from './event';
import { and, gt } from 'drizzle-orm';
import { Cache } from '../cache';

export class PostgresEventsRepo implements IEventsRepo {
	private static TTL_MS = 5000; // 5 seconds
	private eventCache = new Cache<number, EventData>(PostgresEventsRepo.TTL_MS);
	private userAttendanceCache = new Cache<number, EventAttendanceData[]>(PostgresEventsRepo.TTL_MS);
	private userStatsCache = new Cache<number, UserEventStatistics>(PostgresEventsRepo.TTL_MS);
	private upcomingEventsCache = new Cache<number, UpcomingEvent[]>(PostgresEventsRepo.TTL_MS);

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
		const cached = this.eventCache.get(id);
		if (cached !== undefined) return cached;

		const event = await db.query.eventsTable.findFirst({
			where: eq(eventsTable.id, id)
		});

		if (event) {
			this.eventCache.set(id, event);
		}
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
		const event = await this.getEventById(eventId);

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

		// Invalidate affected caches
		this.userAttendanceCache.delete(userId);
		this.userStatsCache.delete(userId);
		this.upcomingEventsCache.delete(userId);
	}

	async getAttendanceByEvent(eventId: number): Promise<EventAttendanceData[]> {
		return db.select().from(eventAttendanceTable).where(eq(eventAttendanceTable.eventId, eventId));
	}

	async getAttendanceByUser(userId: number): Promise<EventAttendanceData[]> {
		const cached = this.userAttendanceCache.get(userId);
		if (cached !== undefined) return cached;

		const attendance = await db
			.select()
			.from(eventAttendanceTable)
			.where(eq(eventAttendanceTable.userId, userId));

		this.userAttendanceCache.set(userId, attendance);
		return attendance;
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

	async getUpcomingEvents(userId: number): Promise<UpcomingEvent[]> {
		const cached = this.upcomingEventsCache.get(userId);
		if (cached !== undefined) return cached;

		const events = await db
			.select({
				id: eventsTable.id,
				name: eventsTable.name,
				startTime: eventsTable.time
			})
			.from(eventsTable)
			.leftJoin(
				eventAttendanceTable,
				and(
					eq(eventAttendanceTable.eventId, eventsTable.id),
					eq(eventAttendanceTable.userId, userId)
				)
			)
			.where(and(gt(eventsTable.time, new Date()), sql`${eventAttendanceTable.eventId} IS NULL`))
			.orderBy(eventsTable.time)
			.limit(3);

		this.upcomingEventsCache.set(userId, events);
		return events;
	}

	async getUserEventStatistics(userId: number): Promise<UserEventStatistics> {
		const cached = this.userStatsCache.get(userId);
		if (cached !== undefined) return cached;

		const stats = await db
			.select({
				totalEvents: sql<number>`COUNT(DISTINCT ${eventsTable.id})`,
				totalAttended: sql<number>`COUNT(DISTINCT ${eventAttendanceTable.eventId})`
			})
			.from(eventsTable)
			.leftJoin(
				eventAttendanceTable,
				and(
					eq(eventAttendanceTable.eventId, eventsTable.id),
					eq(eventAttendanceTable.userId, userId)
				)
			);

		const { totalEvents, totalAttended } = stats[0];
		const result = {
			totalEventsAttended: totalAttended ?? 0,
			attendanceRate: totalEvents > 0 ? (totalAttended ?? 0) / totalEvents : 0
		};

		this.userStatsCache.set(userId, result);
		return result;
	}
}
