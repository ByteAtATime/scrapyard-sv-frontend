import {
	composePage,
	withSuperForm,
	type PageHandler,
	type WithSuperForm
} from '$lib/server/endpoints';
import {
	withAuthProvider,
	withQuestService,
	type WithAuthProvider,
	type WithQuestService
} from '$lib/server/endpoints/dependencies';
import { fail } from 'sveltekit-superforms';
import { superValidate } from 'sveltekit-superforms/server';
import { questSubmissionSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';

const submitQuestHandler: PageHandler<
	WithAuthProvider & WithQuestService & WithSuperForm<typeof questSubmissionSchema>
> = async ({ authProvider, questService, form }) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		return fail(401, { form, error: 'Unauthorized' });
	}

	try {
		// Submit the quest with the YouTube URL
		const submission = await questService.createQuestSubmission({
			questId: form.data.questId,
			teamId: form.data.teamId,
			attachmentUrls: [form.data.youtubeUrl], // Use the YouTube URL as the attachment
			submittedBy: userId
		});

		return { success: true, data: submission, form };
	} catch (error) {
		console.error(error);
		return fail(400, {
			form,
			error: error instanceof Error ? error.message : 'Failed to submit quest'
		});
	}
};

const loadHandler: PageHandler<WithAuthProvider & WithQuestService> = async ({
	authProvider,
	questService
}) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		return {
			quests: [],
			teams: [],
			submissionForm: await superValidate(zod(questSubmissionSchema))
		};
	}

	// Get all active quests
	const allQuests = await questService.getQuests();
	const activeQuests = allQuests.filter((quest) => quest.status === 'active');

	// In a real application, this would come from a team service
	// For now, we're using a mock team since each user only has one team
	const userTeam = {
		id: 1,
		name: 'My Team'
	};

	// Create form for submitting a quest
	const submissionForm = await superValidate(zod(questSubmissionSchema));

	return {
		quests: activeQuests,
		teams: [userTeam], // Just pass the single team
		submissionForm
	};
};

export const load = composePage(withAuthProvider(), withQuestService())(loadHandler);

export const actions = {
	submit: composePage(
		withAuthProvider(),
		withQuestService(),
		withSuperForm(questSubmissionSchema)
	)(submitQuestHandler)
};
