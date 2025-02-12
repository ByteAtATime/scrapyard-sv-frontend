import type { Event } from './event';
import type { EventData, EventAttendanceData } from '../db/types';

export interface EventStatistics {
	totalEvents: number;
	totalAttendees: number;
	averageAttendancePerEvent: number;
}

export interface IEventsRepo {
	createEvent(event: Event): Promise<number>;
	getEventById(id: number): Promise<EventData | null>;
	getEvents(): Promise<EventData[]>;
	updateEvent(id: number, updates: Partial<EventData>): Promise<void>;

	checkInUser(eventId: number, userId: number, author: number): Promise<void>;
	getAttendanceByEvent(eventId: number): Promise<EventAttendanceData[]>;
	getAttendanceByUser(userId: number): Promise<EventAttendanceData[]>;
	getEventStatistics(): Promise<EventStatistics>;
}
