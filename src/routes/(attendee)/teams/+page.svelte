<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Users } from 'lucide-svelte';
	import { Card } from '$lib/components/ui/card';
	import CreateTeamDialog from './_components/CreateTeamDialog.svelte';
	import InviteMemberDialog from './_components/InviteMemberDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	const formatDate = (date: Date | null) => {
		if (!date) return 'Unknown';
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	};

	const isTeamFull = (memberCount: number) => memberCount >= data.maxTeamSize;
</script>

<div class="container mx-auto p-8">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-4xl font-bold tracking-tight">Team Management</h1>
			<p class="mt-2 text-muted-foreground">
				{#if data.team}
					View and manage your team. Teams can have up to {data.maxTeamSize} members.
				{:else}
					Join or create a team for the hackathon. Teams can have up to {data.maxTeamSize} members.
				{/if}
			</p>
		</div>
		{#if !data.team}
			<CreateTeamDialog {data} />
		{/if}
	</div>

	{#if data.team}
		<div class="space-y-6">
			<Card>
				<div class="p-6">
					<div class="mb-6 flex items-center justify-between">
						<div>
							<h2 class="text-2xl font-semibold">{data.team.name}</h2>
							<p class="mt-2 text-muted-foreground">{data.team.description}</p>
						</div>
						{#if data.team.userRole === 'leader'}
							<InviteMemberDialog
								maxTeamSize={data.maxTeamSize}
								currentMemberCount={data.team.memberCount}
								pendingInvitationsCount={data.outgoingInvitations.filter(
									(inv) => inv.status === 'pending'
								).length}
								form={data.inviteForm}
							/>
						{/if}
					</div>

					<div class="grid gap-6 md:grid-cols-2">
						<div>
							<h3 class="mb-4 text-lg font-medium">Team Members</h3>
							<div class="space-y-4">
								{#each data.team.members as member}
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div class="font-medium">{member.user.name}</div>
											<Badge variant={member.role === 'leader' ? 'default' : 'outline'}>
												{member.role}
											</Badge>
										</div>
										{#if data.team.userRole === 'leader' && member.userId !== member.user.id}
											<Button variant="ghost" size="sm">Remove</Button>
										{/if}
									</div>
								{/each}
							</div>
						</div>

						<div>
							<h3 class="mb-4 text-lg font-medium">Team Details</h3>
							<dl class="space-y-2">
								<div>
									<dt class="text-sm font-medium text-muted-foreground">Created</dt>
									<dd>{formatDate(data.team.createdAt)}</dd>
								</div>
								<div>
									<dt class="text-sm font-medium text-muted-foreground">Last Updated</dt>
									<dd>{formatDate(data.team.updatedAt)}</dd>
								</div>
								<div>
									<dt class="text-sm font-medium text-muted-foreground">Members</dt>
									<dd class="flex items-center gap-2">
										<div class="flex items-center gap-1">
											<Users class="size-4" />
											<span>{data.team.memberCount}/{data.maxTeamSize}</span>
										</div>
										{#if isTeamFull(data.team.memberCount)}
											<Badge variant="secondary">Full</Badge>
										{/if}
									</dd>
								</div>
							</dl>
						</div>
					</div>
				</div>
			</Card>

			{#if data.team.userRole === 'leader' && data.outgoingInvitations.length > 0}
				<Card>
					<div class="p-6">
						<h3 class="mb-4 text-lg font-medium">Team Invitations</h3>
						{#if data.team.memberCount + data.outgoingInvitations.filter((inv) => inv.status === 'pending').length >= data.maxTeamSize}
							<div class="mb-4 rounded-lg bg-muted p-4 text-sm">
								<p>
									You can't invite more members as you've reached the maximum team size including
									pending invitations. Cancel some pending invitations to invite new members.
								</p>
							</div>
						{/if}
						<div class="space-y-4">
							{#each data.outgoingInvitations as invitation}
								<div class="flex items-center justify-between rounded-lg border p-4">
									<div>
										<div class="flex items-center gap-2">
											<div class="font-medium">Invitation sent to {invitation.user.name}</div>
											{#if invitation.status === 'rejected'}
												<Badge variant="destructive">Rejected</Badge>
											{/if}
										</div>
										<p class="text-sm text-muted-foreground">
											{#if invitation.status === 'rejected'}
												Rejected on {formatDate(invitation.responseAt)}
											{:else}
												Sent {formatDate(invitation.createdAt)}
											{/if}
										</p>
									</div>
									{#if invitation.status === 'pending'}
										<form
											method="POST"
											action="?/cancelInvitation"
											use:enhance={() => {
												return async ({ result }) => {
													if (result.type === 'success') {
														toast.success('Invitation cancelled successfully');
													} else if (result.type === 'error') {
														toast.error('Failed to cancel invitation', {
															description: result.error.message
														});
													}
												};
											}}
										>
											<input type="hidden" name="invitationId" value={invitation.id} />
											<Button type="submit" variant="ghost" size="sm">Cancel</Button>
										</form>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</Card>
			{/if}
		</div>
	{:else if data.invitations.length > 0}
		<Card>
			<div class="p-6">
				<h2 class="mb-4 text-2xl font-semibold">Team Invitations</h2>
				<div class="space-y-4">
					{#each data.invitations as invitation}
						<div class="flex items-center justify-between rounded-lg border p-4">
							<div>
								<h3 class="font-medium">{invitation.team.name}</h3>
								<p class="text-sm text-muted-foreground">{invitation.team.description}</p>
							</div>
							<div class="flex items-center gap-2">
								<form
									method="POST"
									action="?/rejectInvitation"
									use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') {
												toast.success('Invitation rejected successfully');
											} else if (result.type === 'error') {
												toast.error('Failed to reject invitation', {
													description: result.error.message
												});
											}
										};
									}}
								>
									<input type="hidden" name="invitationId" value={invitation.id} />
									<Button type="submit" variant="outline">Reject</Button>
								</form>
								<form
									method="POST"
									action="?/acceptInvitation"
									use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') {
												toast.success('Invitation accepted successfully');
											} else if (result.type === 'error') {
												toast.error('Failed to accept invitation', {
													description: result.error.message
												});
											}
										};
									}}
								>
									<input type="hidden" name="invitationId" value={invitation.id} />
									<Button type="submit">Accept</Button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</Card>
	{:else}
		<Card>
			<div class="p-6">
				<div class="text-center text-muted-foreground">
					<p>
						You haven't been invited to any teams yet. Create your own team or wait for an
						invitation.
					</p>
				</div>
			</div>
		</Card>
	{/if}
</div>
