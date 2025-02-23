import type { Event } from './event';
import type { EventData, EventAttendanceData } from '../db/types';

export interface EventStatistics {
	totalEvents: number;
	totalAttendees: number;
	averageAttendancePerEvent: number;
}

export interface UserEventStatistics {
	totalEventsAttended: number;
	attendanceRate: number;
}

export interface UpcomingEvent {
	id: number;
	name: string;
	startTime: Date;
}

// Domain Errors
export class EventsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'EventsError';
	}
}

export class NotAuthenticatedError extends EventsError {
	constructor() {
		super('User is not authenticated');
		this.name = 'NotAuthenticatedError';
	}
}

export class NotOrganizerError extends EventsError {
	constructor() {
		super('User is not an organizer');
		this.name = 'NotOrganizerError';
	}
}

export class AlreadyCheckedInError extends EventsError {
	constructor(userId: number, eventId: number) {
		super(`User ${userId} is already checked in to event ${eventId}`);
		this.name = 'AlreadyCheckedInError';
	}
}

export class EventNotFoundError extends EventsError {
	constructor(eventId: number) {
		super(`Event with ID ${eventId} not found`);
		this.name = 'EventNotFoundError';
	}
}

export class UserNotFoundError extends EventsError {
	constructor(userId: number) {
		super(`User with ID ${userId} not found`);
		this.name = 'UserNotFoundError';
	}
}

export interface IEventsRepo {
	createEvent(event: Event): Promise<number>;
	getEventById(id: number): Promise<EventData | null>;
	getEvents(): Promise<EventData[]>;
	updateEvent(id: number, updates: Partial<EventData>): Promise<void>;

	checkInUser(eventId: number, userId: number, authorId: number): Promise<void>;
	getAttendanceByEvent(eventId: number): Promise<EventAttendanceData[]>;
	getAttendanceByUser(userId: number): Promise<EventAttendanceData[]>;
	getEventStatistics(): Promise<EventStatistics>;
	getUpcomingEvents(userId: number): Promise<UpcomingEvent[]>;
	getUserEventStatistics(userId: number): Promise<UserEventStatistics>;
}
