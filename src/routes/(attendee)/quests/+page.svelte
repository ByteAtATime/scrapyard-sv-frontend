<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { type SuperValidated } from 'sveltekit-superforms/client';
	import { Clock, Award, ClipboardList } from 'lucide-svelte';
	import type { QuestData } from '$lib/server/db/types';
	import type { z } from 'zod';
	import type { questSubmissionSchema } from './schema';
	import QuestSubmissionForm from './quest-submission-form.svelte';

	// Define a type for the page data based on what we know from the server
	type PageData = {
		quests: QuestData[];
		teams: { id: number; name: string }[];
		submissionForm: SuperValidated<z.infer<typeof questSubmissionSchema>>;
	};

	const { data } = $props<{ data: PageData }>();

	// Format date to a readable format
	function formatDate(date: Date): string {
		return new Date(date).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Calculate time remaining
	function getTimeRemaining(endTime: Date): string {
		const now = new Date();
		const end = new Date(endTime);
		const diff = end.getTime() - now.getTime();

		if (diff <= 0) return 'Expired';

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		return `${hours}h ${minutes}m remaining`;
	}
</script>

<div class="container mx-auto py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Quests</h1>
		{#if data.teams.length > 0}
			<a href={`/quests/submissions/${data.teams[0].id}`}>
				<Button variant="outline" class="flex items-center gap-2">
					<ClipboardList class="h-4 w-4" />
					View Team Submissions
				</Button>
			</a>
		{/if}
	</div>

	{#if data.quests.length === 0}
		<div class="rounded-lg border border-dashed p-8 text-center">
			<h2 class="text-xl font-semibold">No Active Quests</h2>
			<p class="mt-2 text-muted-foreground">
				There are no active quests available right now. Check back later!
			</p>
		</div>
	{:else}
		<div class="grid gap-6 md:grid-cols-2">
			{#each data.quests as quest}
				<Card class="h-full">
					<CardHeader>
						<div class="flex items-start justify-between">
							<div>
								<CardTitle>{quest.name}</CardTitle>
								<CardDescription class="mt-1">{quest.description}</CardDescription>
							</div>
							<div
								class="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
							>
								<Award class="h-4 w-4" />
								<span>{quest.totalPoints} points</span>
							</div>
						</div>
					</CardHeader>

					<CardContent>
						<div class="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
							<Clock class="h-4 w-4" />
							<span>Ends: {formatDate(quest.endTime)} ({getTimeRemaining(quest.endTime)})</span>
						</div>

						<QuestSubmissionForm {quest} teams={data.teams} submissionForm={data.submissionForm} />
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
