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
import { superValidate, withFiles } from 'sveltekit-superforms/server';
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
		let attachmentUrls: string[] = [];

		// Process YouTube URL if provided
		if (form.data.youtubeUrl) {
			attachmentUrls.push(form.data.youtubeUrl);
		}

		// Process file uploads if provided
		if (form.data.attachments && form.data.attachments.length > 0) {
			// Upload files to CDN
			const uploadPromises = form.data.attachments.map(async (file: File) => {
				const formData = new FormData();
				formData.append('file', file);

				const response = await fetch('https://hack.ngo/upload', {
					method: 'POST',
					body: formData
				});

				if (!response.ok) throw new Error('Failed to upload file');
				const data = await response.json();
				if (!data.success) throw new Error('Failed to upload file');
				return data.url; // Return just the URL from the CDN response
			});

			const fileUrls = await Promise.all(uploadPromises);
			attachmentUrls = [...attachmentUrls, ...fileUrls];
		}

		// Submit the quest
		const submission = await questService.createQuestSubmission({
			questId: form.data.questId,
			teamId: form.data.teamId,
			attachmentUrls,
			submittedBy: userId
		});

		return withFiles({ success: true, data: submission, form });
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
