<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { MoreHorizontal, Users } from 'lucide-svelte';
	import { Card } from '$lib/components/ui/card';
	import CreateTeamDialog from './_components/create-team-dialog.svelte';

	let { data } = $props();

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	};
</script>

<div class="container mx-auto p-8">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-4xl font-bold tracking-tight">Team Management</h1>
			<p class="mt-2 text-muted-foreground">Create and manage teams for your organization.</p>
		</div>
		<CreateTeamDialog {data} />
	</div>

	<Card>
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Description</TableHead>
					<TableHead>Members</TableHead>
					<TableHead>Created</TableHead>
					<TableHead>Last Updated</TableHead>
					<TableHead class="w-[50px]" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each data.teams as team}
					<TableRow>
						<TableCell class="font-medium">{team.name}</TableCell>
						<TableCell>{team.description}</TableCell>
						<TableCell>
							<div class="flex items-center gap-1">
								<Users class="size-4" />
								<span>{team.memberCount}</span>
							</div>
						</TableCell>
						<TableCell>{formatDate(team.createdAt)}</TableCell>
						<TableCell>{formatDate(team.updatedAt)}</TableCell>
						<TableCell>
							<DropdownMenu>
								<DropdownMenuTrigger>
									<Button variant="ghost" class="size-8 p-0">
										<span class="sr-only">Open menu</span>
										<MoreHorizontal class="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem>View Details</DropdownMenuItem>
									<DropdownMenuItem>Edit Team</DropdownMenuItem>
									<DropdownMenuItem class="text-destructive">Delete Team</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	</Card>
</div>
