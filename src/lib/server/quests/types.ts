import type { QuestData, QuestSubmissionData } from '../db/types';
import type { questStatusEnum, questSubmissionStatusEnum } from '../db/schema';

export type QuestStatus = (typeof questStatusEnum.enumValues)[number];
export type QuestSubmissionStatus = (typeof questSubmissionStatusEnum.enumValues)[number];

// Domain Errors
export class QuestsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'QuestsError';
	}
}

export class QuestNotFoundError extends QuestsError {
	constructor(questId: number) {
		super(`Quest with ID ${questId} not found`);
		this.name = 'QuestNotFoundError';
	}
}

export class QuestSubmissionNotFoundError extends QuestsError {
	constructor(submissionId: number) {
		super(`Quest submission with ID ${submissionId} not found`);
		this.name = 'QuestSubmissionNotFoundError';
	}
}

export class TeamNotFoundError extends QuestsError {
	constructor(teamId: number) {
		super(`Team with ID ${teamId} not found`);
		this.name = 'TeamNotFoundError';
	}
}

export class NotTeamMemberError extends QuestsError {
	constructor(userId: number, teamId: number) {
		super(`User ${userId} is not a member of team ${teamId}`);
		this.name = 'NotTeamMemberError';
	}
}

export interface CreateQuestData {
	name: string;
	description: string;
	totalPoints: number;
	endTime: Date;
	status?: QuestStatus;
}

export interface UpdateQuestData {
	name?: string;
	description?: string;
	totalPoints?: number;
	endTime?: Date;
	status?: QuestStatus;
}

export interface CreateQuestSubmissionData {
	questId: number;
	teamId: number;
	submittedBy: number;
	attachmentUrls: string[];
}

export interface ReviewQuestSubmissionData {
	reviewerId: number;
	status: QuestSubmissionStatus;
	rejectionReason?: string;
}

export interface IQuestRepo {
	createQuest(data: CreateQuestData): Promise<QuestData>;
	getQuests(): Promise<QuestData[]>;
	getQuestById(id: number): Promise<QuestData | null>;
	updateQuest(id: number, data: UpdateQuestData): Promise<QuestData>;
	deleteQuest(id: number): Promise<void>;
	createQuestSubmission(data: CreateQuestSubmissionData): Promise<QuestSubmissionData>;
	getQuestSubmissions(questId: number): Promise<QuestSubmissionData[]>;
	getQuestSubmissionsByTeam(teamId: number): Promise<QuestSubmissionData[]>;
	getQuestSubmissionById(id: number): Promise<QuestSubmissionData | null>;
	reviewQuestSubmission(
		id: number,
		data: ReviewQuestSubmissionData,
		pointsTransactionId?: number
	): Promise<QuestSubmissionData>;
}

export interface IQuestService {
	createQuest(data: CreateQuestData): Promise<QuestData>;
	getQuests(): Promise<QuestData[]>;
	getQuestById(id: number): Promise<QuestData>;
	updateQuest(id: number, data: UpdateQuestData): Promise<QuestData>;
	deleteQuest(id: number): Promise<void>;
	createQuestSubmission(data: CreateQuestSubmissionData): Promise<QuestSubmissionData>;
	getQuestSubmissions(questId: number): Promise<QuestSubmissionData[]>;
	getQuestSubmissionsByTeam(teamId: number): Promise<QuestSubmissionData[]>;
	getQuestSubmissionById(id: number): Promise<QuestSubmissionData>;
	reviewQuestSubmission(id: number, data: ReviewQuestSubmissionData): Promise<QuestSubmissionData>;
}
