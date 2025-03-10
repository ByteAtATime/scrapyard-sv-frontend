<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { superForm, type SuperValidated } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Loader2, ImagePlus, X } from 'lucide-svelte';
	import { onDestroy } from 'svelte';
	import type { scrapSchema } from './schema';
	import { z } from 'zod';

	const { form: uploadForm }: { form: SuperValidated<z.infer<typeof scrapSchema>> } = $props();

	const { form, errors, enhance, submitting } = superForm(uploadForm, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Session completed and scrap submitted successfully');
				open = false; // Close dialog on success
			} else {
				toast.error('Failed to complete session', {
					description: result.type === 'error' ? result.error : 'Unknown error'
				});
			}
		}
	});

	let open = $state(false);
	let previewImages = $state<{ url: string; file: File }[]>([]);

	function handleImageSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files?.length) return;

		const newFiles = Array.from(input.files);
		const existingFiles = $form.images || [];
		const totalFiles = existingFiles.length + newFiles.length;

		if (totalFiles > 5) {
			toast.error('Maximum 5 images allowed');
			return;
		}

		// Create preview URLs and update form data
		newFiles.forEach((file) => {
			const url = URL.createObjectURL(file);
			previewImages = [...previewImages, { url, file }];
		});

		$form.images = [...existingFiles, ...newFiles];
	}

	function removeImage(index: number) {
		URL.revokeObjectURL(previewImages[index].url);
		previewImages = previewImages.filter((_, i: number) => i !== index);
		$form.images = ($form.images || []).filter((_, i: number) => i !== index);
	}

	onDestroy(() => {
		// Clean up object URLs
		previewImages.forEach((img) => URL.revokeObjectURL(img.url));
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		<Button variant="default">Complete Session & Create Scrap</Button>
	</Dialog.Trigger>

	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Complete Session</Dialog.Title>
			<Dialog.Description>
				Document your work to complete the session and earn points.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/complete"
			enctype="multipart/form-data"
			use:enhance
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="title">Title</Label>
				<Input
					id="title"
					name="title"
					bind:value={$form.title}
					placeholder="Enter a title for your scrap"
					class={$errors.title ? 'border-destructive' : ''}
				/>
				{#if $errors.title}
					<p class="text-sm text-destructive">{$errors.title}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					name="description"
					bind:value={$form.description}
					placeholder="Describe what you've accomplished"
					class={$errors.description ? 'border-destructive' : ''}
				/>
				{#if $errors.description}
					<p class="text-sm text-destructive">{$errors.description}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label>Images</Label>
				<div class="grid grid-cols-3 gap-2">
					{#each previewImages as { url }, i}
						<div class="relative aspect-square">
							<img src={url} alt="Upload preview" class="h-full w-full rounded-md object-cover" />
							<button
								type="button"
								class="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
								onclick={() => removeImage(i)}
							>
								<X class="h-3 w-3" />
							</button>
						</div>
					{/each}
					{#if previewImages.length < 5}
						<label
							class="flex aspect-square cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40"
						>
							<input
								type="file"
								name="images"
								accept="image/*"
								multiple
								class="hidden"
								onchange={handleImageSelect}
								disabled={$submitting}
							/>
							<ImagePlus class="h-6 w-6" />
						</label>
					{/if}
				</div>
				{#if $errors.images}
					<p class="text-sm text-destructive">{$errors.images}</p>
				{/if}
			</div>

			<Dialog.Footer>
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Complete Session & Submit
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
