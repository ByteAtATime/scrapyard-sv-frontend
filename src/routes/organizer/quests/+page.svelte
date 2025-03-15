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
	import { CONFIG } from '$lib/config';
	import { Badge } from '$lib/components/ui/badge';

	type PageData = {
		quests: {
			id: number;
			name: string;
			description: string;
			totalPoints: number;
			endTime: string;
			status: 'active' | 'completed' | 'cancelled';
		}[];
	};

	const { data } = $props<{ data: PageData }>();

	// Function to get status badge variant
	function getStatusVariant(status: string): 'default' | 'destructive' | 'outline' | 'secondary' {
		switch (status) {
			case 'active':
				return 'outline';
			case 'completed':
				return 'secondary';
			case 'cancelled':
				return 'destructive';
			default:
				return 'default';
		}
	}
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Quests</h1>
		<Button href="/organizer/quests/create">
			<Plus class="mr-2 h-4 w-4" />
			Create Quest
		</Button>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>All Quests</CardTitle>
			<CardDescription>Manage and track all quests</CardDescription>
		</CardHeader>
		<CardContent>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>End Date & Time</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>{CONFIG.points.Plural}</TableHead>
						<TableHead class="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#if data.quests.length === 0}
						<TableRow>
							<TableCell colspan={5} class="py-4 text-center">No quests found</TableCell>
						</TableRow>
					{:else}
						{#each data.quests as quest}
							<TableRow>
								<TableCell class="font-medium">{quest.name}</TableCell>
								<TableCell>{formatDate(new Date(quest.endTime))}</TableCell>
								<TableCell>
									<Badge variant={getStatusVariant(quest.status)}>
										{quest.status.charAt(0).toUpperCase() + quest.status.slice(1)}
									</Badge>
								</TableCell>
								<TableCell>{quest.totalPoints}</TableCell>
								<TableCell class="text-right">
									<div class="flex justify-end gap-2">
										<Button variant="outline" size="sm" href="/organizer/quests/{quest.id}">
											View
										</Button>
										<Button variant="outline" size="sm" href="/organizer/quests/{quest.id}/edit">
											Edit
										</Button>
										<Button
											variant="outline"
											size="sm"
											href="/organizer/quests/{quest.id}/submissions"
										>
											Submissions
										</Button>
									</div>
								</TableCell>
							</TableRow>
						{/each}
					{/if}
				</TableBody>
			</Table>
		</CardContent>
	</Card>
</div>
