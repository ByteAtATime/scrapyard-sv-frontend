import type { TeamData, TeamMemberData, TeamWithMembersData } from '../db/types';

export interface CreateTeamData {
	name: string;
	description: string;
}

export interface UpdateTeamData {
	name?: string;
	description?: string;
}

export interface AddTeamMemberData {
	userId: number;
	role: 'member' | 'leader';
}

export interface CreateTeamInvitationData {
	teamId: number;
	userId: number;
	invitedBy: number;
}

export interface TeamInvitationData {
	id: number;
	teamId: number;
	userId: number;
	invitedBy: number;
	status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
	createdAt: Date;
	updatedAt: Date;
	responseAt: Date | null;
}

export interface TeamInvitationWithTeamData extends TeamInvitationData {
	team: TeamData;
}

export interface ITeamsRepo {
	createTeam(data: CreateTeamData): Promise<TeamData>;
	updateTeam(teamId: number, data: UpdateTeamData): Promise<TeamData>;
	deleteTeam(teamId: number): Promise<void>;
	getTeamById(teamId: number): Promise<TeamWithMembersData | null>;
	getTeams(): Promise<TeamData[]>;
	getTeamsByUserId(userId: number): Promise<TeamData[]>;

	addTeamMember(teamId: number, data: AddTeamMemberData): Promise<TeamMemberData>;
	removeTeamMember(teamId: number, userId: number): Promise<void>;
	updateTeamMemberRole(
		teamId: number,
		userId: number,
		role: 'member' | 'leader'
	): Promise<TeamMemberData>;
	getTeamMembers(teamId: number): Promise<TeamMemberData[]>;

	createTeamInvitation(data: CreateTeamInvitationData): Promise<TeamInvitationData>;
	getTeamInvitationById(invitationId: number): Promise<TeamInvitationData | null>;
	getTeamInvitationsByUserId(userId: number): Promise<TeamInvitationWithTeamData[]>;
	getTeamInvitationsByTeamId(teamId: number): Promise<TeamInvitationData[]>;
	acceptTeamInvitation(invitationId: number): Promise<TeamInvitationData>;
	rejectTeamInvitation(invitationId: number): Promise<TeamInvitationData>;
	cancelTeamInvitation(invitationId: number): Promise<TeamInvitationData>;
}

export interface ITeamsService {
	createTeam(data: CreateTeamData): Promise<TeamData>;
	updateTeam(teamId: number, data: UpdateTeamData): Promise<TeamData>;
	deleteTeam(teamId: number): Promise<void>;
	getTeamById(teamId: number): Promise<TeamWithMembersData | null>;
	getTeams(): Promise<TeamData[]>;
	getTeamsByUserId(userId: number): Promise<TeamData[]>;

	addTeamMember(teamId: number, data: AddTeamMemberData): Promise<TeamMemberData>;
	removeTeamMember(teamId: number, userId: number): Promise<void>;
	updateTeamMemberRole(
		teamId: number,
		userId: number,
		role: 'member' | 'leader'
	): Promise<TeamMemberData>;
	getTeamMembers(teamId: number): Promise<TeamMemberData[]>;

	inviteToTeam(teamId: number, userId: number, invitedBy: number): Promise<TeamInvitationData>;
	getTeamInvitationById(invitationId: number): Promise<TeamInvitationData | null>;
	getTeamInvitationsByUserId(userId: number): Promise<TeamInvitationWithTeamData[]>;
	getTeamInvitationsByTeamId(teamId: number): Promise<TeamInvitationData[]>;
	acceptTeamInvitation(invitationId: number): Promise<TeamInvitationData>;
	rejectTeamInvitation(invitationId: number): Promise<TeamInvitationData>;
	cancelTeamInvitation(invitationId: number): Promise<TeamInvitationData>;
}
