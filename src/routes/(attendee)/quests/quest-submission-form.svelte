<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { superForm, type SuperValidated } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Loader2, Youtube } from 'lucide-svelte';
	import type { QuestData } from '$lib/server/db/types';
	import type { z } from 'zod';
	import type { questSubmissionSchema } from './schema';

	const { quest, teams, submissionForm } = $props<{
		quest: QuestData;
		teams: { id: number; name: string }[];
		submissionForm: SuperValidated<z.infer<typeof questSubmissionSchema>>;
	}>();

	const { form, errors, enhance, submitting } = superForm(submissionForm, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Quest submission successful');
				// Reset the form
				form.update(($form) => ({
					...$form,
					youtubeUrl: ''
				}));
			} else {
				toast.error('Failed to submit quest', {
					description: result.type === 'error' ? result.error : 'Unknown error'
				});
			}
		}
	});

	// Set the quest ID and team ID when the form is mounted
	$effect(() => {
		$form.questId = quest.id;
		// Use the first team since each user only has one team
		if (teams.length > 0) {
			$form.teamId = teams[0].id;
		}
	});
</script>

<form method="POST" action="?/submit" use:enhance class="space-y-4">
	<input type="hidden" name="questId" value={$form.questId} />
	<input type="hidden" name="teamId" value={$form.teamId} />

	<div class="space-y-2">
		<Label for="youtubeUrl">YouTube Video URL</Label>
		<div class="flex items-center gap-2">
			<Youtube class="h-5 w-5 text-red-600" />
			<Input
				id="youtubeUrl"
				name="youtubeUrl"
				type="url"
				placeholder="https://www.youtube.com/watch?v=..."
				bind:value={$form.youtubeUrl}
				disabled={$submitting}
			/>
		</div>
		{#if $errors.youtubeUrl}
			<p class="text-sm text-destructive">{$errors.youtubeUrl}</p>
		{/if}
		<p class="text-xs text-muted-foreground">
			Paste a link to your YouTube video. Supported formats: youtube.com/watch, youtu.be/,
			youtube.com/shorts
		</p>
	</div>

	<Button type="submit" disabled={$submitting} class="w-full">
		{#if $submitting}
			<Loader2 class="mr-2 h-4 w-4 animate-spin" />
		{/if}
		Submit Quest
	</Button>
</form>
