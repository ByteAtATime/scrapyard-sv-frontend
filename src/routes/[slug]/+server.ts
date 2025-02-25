import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { shortenedUrlsTable } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
	const { slug } = params;

	const url = await db.query.shortenedUrlsTable.findFirst({
		where: eq(shortenedUrlsTable.slug, slug)
	});

	if (!url) return error(404, 'Not found');

	return redirect(302, url.originalUrl);
};
