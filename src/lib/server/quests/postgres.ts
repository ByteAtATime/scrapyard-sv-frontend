import { db } from '$lib/server/db';
import { questsTable, questSubmissionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import type {
	IQuestRepo,
	CreateQuestData,
	UpdateQuestData,
	CreateQuestSubmissionData,
	ReviewQuestSubmissionData
} from './types';
import type { QuestData, QuestSubmissionData } from '../db/types';
import { Logger } from '../logging';
import { Cache } from '../cache';

export class PostgresQuestRepo implements IQuestRepo {
	private static TTL_MS = 5000; // 5 seconds
	private questsCache = new Cache<string, QuestData[]>(PostgresQuestRepo.TTL_MS);
	private questSubmissionsCache = new Cache<number, QuestSubmissionData[]>(
		PostgresQuestRepo.TTL_MS
	);
	private logger = new Logger('QuestRepo');

	async createQuest(data: CreateQuestData): Promise<QuestData> {
		this.logger.info('Creating quest', { name: data.name });
		const [quest] = await db
			.insert(questsTable)
			.values({
				...data,
				status: data.status || 'active'
			})
			.returning();

		this.questsCache.delete('all');
		return quest;
	}

	async getQuests(): Promise<QuestData[]> {
		const cached = this.questsCache.get('all');
		if (cached !== undefined) {
			this.logger.debug('Cache hit: getQuests');
			return cached;
		}

		this.logger.debug('Cache miss: getQuests');
		const quests = await db.select().from(questsTable).orderBy(questsTable.createdAt);
		this.questsCache.set('all', quests);
		return quests;
	}

	async getQuestById(id: number): Promise<QuestData | null> {
		const quests = await db.select().from(questsTable).where(eq(questsTable.id, id));
		return quests[0] ?? null;
	}

	async updateQuest(id: number, data: UpdateQuestData): Promise<QuestData> {
		this.logger.info('Updating quest', { id });
		const [quest] = await db
			.update(questsTable)
			.set(data)
			.where(eq(questsTable.id, id))
			.returning();

		this.questsCache.delete('all');
		return quest;
	}

	async deleteQuest(id: number): Promise<void> {
		this.logger.info('Deleting quest', { id });
		await db.delete(questsTable).where(eq(questsTable.id, id));
		this.questsCache.delete('all');
	}

	async createQuestSubmission(data: CreateQuestSubmissionData): Promise<QuestSubmissionData> {
		this.logger.info('Creating quest submission', {
			questId: data.questId,
			teamId: data.teamId
		});

		// Convert attachmentUrls array to string for database storage
		const submissionData = {
			...data,
			attachmentUrls: JSON.stringify(data.attachmentUrls),
			status: 'pending'
		};

		const [submission] = await db.insert(questSubmissionsTable).values(submissionData).returning();

		this.questSubmissionsCache.delete(data.questId);
		this.questSubmissionsCache.delete(data.teamId);

		// Parse the attachmentUrls back to an array for the return value
		return {
			...submission,
			attachmentUrls: JSON.parse(submission.attachmentUrls)
		};
	}

	async getQuestSubmissions(questId: number): Promise<QuestSubmissionData[]> {
		const cached = this.questSubmissionsCache.get(questId);
		if (cached !== undefined) {
			this.logger.debug('Cache hit: getQuestSubmissions', { questId });
			return cached;
		}

		this.logger.debug('Cache miss: getQuestSubmissions', { questId });
		const submissions = await db
			.select()
			.from(questSubmissionsTable)
			.where(eq(questSubmissionsTable.questId, questId))
			.orderBy(questSubmissionsTable.submittedAt);

		// Parse attachmentUrls for each submission
		const parsedSubmissions = submissions.map((submission) => ({
			...submission,
			attachmentUrls: JSON.parse(submission.attachmentUrls)
		}));

		this.questSubmissionsCache.set(questId, parsedSubmissions);
		return parsedSubmissions;
	}

	async getQuestSubmissionsByTeam(teamId: number): Promise<QuestSubmissionData[]> {
		const cached = this.questSubmissionsCache.get(teamId);
		if (cached !== undefined) {
			this.logger.debug('Cache hit: getQuestSubmissionsByTeam', { teamId });
			return cached;
		}

		this.logger.debug('Cache miss: getQuestSubmissionsByTeam', { teamId });
		const submissions = await db
			.select()
			.from(questSubmissionsTable)
			.where(eq(questSubmissionsTable.teamId, teamId))
			.orderBy(questSubmissionsTable.submittedAt);

		// Parse attachmentUrls for each submission
		const parsedSubmissions = submissions.map((submission) => ({
			...submission,
			attachmentUrls: JSON.parse(submission.attachmentUrls)
		}));

		this.questSubmissionsCache.set(teamId, parsedSubmissions);
		return parsedSubmissions;
	}

	async getQuestSubmissionById(id: number): Promise<QuestSubmissionData | null> {
		const submissions = await db
			.select()
			.from(questSubmissionsTable)
			.where(eq(questSubmissionsTable.id, id));

		if (submissions[0]) {
			return {
				...submissions[0],
				attachmentUrls: JSON.parse(submissions[0].attachmentUrls)
			};
		}

		return null;
	}

	async reviewQuestSubmission(
		id: number,
		data: ReviewQuestSubmissionData,
		pointsTransactionId?: number
	): Promise<QuestSubmissionData> {
		this.logger.info('Reviewing quest submission', { id, status: data.status });
		const [submission] = await db
			.update(questSubmissionsTable)
			.set({
				status: data.status,
				reviewerId: data.reviewerId,
				reviewedAt: new Date(),
				rejectionReason: data.rejectionReason,
				pointsTransactionId
			})
			.where(eq(questSubmissionsTable.id, id))
			.returning();

		// Invalidate caches
		this.questSubmissionsCache.delete(submission.questId);
		this.questSubmissionsCache.delete(submission.teamId);

		// Parse attachmentUrls for the return value
		return {
			...submission,
			attachmentUrls: JSON.parse(submission.attachmentUrls)
		};
	}
}
