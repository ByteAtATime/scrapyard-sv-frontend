import { json } from '@sveltejs/kit';
import { shopService } from '$lib/server/shop';
import type { RequestHandler } from './$types';

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 300;

export const GET: RequestHandler = async ({ setHeaders }) => {
	const items = await shopService.getAllItems(true);

	// Set cache headers
	setHeaders({
		'Cache-Control': `public, max-age=${CACHE_DURATION}`,
		'Surrogate-Control': `max-age=${CACHE_DURATION}`
	});

	return json(items);
};
