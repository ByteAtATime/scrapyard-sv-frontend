import type { PageServerLoad } from './$types';
import { shopRepository } from '$lib/server/shop';

export const load: PageServerLoad = async () => {
	const items = await shopRepository.getAllItems();
	return { items };
};
