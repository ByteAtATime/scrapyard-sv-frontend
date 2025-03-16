<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { superForm, type SuperValidated } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Loader2, FilePlus, X, Youtube } from 'lucide-svelte';
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
					attachments: [],
					youtubeUrl: ''
				}));
				// Reset preview files
				previewFiles = [];
			} else {
				toast.error('Failed to submit quest', {
					description: result.type === 'error' ? result.error : 'Unknown error'
				});
			}
		}
	});

	let previewFiles = $state<{ name: string; file: File }[]>([]);

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files?.length) return;

		const newFiles = Array.from(input.files);
		const existingFiles = $form.attachments || [];
		const totalFiles = existingFiles.length + newFiles.length;

		if (totalFiles > 5) {
			toast.error('Maximum 5 files allowed');
			return;
		}

		// Update form data and preview files
		newFiles.forEach((file) => {
			previewFiles = [...previewFiles, { name: file.name, file }];
		});

		$form.attachments = [...existingFiles, ...newFiles];
	}

	function removeFile(index: number) {
		previewFiles = previewFiles.filter((_, i) => i !== index);
		$form.attachments = ($form.attachments || []).filter((_: File, i: number) => i !== index);
	}

	// Set the quest ID and team ID when the form is mounted
	$effect(() => {
		$form.questId = quest.id;
		// Use the first team since each user only has one team
		if (teams.length > 0) {
			$form.teamId = teams[0].id;
		}
	});
</script>

<form method="POST" action="?/submit" enctype="multipart/form-data" use:enhance class="space-y-4">
	<input type="hidden" name="questId" value={$form.questId} />
	<input type="hidden" name="teamId" value={$form.teamId} />

	<div class="space-y-2">
		<Label>Attachments</Label>
		<div class="grid grid-cols-1 gap-2">
			{#each previewFiles as { name }, i}
				<div class="relative flex items-center rounded-md border p-2">
					<span class="flex-1 truncate">{name}</span>
					<button
						type="button"
						class="ml-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
						onclick={() => removeFile(i)}
					>
						<X class="h-3 w-3" />
					</button>
				</div>
			{/each}
			{#if previewFiles.length < 5}
				<label
					class="flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/20 p-4 hover:border-muted-foreground/40"
				>
					<input
						type="file"
						name="attachments"
						accept="image/jpeg, image/png, image/gif, image/webp, application/pdf, application/zip, application/x-zip-compressed"
						multiple
						class="hidden"
						onchange={handleFileSelect}
						disabled={$submitting}
					/>
					<div class="flex flex-col items-center gap-1">
						<FilePlus class="h-6 w-6" />
						<span class="text-sm">Upload files</span>
					</div>
				</label>
			{/if}
		</div>
		{#if $errors.attachments}
			<p class="text-sm text-destructive">{$errors.attachments}</p>
		{/if}
	</div>

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
