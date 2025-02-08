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
	import { Plus } from 'lucide-svelte';
	import { formatDate } from '$lib/utils/date';
	import CreateEventDialog from './_components/CreateEventDialog.svelte';

	const { data } = $props();

	let showCreateDialog = $state(false);
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Events</h1>
		<Button onclick={() => (showCreateDialog = true)}>
			<Plus class="mr-2 h-4 w-4" />
			Create Event
		</Button>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>All Events</CardTitle>
			<CardDescription>Manage and track all events</CardDescription>
		</CardHeader>
		<CardContent>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Date & Time</TableHead>
						<TableHead>Points</TableHead>
						<TableHead class="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.events as event}
						<TableRow>
							<TableCell class="font-medium">{event.name}</TableCell>
							<TableCell>{formatDate(new Date(event.time))}</TableCell>
							<TableCell>{event.attendancePoints}</TableCell>
							<TableCell class="text-right">
								<div class="flex justify-end gap-2">
									<Button variant="outline" size="sm" href="/organizer/events/{event.id}">
										View
									</Button>
									<Button variant="outline" size="sm">Edit</Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</CardContent>
	</Card>
</div>

<CreateEventDialog bind:open={showCreateDialog} {data} />
