import { vi } from 'vitest';

export const mockDb = {
	select: vi.fn().mockReturnThis(),
	insert: vi.fn().mockReturnThis(),
	update: vi.fn().mockReturnThis(),
	delete: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	limit: vi.fn().mockReturnThis(),
	leftJoin: vi.fn().mockReturnThis(),
	innerJoin: vi.fn().mockReturnThis(),
	orderBy: vi.fn().mockReturnThis(),
	execute: vi.fn(),
	returning: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
	groupBy: vi.fn().mockReturnThis(),
	having: vi.fn().mockReturnThis(),
	transaction: vi.fn((cb) => cb(mockDb)),
	query: {
		usersTable: {
			findFirst: vi.fn(),
			findMany: vi.fn()
		},
		pointTransactionsTable: {
			findFirst: vi.fn(),
			findMany: vi.fn()
		},
		eventsTable: {
			findFirst: vi.fn(),
			findMany: vi.fn()
		},
		eventAttendanceTable: {
			findFirst: vi.fn(),
			findMany: vi.fn()
		}
	}
};
