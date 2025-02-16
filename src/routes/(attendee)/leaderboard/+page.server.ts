import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/v1/points/leaderboard');

	if (!res.ok) {
		return error(400, 'Failed to load leaderboard');
	}

	const data = await res.json();

	if (!data.success) {
		return error(400, 'Failed to load leaderboard');
	}

	return {
		leaderboard: data.data
	};
};
