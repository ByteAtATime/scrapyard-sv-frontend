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
	import { toast } from 'svelte-sonner';
	import UserSelect from '$lib/components/user-select/UserSelect.svelte';

	let { teamId, open = $bindable(false) }: { teamId: number; open?: boolean } = $props();

	let selectedUserId = $state<number>();
	let isSubmitting = $state(false);
	let error = $state<string>();

	async function handleSubmit() {
		if (!selectedUserId) {
			error = 'Please select a user to invite';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const formData = new FormData();
			formData.append('teamId', teamId.toString());
			formData.append('userId', selectedUserId.toString());

			const response = await fetch('?/invite', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error);
			}

			toast.success('Invitation sent successfully');
			open = false;
			selectedUserId = undefined;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to send invitation';
			toast.error('Failed to send invitation', {
				description: error
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Dialog bind:open>
	<DialogTrigger>
		<Button variant="outline" size="sm">
			<UserPlus class="mr-2 size-4" />
			Invite Member
		</Button>
	</DialogTrigger>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Invite Team Member</DialogTitle>
			<DialogDescription>
				Invite a participant to join your team. They will need to accept the invitation.
			</DialogDescription>
		</DialogHeader>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<UserSelect bind:value={selectedUserId} {error} />
			</div>
		</div>
		<DialogFooter>
			<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={isSubmitting}>
				{isSubmitting ? 'Sending...' : 'Send Invitation'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
