import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { usersTable } from '$lib/server/db/schema';
import { ilike } from 'drizzle-orm';
import { or } from 'drizzle-orm';

export async function GET({ url }) {
	const query = url.searchParams.get('q');
	if (!query) {
		return json([]);
	}

	const users = await db
		.select({
			id: usersTable.id,
			name: usersTable.name,
			email: usersTable.email,
			totalPoints: usersTable.totalPoints,
			isOrganizer: usersTable.isOrganizer
		})
		.from(usersTable)
		.where(or(ilike(usersTable.name, `%${query}%`), ilike(usersTable.email, `%${query}%`)))
		.limit(10);

	return json(users);
}
