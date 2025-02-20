import { z } from 'zod';
import type { TeamData, TeamMemberData } from '../db/types';
import type { IAuthProvider } from '../auth/types';
import type { ITeamsRepo } from './types';

export const teamJsonSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	members: z.array(
		z.object({
			teamId: z.number(),
			userId: z.number(),
			role: z.enum(['member', 'leader']),
			joinedAt: z.coerce.date(),
			user: z.object({
				id: z.number(),
				name: z.string(),
				email: z.string(),
				authProvider: z.enum(['clerk']),
				authProviderId: z.string(),
				isOrganizer: z.boolean()
			})
		})
	),
	memberCount: z.number()
});

export type TeamJson = z.infer<typeof teamJsonSchema>;

export class Team {
	private _members:
		| (TeamMemberData & {
				user: {
					id: number;
					name: string;
					email: string;
					authProvider: 'clerk';
					authProviderId: string;
					isOrganizer: boolean;
				};
		  })[]
		| null = null;

	constructor(
		private readonly data: TeamData,
		private readonly teamsRepo: ITeamsRepo,
		private readonly authProvider: IAuthProvider
	) {}

	public get id(): number {
		return this.data.id;
	}

	public get name(): string {
		return this.data.name;
	}

	public get description(): string {
		return this.data.description;
	}

	public get createdAt(): Date {
		return new Date(this.data.createdAt);
	}

	public get updatedAt(): Date {
		return new Date(this.data.updatedAt);
	}

	private async loadMembers(): Promise<void> {
		if (this._members !== null) return;

		const members = await this.teamsRepo.getTeamMembers(this.id);
		const membersWithUsers = await Promise.all(
			members.map(async (member) => {
				const user = await this.authProvider.getUserById(member.userId);
				if (!user) throw new Error(`User ${member.userId} not found`);
				return {
					...member,
					user
				};
			})
		);
		this._members = membersWithUsers;
	}

	public async getMembers(): Promise<
		(TeamMemberData & {
			user: {
				id: number;
				name: string;
				email: string;
				authProvider: 'clerk';
				authProviderId: string;
				isOrganizer: boolean;
			};
		})[]
	> {
		await this.loadMembers();
		return this._members!;
	}

	public async toJson(): Promise<TeamJson> {
		await this.loadMembers();

		return teamJsonSchema.parse({
			...this.data,
			members: this._members!,
			memberCount: this._members!.length
		});
	}
}
