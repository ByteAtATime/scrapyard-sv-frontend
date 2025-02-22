import * as schema from './schema';
import { db } from './index';
import { createRequire } from 'module';

type GlobalThisWithRequire = typeof globalThis & { require: NodeJS.Require };

(globalThis as GlobalThisWithRequire).require = createRequire(import.meta.url);

export const applyMigrations = async () => {
	const { generateDrizzleJson, generateMigration } = await import('drizzle-kit/api');

	const prevSchema = {};

	const migrationCode = await generateMigration(
		generateDrizzleJson(prevSchema),
		generateDrizzleJson(schema)
	);

	for (const statement of migrationCode) {
		await db.execute(statement);
	}
};
