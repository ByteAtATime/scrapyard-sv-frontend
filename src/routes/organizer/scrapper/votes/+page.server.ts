import { composePage, type PageHandler } from '$lib/server/endpoints';
import {
	withAuthProvider,
	withScrapperService,
	type WithAuthProvider,
	type WithScrapperService
} from '$lib/server/endpoints/dependencies';
import { error, fail } from '@sveltejs/kit';
import { withQuerySchema } from '$lib/server/endpoints/validation';
import { z } from 'zod';
import { ScrapperService } from '$lib/server/scrapper/service';
import { PostgresScrapperRepo } from '$lib/server/scrapper/postgres';
import { ClerkAuthProvider } from '$lib/server/auth/clerk';
import { PointsService } from '$lib/server/points';
import { PostgresPointsRepo } from '$lib/server/points/postgres';
import type { VoteWithUser, VoteStats, UserVotingActivity } from '$lib/server/scrapper/types';

const querySchema = z.object({
	page: z.coerce.number().optional().default(1),
	pageSize: z.coerce.number().optional().default(20),
	userId: z.coerce.number().optional(),
	scrapId: z.coerce.number().optional(),
	startDate: z
		.string()
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	endDate: z
		.string()
		.optional()
		.transform((val) => (val ? new Date(val) : undefined))
});

type LoadParams = WithAuthProvider &
	WithScrapperService & {
		query: z.infer<typeof querySchema>;
	};

const loadHandler: PageHandler<LoadParams> = async ({ authProvider, scrapperService, query }) => {
	try {
		const userId = await authProvider.getUserId();
		if (!userId) {
			throw error(401, 'Unauthorized');
		}

		const user = await authProvider.getUserById(userId);
		if (!user?.isOrganizer) {
			throw error(403, 'Forbidden');
		}

		// Get query parameters with defaults already applied by Zod
		const { page, pageSize, userId: filterUserId, scrapId, startDate, endDate } = query;

		// Load data in parallel and handle potential errors for each
		const results = await Promise.allSettled([
			scrapperService.getVotes({
				page,
				pageSize,
				userId: filterUserId,
				scrapId,
				startDate,
				endDate
			}),
			scrapperService.getVoteCount({
				userId: filterUserId,
				scrapId,
				startDate,
				endDate
			}),
			scrapperService.getVoteStats(),
			scrapperService.getUserVotingActivity(50)
		]);

		// Initialize with fallback data to prevent UI errors
		let votes: VoteWithUser[] = [];
		let totalVotes = 0;
		let voteStats: VoteStats = {
			totalVotes: 0,
			lastHourVotes: 0,
			last24HourVotes: 0,
			averageVotesPerUser: 0,
			topVoters: []
		};
		let userVotingActivity: UserVotingActivity[] = [];

		// Process results
		if (results[0].status === 'fulfilled') {
			votes = results[0].value;
		} else {
			console.error('Error fetching votes:', results[0].reason);
		}

		if (results[1].status === 'fulfilled') {
			totalVotes = results[1].value;
		} else {
			console.error('Error fetching vote count:', results[1].reason);
		}

		if (results[2].status === 'fulfilled') {
			voteStats = results[2].value;
		} else {
			console.error('Error fetching vote stats:', results[2].reason);
		}

		if (results[3].status === 'fulfilled') {
			userVotingActivity = results[3].value;
		} else {
			console.error('Error fetching user voting activity:', results[3].reason);
		}

		return {
			votes,
			pagination: {
				page,
				pageSize,
				totalItems: totalVotes,
				totalPages: Math.ceil(totalVotes / pageSize)
			},
			filters: {
				userId: filterUserId,
				scrapId,
				startDate,
				endDate
			},
			voteStats,
			userVotingActivity
		};
	} catch (e) {
		console.error('Error loading votes page:', e);
		throw error(500, 'Failed to load votes page');
	}
};

export const load = composePage(
	withAuthProvider(),
	withScrapperService(),
	withQuerySchema(querySchema)
)(loadHandler);

// Actions
export const actions = {
	invalidateVote: async ({ request, locals }) => {
		try {
			const formData = await request.formData();
			const voteId = Number(formData.get('voteId'));

			if (isNaN(voteId)) {
				return fail(400, { error: 'Invalid vote ID' });
			}

			// Create services directly
			const authProvider = new ClerkAuthProvider(locals.auth);
			const userId = await authProvider.getUserId();
			if (!userId) {
				return fail(401, { error: 'Unauthorized' });
			}

			const user = await authProvider.getUserById(userId);
			if (!user?.isOrganizer) {
				return fail(403, { error: 'Forbidden' });
			}

			try {
				const pointsService = new PointsService(new PostgresPointsRepo(), authProvider);
				const scrapperService = new ScrapperService(
					new PostgresScrapperRepo(),
					authProvider,
					pointsService
				);

				await scrapperService.invalidateVote(voteId);
				return {
					success: true,
					message: `Vote #${voteId} and associated point transactions have been deleted successfully`
				};
			} catch (serviceError) {
				console.error('Error invalidating vote:', serviceError);
				return fail(500, {
					error: 'Failed to delete vote',
					details: serviceError instanceof Error ? serviceError.message : 'Unknown error'
				});
			}
		} catch (e) {
			console.error('Error processing invalidate vote request:', e);
			return fail(500, { error: 'Failed to process invalidate vote request' });
		}
	}
};
