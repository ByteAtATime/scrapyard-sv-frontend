import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { usersTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		return new Response('Invalid ID', { status: 400 });
	}

	const user = await db
		.select({
			id: usersTable.id,
			name: usersTable.name,
			email: usersTable.email,
			totalPoints: usersTable.totalPoints,
			isOrganizer: usersTable.isOrganizer
		})
		.from(usersTable)
		.where(eq(usersTable.id, id))
		.limit(1);

	if (!user.length) {
		return new Response('User not found', { status: 404 });
	}

	return json(user[0]);
}
