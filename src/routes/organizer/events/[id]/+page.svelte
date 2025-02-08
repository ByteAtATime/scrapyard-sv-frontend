<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { formatDate } from '$lib/utils/date';

	const { data } = $props<{
		event: {
			id: number;
			name: string;
			description: string;
			time: string;
			attendancePoints: number;
		};
		attendance: Array<{
			userId: number;
			userName: string;
			checkInTime: string;
			checkedInBy: string;
		}>;
	}>();

	const { form, errors, enhance, submitting } = superForm(
		{
			userId: ''
		},
		{
			onResult: ({ result }) => {
				if (result.type === 'success') {
					toast.success('User checked in successfully!');
				} else if (result.type === 'error') {
					toast.error('Failed to check in user', {
						description: result.error?.message ?? 'Please try again later'
					});
				} else {
					toast.error('Failed to check in user', {
						description: 'Please try again later'
					});
				}
			}
		}
	);
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">{data.event.name}</h1>
		<Button variant="outline" href="/organizer/events">Back to Events</Button>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Event Details</CardTitle>
				<CardDescription>View and manage event information</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div>
					<Label>Date & Time</Label>
					<p class="text-lg">{formatDate(new Date(data.event.time))}</p>
				</div>
				<div>
					<Label>Description</Label>
					<p class="text-muted-foreground">{data.event.description}</p>
				</div>
				<div>
					<Label>Attendance Points</Label>
					<p class="text-lg">{data.event.attendancePoints} points</p>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Check In User</CardTitle>
				<CardDescription>Record attendance for this event</CardDescription>
			</CardHeader>
			<CardContent>
				<form method="POST" use:enhance class="space-y-4">
					<div class="space-y-2">
						<Label for="userId">User ID</Label>
						<Input
							autofocus
							type="text"
							id="userId"
							name="userId"
							bind:value={$form.userId}
							placeholder="Enter user ID"
							aria-invalid={$errors.userId ? 'true' : undefined}
							aria-describedby="userId-error"
						/>
						{#if $errors.userId}
							<p id="userId-error" class="text-sm text-destructive">{$errors.userId}</p>
						{/if}
					</div>

					<Button type="submit" class="w-full" disabled={$submitting}>
						{$submitting ? 'Checking In...' : 'Check In User'}
					</Button>
				</form>
			</CardContent>
		</Card>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Attendance List</CardTitle>
			<CardDescription>View all attendees for this event</CardDescription>
		</CardHeader>
		<CardContent>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>User ID</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Check-in Time</TableHead>
						<TableHead>Checked in by</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.attendance as record}
						<TableRow>
							<TableCell>{record.userId}</TableCell>
							<TableCell>{record.userName}</TableCell>
							<TableCell>{formatDate(new Date(record.checkInTime))}</TableCell>
							<TableCell>{record.checkedInBy}</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</CardContent>
	</Card>
</div>
