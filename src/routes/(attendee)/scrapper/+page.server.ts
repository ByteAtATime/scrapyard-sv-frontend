import {
	composePage,
	withSuperForm,
	type PageHandler,
	type WithSuperForm
} from '$lib/server/endpoints';
import {
	withAuthProvider,
	withScrapperService,
	type WithAuthProvider,
	type WithScrapperService
} from '$lib/server/endpoints/dependencies.js';
import { fail } from 'sveltekit-superforms';
import { superValidate, withFiles } from 'sveltekit-superforms/server';
import {
	scrapSchema,
	startSchema,
	pauseSchema,
	resumeSchema,
	completeSchema,
	cancelSchema
} from './schema';
import { zod } from 'sveltekit-superforms/adapters';

const startSessionHandler: PageHandler<
	WithAuthProvider & WithScrapperService & WithSuperForm<typeof startSchema>
> = async ({ authProvider, scrapperService, form }) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		return fail(401, { form, error: 'Unauthorized' });
	}

	const session = await scrapperService.createSession(userId);
	return withFiles({ success: true, data: session, form });
};

const pauseSessionHandler: PageHandler<
	WithAuthProvider & WithScrapperService & WithSuperForm<typeof pauseSchema>
> = async ({ authProvider, scrapperService, form }) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		return fail(401, { form, error: 'Unauthorized' });
	}

	try {
		const session = await scrapperService.pauseSession(userId);
		return withFiles({ success: true, data: session, form });
	} catch (error) {
		return fail(400, {
			form,
			error: error instanceof Error ? error.message : 'Failed to pause session'
		});
	}
};

const resumeSessionHandler: PageHandler<
	WithAuthProvider & WithScrapperService & WithSuperForm<typeof resumeSchema>
> = async ({ authProvider, scrapperService, form }) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		return fail(401, { form, error: 'Unauthorized' });
	}

	try {
		const session = await scrapperService.resumeSession(userId);
		return withFiles({ success: true, data: session, form });
	} catch (error) {
		return fail(400, {
			form,
			error: error instanceof Error ? error.message : 'Failed to resume session'
		});
	}
};

const completeSessionHandler: PageHandler<
	WithAuthProvider & WithScrapperService & WithSuperForm<typeof scrapSchema>
> = async ({ authProvider, scrapperService, form }) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		return fail(401, { form, error: 'Unauthorized' });
	}

	try {
		const session = await scrapperService.getCurrentSession(userId);
		if (!session) {
			return fail(400, { form, error: 'No active session found' });
		}

		if (session.status !== 'active' && session.status !== 'paused') {
			return fail(400, { form, error: 'Session must be active or paused to complete' });
		}

		// Upload images to CDN
		const uploadPromises = form.data.images.map(async (file: File) => {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('https://hack.ngo/upload', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) throw new Error('Failed to upload image');
			const data = await response.json();
			if (!data.success) throw new Error('Failed to upload image');
			return data.url; // Return just the URL from the CDN response
		});

		const attachmentUrls = await Promise.all(uploadPromises);

		// Calculate points based on session duration
		const startTime = new Date(session.startTime);
		const endTime = new Date();
		const durationHours =
			(endTime.getTime() - startTime.getTime() - session.totalPausedSeconds * 1000) /
			(1000 * 60 * 60);
		const points = Math.floor(durationHours * session.pointsPerHour);

		// Create the scrap with transaction
		const scrap = await scrapperService.createScrap({
			userId: userId,
			sessionId: session.id,
			title: form.data.title,
			description: form.data.description,
			attachmentUrls,
			points
		});

		// Complete the session
		await scrapperService.completeSession(userId);

		return withFiles({ success: true, data: { session: null, scrap }, form });
	} catch (error) {
		console.error(error);
		return fail(400, {
			form,
			error: error instanceof Error ? error.message : 'Failed to complete session'
		});
	}
};

const cancelSessionHandler: PageHandler<
	WithAuthProvider & WithScrapperService & WithSuperForm<typeof cancelSchema>
> = async ({ authProvider, scrapperService, form }) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		return fail(401, { form, error: 'Unauthorized' });
	}

	try {
		const session = await scrapperService.cancelSession(userId);
		return withFiles({ success: true, data: session, form });
	} catch (error) {
		return fail(400, {
			form,
			error: error instanceof Error ? error.message : 'Failed to cancel session'
		});
	}
};

const loadHandler: PageHandler<WithAuthProvider & WithScrapperService> = async ({
	authProvider,
	scrapperService
}) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		return {
			session: null,
			startForm: await superValidate(zod(startSchema)),
			pauseForm: await superValidate(zod(pauseSchema)),
			resumeForm: await superValidate(zod(resumeSchema)),
			completeForm: await superValidate(zod(completeSchema)),
			cancelForm: await superValidate(zod(cancelSchema)),
			uploadForm: await superValidate(zod(scrapSchema))
		};
	}

	// Use getCurrentSession instead of getSession to get both active and paused sessions
	const dbSession = await scrapperService.getCurrentSession(userId);

	let session = null;
	if (dbSession) {
		session = dbSession;
	}

	// Create forms for all actions
	const startForm = await superValidate(zod(startSchema));
	const pauseForm = await superValidate(zod(pauseSchema));
	const resumeForm = await superValidate(zod(resumeSchema));
	const completeForm = await superValidate(zod(completeSchema));
	const cancelForm = await superValidate(zod(cancelSchema));

	// Create form for uploading a scrap
	const uploadForm = await superValidate(zod(scrapSchema));

	return {
		session,
		startForm,
		pauseForm,
		resumeForm,
		completeForm,
		cancelForm,
		uploadForm
	};
};

export const load = composePage(withAuthProvider(), withScrapperService())(loadHandler);

export const actions = {
	start: composePage(
		withAuthProvider(),
		withScrapperService(),
		withSuperForm(startSchema)
	)(startSessionHandler),
	pause: composePage(
		withAuthProvider(),
		withScrapperService(),
		withSuperForm(pauseSchema)
	)(pauseSessionHandler),
	resume: composePage(
		withAuthProvider(),
		withScrapperService(),
		withSuperForm(resumeSchema)
	)(resumeSessionHandler),
	complete: composePage(
		withAuthProvider(),
		withScrapperService(),
		withSuperForm(scrapSchema)
	)(completeSessionHandler),
	cancel: composePage(
		withAuthProvider(),
		withScrapperService(),
		withSuperForm(cancelSchema)
	)(cancelSessionHandler)
};
