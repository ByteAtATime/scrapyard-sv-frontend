import type {
	IQuestService,
	IQuestRepo,
	CreateQuestData,
	UpdateQuestData,
	CreateQuestSubmissionData,
	ReviewQuestSubmissionData
} from './types';
import {
	QuestNotFoundError,
	QuestSubmissionNotFoundError,
	TeamNotFoundError,
	NotTeamMemberError
} from './types';
import type { QuestData, QuestSubmissionData } from '../db/types';
import type { IAuthProvider } from '$lib/server/auth/types';
import type { IPointsService } from '../points/types';
import { NotAuthenticatedError, NotOrganizerError } from '../points/types';
import type { ITeamsService } from '../teams/types';

export class QuestService implements IQuestService {
	constructor(
		private readonly repository: IQuestRepo,
		private readonly authProvider: IAuthProvider,
		private readonly pointsService: IPointsService,
		private readonly teamService: ITeamsService
	) {}

	async createQuest(data: CreateQuestData): Promise<QuestData> {
		// Authorization check
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		return await this.repository.createQuest(data);
	}

	async getQuests(): Promise<QuestData[]> {
		return await this.repository.getQuests();
	}

	async getQuestById(id: number): Promise<QuestData> {
		const quest = await this.repository.getQuestById(id);
		if (!quest) {
			throw new QuestNotFoundError(id);
		}
		return quest;
	}

	async updateQuest(id: number, data: UpdateQuestData): Promise<QuestData> {
		// Authorization check
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		// Check if quest exists
		const quest = await this.repository.getQuestById(id);
		if (!quest) {
			throw new QuestNotFoundError(id);
		}

		return await this.repository.updateQuest(id, data);
	}

	async deleteQuest(id: number): Promise<void> {
		// Authorization check
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		// Check if quest exists
		const quest = await this.repository.getQuestById(id);
		if (!quest) {
			throw new QuestNotFoundError(id);
		}

		await this.repository.deleteQuest(id);
	}

	async createQuestSubmission(data: CreateQuestSubmissionData): Promise<QuestSubmissionData> {
		const userId = await this.authProvider.getUserId();
		if (!userId) {
			throw new NotAuthenticatedError();
		}

		// Check if quest exists
		const quest = await this.repository.getQuestById(data.questId);
		if (!quest) {
			throw new QuestNotFoundError(data.questId);
		}

		// Check if user is a member of the team
		const isTeamMember = await this.teamService.isUserInTeam(userId, data.teamId);
		if (!isTeamMember) {
			throw new NotTeamMemberError(userId, data.teamId);
		}

		// Create submission with the authenticated user as submitter
		return await this.repository.createQuestSubmission({
			...data,
			submittedBy: userId
		});
	}

	async getQuestSubmissions(questId: number): Promise<QuestSubmissionData[]> {
		// Check if quest exists
		const quest = await this.repository.getQuestById(questId);
		if (!quest) {
			throw new QuestNotFoundError(questId);
		}

		return await this.repository.getQuestSubmissions(questId);
	}

	async getQuestSubmissionsByTeam(teamId: number): Promise<QuestSubmissionData[]> {
		// Check if team exists
		const teamExists = await this.teamService.teamExists(teamId);
		if (!teamExists) {
			throw new TeamNotFoundError(teamId);
		}

		return await this.repository.getQuestSubmissionsByTeam(teamId);
	}

	async getQuestSubmissionById(id: number): Promise<QuestSubmissionData> {
		const submission = await this.repository.getQuestSubmissionById(id);
		if (!submission) {
			throw new QuestSubmissionNotFoundError(id);
		}
		return submission;
	}

	async reviewQuestSubmission(
		id: number,
		data: ReviewQuestSubmissionData
	): Promise<QuestSubmissionData> {
		// Authorization check
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const reviewerId = await this.authProvider.getUserId();
		if (!reviewerId) {
			throw new NotAuthenticatedError();
		}

		// Check if submission exists
		const submission = await this.repository.getQuestSubmissionById(id);
		if (!submission) {
			throw new QuestSubmissionNotFoundError(id);
		}

		// Get the quest to determine points
		const quest = await this.repository.getQuestById(submission.questId);
		if (!quest) {
			throw new QuestNotFoundError(submission.questId);
		}

		let pointsTransactionId: number | undefined;

		// If approving, award points to the team
		if (data.status === 'approved') {
			const teams = await this.teamService.getTeamsByUserId(submission.submittedBy);
			const team = await this.teamService.getTeamById(teams[0].id);

			if (!team) {
				throw new TeamNotFoundError(submission.teamId);
			}

			for (const member of team.members) {
				// Create a transaction to award points
				const transactionData = {
					userId: member.userId,
					amount: quest.totalPoints,
					reason: `Quest completion: ${quest.name}`,
					authorId: reviewerId,
					status: 'approved' as const
				};

				const transaction = await this.pointsService.createTransaction(transactionData);
				pointsTransactionId = transaction.id;
			}
		}

		// Update the submission with review data
		return await this.repository.reviewQuestSubmission(
			id,
			{
				...data,
				reviewerId
			},
			pointsTransactionId
		);
	}
}
