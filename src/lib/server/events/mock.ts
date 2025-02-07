import { vi } from 'vitest';
import type { IEventsRepository } from './types';

export class MockEventsRepository implements IEventsRepository {
	createEvent = vi.fn();
	getEventById = vi.fn();
	getEvents = vi.fn();
	updateEvent = vi.fn();
	checkInUser = vi.fn();
	getAttendanceByEvent = vi.fn();
	getAttendanceByUser = vi.fn();
}
