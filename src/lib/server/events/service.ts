import type { IAuthProvider } from '$lib/server/auth/types';
import type { IEventsRepo } from './types';
import { NotAuthenticatedError, NotOrganizerError, AlreadyCheckedInError } from './types';
import { db } from '$lib/server/db';
import { eventAttendanceTable } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { Event } from './event';

export interface CreateEventData {
	name: string;
	description: string;
	time: Date;
	attendancePoints: number;
	contactOrganizerId: number | null;
}

export class EventsService {
	constructor(
		private readonly repository: IEventsRepo,
		private readonly authProvider: IAuthProvider
	) {}

	async getAllEvents(): Promise<Event[]> {
		const events = await this.repository.getEvents();
		const settled = await Promise.allSettled(
			events.map((event) => new Event(event, this.authProvider))
		);

		return settled
			.map((result) => (result.status === 'fulfilled' ? result.value : null))
			.filter(Boolean) as Event[];
	}

	async createEvent(data: CreateEventData): Promise<number> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		const event = new Event(
			{
				name: data.name,
				description: data.description,
				attendancePoints: data.attendancePoints,
				time: data.time,
				contactOrganizerId: data.contactOrganizerId,
				id: 0
			},
			this.authProvider
		);

		return await this.repository.createEvent(event);
	}

	async checkInUser(eventId: number, userId: number): Promise<void> {
		// Authorization check
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		// Check if user is already checked in
		const existing = await db
			.select()
			.from(eventAttendanceTable)
			.where(
				and(eq(eventAttendanceTable.eventId, eventId), eq(eventAttendanceTable.userId, userId))
			)
			.limit(1);

		if (existing.length > 0) {
			throw new AlreadyCheckedInError(userId, eventId);
		}

		// Check in the user
		await this.repository.checkInUser(eventId, userId, authorId);
	}
}
