<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import { CONFIG } from '$lib/config';
	import { ArrowLeft } from 'lucide-svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { createQuestSchema } from '../schema';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { z } from 'zod';

	type PageData = {
		form: SuperValidated<z.infer<typeof createQuestSchema>>;
	};

	const { data } = $props<{ data: PageData }>();

	const { form, errors, enhance, submitting } = superForm(data.form, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Quest created successfully!');
				// Redirect to quests list after successful creation
				window.location.href = '/organizer/quests';
			} else if (result.type === 'failure') {
				toast.error('Failed to create quest', {
					description: result.data?.error?.message ?? 'Please try again later'
				});
			}
		}
	});
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex items-center gap-2">
		<Button variant="outline" size="icon" href="/organizer/quests">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<h1 class="text-3xl font-bold">Create New Quest</h1>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Quest Details</CardTitle>
			<CardDescription>Fill in the details for the new quest</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance class="space-y-6">
				<div class="space-y-2">
					<Label for="name">Quest Name</Label>
					<Input
						type="text"
						id="name"
						name="name"
						bind:value={$form.name}
						placeholder="Scavenger Hunt"
						aria-invalid={$errors.name ? 'true' : undefined}
						aria-describedby="name-error"
					/>
					{#if $errors.name}
						<p id="name-error" class="text-sm text-destructive">{$errors.name}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						name="description"
						bind:value={$form.description}
						placeholder="Details about the quest..."
						rows={3}
						aria-invalid={$errors.description ? 'true' : undefined}
						aria-describedby="description-error"
					/>
					{#if $errors.description}
						<p id="description-error" class="text-sm text-destructive">{$errors.description}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="endTime">End Date & Time</Label>
					<Input
						type="datetime-local"
						id="endTime"
						name="endTime"
						bind:value={$form.endTime}
						aria-invalid={$errors.endTime ? 'true' : undefined}
						aria-describedby="endTime-error"
					/>
					{#if $errors.endTime}
						<p id="endTime-error" class="text-sm text-destructive">{$errors.endTime}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="totalPoints">Total {CONFIG.points.Plural}</Label>
					<Input
						type="number"
						id="totalPoints"
						name="totalPoints"
						bind:value={$form.totalPoints}
						min="1"
						aria-invalid={$errors.totalPoints ? 'true' : undefined}
						aria-describedby="points-error"
					/>
					{#if $errors.totalPoints}
						<p id="points-error" class="text-sm text-destructive">{$errors.totalPoints}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="status">Status</Label>
					<select
						id="status"
						name="status"
						bind:value={$form.status}
						class="w-full rounded-md border border-input bg-background px-3 py-2"
					>
						<option value="active">Active</option>
						<option value="completed">Completed</option>
						<option value="cancelled">Cancelled</option>
					</select>
					{#if $errors.status}
						<p class="text-sm text-destructive">{$errors.status}</p>
					{/if}
				</div>

				<div class="flex justify-end gap-2">
					<Button type="button" variant="outline" href="/organizer/quests">Cancel</Button>
					<Button type="submit" disabled={$submitting}>
						{$submitting ? 'Creating...' : 'Create Quest'}
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
