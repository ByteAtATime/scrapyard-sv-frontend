import { vi } from 'vitest';
import type { IEventsRepo } from './types';

export class MockEventsRepo implements IEventsRepo {
	createEvent = vi.fn();
	getEventById = vi.fn();
	getEvents = vi.fn();
	updateEvent = vi.fn();
	checkInUser = vi.fn();
	getAttendanceByEvent = vi.fn();
	getAttendanceByUser = vi.fn();
	getEventStatistics = vi.fn();
	getUpcomingEvents = vi.fn();
	getUserEventStatistics = vi.fn();
}
