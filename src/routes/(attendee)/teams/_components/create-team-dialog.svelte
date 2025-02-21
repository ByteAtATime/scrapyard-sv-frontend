<script lang="ts">
	import type { PageData } from '../$types';
	import { superForm } from 'sveltekit-superforms/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle,
		DialogFooter,
		DialogTrigger
	} from '$lib/components/ui/dialog';
	import { Plus } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { data, open = $bindable(false) }: { data: PageData; open?: boolean } = $props();

	const { form, errors, enhance, submitting } = superForm(data.form, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Team created successfully!');
				open = false;
			} else if (result.type === 'failure') {
				toast.error('Failed to create team', {
					description: result.data?.error?.message ?? 'Please try again later'
				});
			}
		}
	});
</script>

<Dialog bind:open>
	<DialogTrigger>
		<Button>
			<Plus class="mr-2 size-4" />
			Create Team
		</Button>
	</DialogTrigger>
	<DialogContent>
		<form method="POST" action="?/create" use:enhance>
			<DialogHeader>
				<DialogTitle>Create Team</DialogTitle>
				<DialogDescription>
					Create a new team for the hackathon. You'll be automatically added as the team leader.
				</DialogDescription>
			</DialogHeader>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label for="name">Team Name</Label>
					<Input
						id="name"
						name="name"
						bind:value={$form.name}
						placeholder="Enter team name"
						aria-invalid={$errors.name ? 'true' : undefined}
						aria-describedby="name-error"
					/>
					{#if $errors.name}
						<p id="name-error" class="text-sm text-destructive">{$errors.name}</p>
					{/if}
				</div>
				<div class="grid gap-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						name="description"
						bind:value={$form.description}
						placeholder="What's your team about?"
						rows={3}
						aria-invalid={$errors.description ? 'true' : undefined}
						aria-describedby="description-error"
					/>
					{#if $errors.description}
						<p id="description-error" class="text-sm text-destructive">
							{$errors.description}
						</p>
					{/if}
				</div>
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={$submitting}>
					{$submitting ? 'Creating...' : 'Create Team'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
