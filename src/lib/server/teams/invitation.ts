import { z } from 'zod';
import type { TeamInvitationData } from './types';
import type { IAuthProvider } from '../auth/types';
import type { ITeamsRepo } from './types';
import type { TeamData } from '../db/types';

export const teamInvitationJsonSchema = z.object({
	id: z.number(),
	teamId: z.number(),
	userId: z.number(),
	invitedBy: z.number(),
	status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	responseAt: z.coerce.date().nullable(),
	user: z.object({
		id: z.number(),
		name: z.string(),
		email: z.string(),
		authProvider: z.enum(['clerk']),
		authProviderId: z.string(),
		isOrganizer: z.boolean()
	}),
	inviter: z.object({
		id: z.number(),
		name: z.string(),
		email: z.string(),
		authProvider: z.enum(['clerk']),
		authProviderId: z.string(),
		isOrganizer: z.boolean()
	}),
	team: z.object({
		id: z.number(),
		name: z.string(),
		description: z.string(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date()
	})
});

export type TeamInvitationJson = z.infer<typeof teamInvitationJsonSchema>;

export class TeamInvitation {
	private _user: { id: number; name: string; email: string } | null = null;
	private _inviter: { id: number; name: string; email: string } | null = null;
	private _team: TeamData | null = null;

	constructor(
		private readonly data: TeamInvitationData,
		private readonly teamsRepo: ITeamsRepo,
		private readonly authProvider: IAuthProvider
	) {}

	public get id(): number {
		return this.data.id;
	}

	public get teamId(): number {
		return this.data.teamId;
	}

	public get userId(): number {
		return this.data.userId;
	}

	public get invitedBy(): number {
		return this.data.invitedBy;
	}

	public get status(): 'pending' | 'accepted' | 'rejected' | 'cancelled' {
		return this.data.status;
	}

	public get createdAt(): Date {
		return new Date(this.data.createdAt);
	}

	public get updatedAt(): Date {
		return new Date(this.data.updatedAt);
	}

	public get responseAt(): Date | null {
		return this.data.responseAt ? new Date(this.data.responseAt) : null;
	}

	private async loadUser(): Promise<void> {
		if (this._user !== null) return;
		this._user = await this.authProvider.getUserById(this.userId);
	}

	private async loadInviter(): Promise<void> {
		if (this._inviter !== null) return;
		this._inviter = await this.authProvider.getUserById(this.invitedBy);
	}

	private async loadTeam(): Promise<void> {
		if (this._team !== null) return;
		const team = await this.teamsRepo.getTeamById(this.teamId);
		if (!team) throw new Error(`Team ${this.teamId} not found`);
		this._team = team;
	}

	public async getUser(): Promise<{ id: number; name: string; email: string }> {
		await this.loadUser();
		return this._user!;
	}

	public async getInviter(): Promise<{ id: number; name: string; email: string }> {
		await this.loadInviter();
		return this._inviter!;
	}

	public async getTeam(): Promise<TeamData> {
		await this.loadTeam();
		return this._team!;
	}

	public async toJson(): Promise<TeamInvitationJson> {
		await Promise.all([this.loadUser(), this.loadInviter(), this.loadTeam()]);

		return teamInvitationJsonSchema.parse({
			...this.data,
			user: this._user!,
			inviter: this._inviter!,
			team: this._team!
		});
	}
}
