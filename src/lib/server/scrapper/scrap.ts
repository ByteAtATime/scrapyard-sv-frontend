import { z } from 'zod';
import type { ScrapData } from '../db/types';
import type { IAuthProvider } from '../auth';
import { selectUserSchema } from '../db/types';

export const scrapJsonSchema = z.object({
	id: z.number(),
	sessionId: z.number(),
	title: z.string(),
	description: z.string(),
	attachmentUrls: z.array(z.string()),
	basePoints: z.number(),
	totalPoints: z.number(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	author: selectUserSchema,
	votesCount: z.number().optional()
});

export type ScrapJson = z.infer<typeof scrapJsonSchema>;

export class Scrap {
	constructor(
		private readonly data: ScrapData,
		private readonly authProvider: IAuthProvider,
		private readonly votesCount: number = 0
	) {}

	public get id() {
		return this.data.id;
	}

	public get sessionId() {
		return this.data.sessionId;
	}

	public get title() {
		return this.data.title;
	}

	public get description() {
		return this.data.description;
	}

	public get attachmentUrls(): string[] {
		return Array.isArray(this.data.attachmentUrls)
			? this.data.attachmentUrls
			: [this.data.attachmentUrls].filter(Boolean);
	}

	public get basePoints() {
		return this.data.basePoints;
	}

	public get totalPoints() {
		return this.data.totalPoints;
	}

	public get createdAt() {
		return this.data.createdAt;
	}

	public get updatedAt() {
		return this.data.updatedAt;
	}

	/**
	 * Get the number of votes this scrap has received
	 */
	public getVotesCount() {
		return this.votesCount;
	}

	/**
	 * Calculate the total points for this scrap including base points and vote bonuses
	 */
	public calculateTotalPoints(
		basePoints: number,
		votesCount: number,
		pointsPerVote: number
	): number {
		return basePoints + votesCount * pointsPerVote;
	}

	public async toJson(): Promise<ScrapJson> {
		const authorId = await this.getUserIdFromSession();
		const author = authorId ? await this.authProvider.getUserById(authorId) : null;

		return {
			id: this.id,
			sessionId: this.sessionId,
			title: this.title,
			description: this.description,
			attachmentUrls: this.attachmentUrls,
			basePoints: this.basePoints,
			totalPoints: this.totalPoints,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			author: author!,
			votesCount: this.votesCount
		};
	}

	private async getUserIdFromSession(): Promise<number | null> {
		// In a real implementation, this would query the database to get the userId from the session
		// For now, we'll return null as this would be implemented when we add the session-to-scrap relationship
		return null;
	}
}
