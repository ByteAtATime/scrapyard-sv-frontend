import { ClerkAuthProvider } from '$lib/server/auth';
import { PostgresQuestRepo } from '$lib/server/quests/postgres';

export const load = async ({ locals }) => {
	const authProvider = new ClerkAuthProvider(locals.auth);
	const questService = new PostgresQuestRepo();

	const isOrganizer = await authProvider.isOrganizer();

	// Get active quests for the badge
	const userId = await authProvider.getUserId();
	let hasActiveQuests = false;

	if (userId) {
		const quests = await questService.getQuests();
		hasActiveQuests = quests.some((quest) => quest.status === 'active');
	}

	return {
		isOrganizer,
		hasActiveQuests
	};
};
