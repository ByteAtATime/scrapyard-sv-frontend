import { json } from '@sveltejs/kit';
import { shopRepository } from '$lib/server/shop';

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 300;

export async function GET({ setHeaders }) {
	const items = await shopRepository.getAllItems();

	// Set cache headers
	setHeaders({
		'Cache-Control': `public, max-age=${CACHE_DURATION}`,
		'Surrogate-Control': `max-age=${CACHE_DURATION}`
	});

	return json(items);
}
