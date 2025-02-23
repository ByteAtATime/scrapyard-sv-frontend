import { json } from '@sveltejs/kit';
import { ShopService } from '$lib/server/shop';
import type { RequestHandler } from './$types';
import { PostgresShopRepo } from '$lib/server/shop';
import { ClerkAuthProvider } from '$lib/server/auth';
import { PostgresPointsRepo } from '$lib/server/points';

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 300;

export const GET: RequestHandler = async ({ setHeaders, locals }) => {
	const shopService = new ShopService(
		new PostgresShopRepo(),
		new ClerkAuthProvider(locals.auth),
		new PostgresPointsRepo()
	);
	const items = await shopService.getAllItems(true);

	// Set cache headers
	setHeaders({
		'Cache-Control': `public, max-age=${CACHE_DURATION}`,
		'Surrogate-Control': `max-age=${CACHE_DURATION}`
	});

	return json(items);
};
