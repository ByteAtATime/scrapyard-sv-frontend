import { afterAll, afterEach, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './src/lib/server/db/schema';
import { db, client } from './src/lib/server/db';
import { sql } from 'drizzle-orm';
import { applyMigrations } from './src/lib/server/db/migrate';

vi.mock('$lib/server/db', async (importOriginal) => {
	const client = new PGlite();
	const db = drizzle(client, { schema });
	return {
		...(await importOriginal<typeof import('./src/lib/server/db')>()),
		db,
		client
	};
});

// Apply migrations before each test
beforeEach(async () => {
	await applyMigrations();
});

// Clean up the database after each test
afterEach(async () => {
	await db.execute(sql`drop schema if exists public cascade`);
	await db.execute(sql`create schema public`);
	await db.execute(sql`drop schema if exists drizzle cascade`);

	vi.clearAllMocks();
});

afterAll(async () => {
	// TODO: typescript doesn't know that client is a PGlite
	await (client as unknown as PGlite).close();
});
