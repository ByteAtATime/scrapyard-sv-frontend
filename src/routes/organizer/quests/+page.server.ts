import { composePage, type PageHandler } from '$lib/server/endpoints';
import {
	withAuthProvider,
	withQuestService,
	type WithAuthProvider,
	type WithQuestService
} from '$lib/server/endpoints/dependencies';

const loadHandler: PageHandler<WithAuthProvider & WithQuestService> = async ({
	authProvider,
	questService
}) => {
	// Check if user is an organizer
	const isOrganizer = await authProvider.isOrganizer();
	if (!isOrganizer) {
		return {
			quests: []
		};
	}

	// Get all quests
	const quests = await questService.getQuests();

	return {
		quests: quests.map((quest) => ({
			...quest,
			endTime: quest.endTime.toISOString()
		}))
	};
};

export const load = composePage(withAuthProvider(), withQuestService())(loadHandler);
