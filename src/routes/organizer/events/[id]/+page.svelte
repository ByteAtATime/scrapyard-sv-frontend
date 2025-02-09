<script lang="ts">
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
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { formatDate } from '$lib/utils/date';
	import RapidCheckIn from './_components/RapidCheckIn.svelte';
	import { invalidateAll } from '$app/navigation';

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

	async function handleCheckIn(userId: number) {
		try {
			const response = await fetch(`/api/v1/events/${data.event.id}/check-in`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ userId })
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400) {
					throw new Error(result.error ?? 'Invalid request');
				} else if (response.status === 404) {
					throw new Error(result.error ?? 'User or event not found');
				} else if (response.status === 401) {
					throw new Error(result.error ?? 'You are not authorized to check in users');
				} else {
					throw new Error(result.error ?? 'Failed to check in user');
				}
			}

			toast.success('Check-in successful', {
				description: 'User has been checked in to the event'
			});
			await invalidateAll();
			return true;
		} catch (error) {
			console.error('Error checking in user:', error);
			if (error instanceof Error) {
				toast.error('Check-in failed', {
					description: error.message
				});
			} else {
				toast.error('Failed to check in user', {
					description: 'An unexpected error occurred'
				});
			}
			return false;
		}
	}
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
				<CardDescription>Scan barcode or enter user ID to check in</CardDescription>
			</CardHeader>
			<CardContent>
				<RapidCheckIn onCheckIn={handleCheckIn} />
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
