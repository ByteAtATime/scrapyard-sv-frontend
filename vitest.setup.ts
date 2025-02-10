import { beforeEach, vi } from 'vitest';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('./src/lib/server/db/mock');
	return mockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

beforeEach(() => {
	vi.clearAllMocks();

	// reset implementation and return type of all functions
	// TODO: is this the best way to do this?
	mockDb.select.mockReturnThis();
	mockDb.insert.mockReturnThis();
	mockDb.update.mockReturnThis();
	mockDb.delete.mockReturnThis();
	mockDb.from.mockReturnThis();
	mockDb.where.mockReturnThis();
	mockDb.limit.mockReturnThis();
	mockDb.execute.mockClear();
	mockDb.returning.mockReturnThis();
	mockDb.values.mockReturnThis();
	mockDb.transaction.mockImplementation((cb) => cb(mockDb));
	mockDb.query.usersTable.findFirst.mockClear();
	mockDb.query.usersTable.findMany.mockClear();
	mockDb.query.pointTransactionsTable.findFirst.mockClear();
	mockDb.query.pointTransactionsTable.findMany.mockClear();
	mockDb.query.eventsTable.findFirst.mockClear();
	mockDb.query.eventsTable.findMany.mockClear();
	mockDb.query.eventAttendanceTable.findFirst.mockClear();
	mockDb.query.eventAttendanceTable.findMany.mockClear();
});
