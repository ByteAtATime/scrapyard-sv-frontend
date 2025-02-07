import type { EventAttendanceData, EventData } from '../db/types';
import type { Event } from './event';

export interface IEventsRepository {
	createEvent(event: Event): Promise<number>;
	getEventById(id: number): Promise<EventData | null>;
	getEvents(): Promise<EventData[]>;
	updateEvent(id: number, updates: Partial<EventData>): Promise<void>;

	checkInUser(eventId: number, userId: number, author: number): Promise<void>;
	getAttendanceByEvent(eventId: number): Promise<EventAttendanceData[]>;
	getAttendanceByUser(userId: number): Promise<EventAttendanceData[]>;
}
