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
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import { Checkbox } from '$lib/components/ui/checkbox';

	let { data, open = $bindable(false) }: { data: PageData; open: boolean } = $props();

	const { form, errors, enhance, submitting } = superForm(data.form, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Event created successfully!');
				open = false;
			} else if (result.type === 'failure') {
				toast.error('Failed to create event', {
					description: result.data?.error?.message ?? 'Please try again later'
				});
			}
		}
	});

	let isContactOrganizer = $state(true);

	$effect(() => {
		$form.contactOrganizerId = isContactOrganizer ? data.form.data.contactOrganizerId : null;
	});
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Create New Event</DialogTitle>
			<DialogDescription>Fill in the details for the new event</DialogDescription>
		</DialogHeader>

		<form method="POST" use:enhance class="space-y-4">
			<div class="space-y-2">
				<Label for="name">Event Name</Label>
				<Input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="Lunch"
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
					placeholder="Details about the event..."
					rows={3}
					aria-invalid={$errors.description ? 'true' : undefined}
					aria-describedby="description-error"
				/>
				{#if $errors.description}
					<p id="description-error" class="text-sm text-destructive">{$errors.description}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="time">Date & Time</Label>
				<Input
					type="datetime-local"
					id="time"
					name="time"
					bind:value={$form.time}
					aria-invalid={$errors.time ? 'true' : undefined}
					aria-describedby="time-error"
				/>
				{#if $errors.time}
					<p id="time-error" class="text-sm text-destructive">{$errors.time}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="attendancePoints">Attendance Points</Label>
				<Input
					type="number"
					id="attendancePoints"
					name="attendancePoints"
					bind:value={$form.attendancePoints}
					min="0"
					aria-invalid={$errors.attendancePoints ? 'true' : undefined}
					aria-describedby="points-error"
				/>
				{#if $errors.attendancePoints}
					<p id="points-error" class="text-sm text-destructive">{$errors.attendancePoints}</p>
				{/if}
			</div>

			<div class="flex items-center space-x-2">
				<Checkbox id="contact" bind:checked={isContactOrganizer} />
				<Label for="contact">I am the contact organizer for this event</Label>
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={$submitting}>
					{$submitting ? 'Creating...' : 'Create Event'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
