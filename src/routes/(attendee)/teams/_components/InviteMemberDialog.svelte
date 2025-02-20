<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle,
		DialogFooter,
		DialogTrigger
	} from '$lib/components/ui/dialog';
	import { UserPlus } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import UserSelect from '$lib/components/user-select/UserSelect.svelte';
	import type { SuperValidated } from 'sveltekit-superforms';

	type InviteFormData = {
		userId: number | undefined;
	};

	let {
		open = $bindable(false),
		maxTeamSize,
		currentMemberCount,
		pendingInvitationsCount,
		form
	}: {
		open?: boolean;
		maxTeamSize: number;
		currentMemberCount: number;
		pendingInvitationsCount: number;
		form: SuperValidated<InviteFormData>;
	} = $props();

	const {
		form: inviteForm,
		errors,
		enhance
	} = superForm(form, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success(result.data?.message ?? 'Invitation sent successfully');
				open = false;
				$inviteForm.userId = undefined;
			} else if (result.type === 'error') {
				toast.error('Failed to send invitation', {
					description: result.error.message
				});
			} else {
				toast.error('Failed to send invitation', {
					description: 'Please try again later'
				});
			}
		}
	});

	// Helper to get the first error message
	const getFirstError = (field: unknown): string | undefined => {
		if (!field || typeof field !== 'object') return undefined;
		if ('_errors' in field && Array.isArray(field._errors)) {
			return field._errors[0];
		}
		return undefined;
	};
</script>

<Dialog bind:open>
	<DialogTrigger>
		<Button
			variant="outline"
			size="sm"
			disabled={currentMemberCount + pendingInvitationsCount >= maxTeamSize}
		>
			<UserPlus class="mr-2 size-4" />
			Invite Member
		</Button>
	</DialogTrigger>
	<DialogContent class="sm:max-w-[425px]">
		<form method="POST" action="?/invite" use:enhance>
			<DialogHeader>
				<DialogTitle>Invite Team Member</DialogTitle>
				<DialogDescription>
					Invite a participant to join your team. They will need to accept the invitation. Your team
					can have up to {maxTeamSize} members.
					{#if pendingInvitationsCount > 0}
						You currently have {pendingInvitationsCount} pending invitation{pendingInvitationsCount ===
						1
							? ''
							: 's'}.
					{/if}
				</DialogDescription>
			</DialogHeader>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<input type="hidden" name="userId" bind:value={$inviteForm.userId} />
					<UserSelect bind:value={$inviteForm.userId} error={getFirstError($errors.userId)} />
				</div>
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button
					type="submit"
					disabled={currentMemberCount + pendingInvitationsCount >= maxTeamSize}
				>
					Send Invitation
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
