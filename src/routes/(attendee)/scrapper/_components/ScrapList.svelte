<script lang="ts">
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { z } from 'zod';
	import type { voteSchema } from '../schema';
	import ScrapVotingCard from './ScrapVotingCard.svelte';

	type Props = {
		scraps: Array<{
			id: number;
			title: string;
			description: string;
			attachmentUrls: string[];
			basePoints: number;
			totalPoints: number;
			createdAt: string;
			hasVoted: boolean;
		}>;
		voteForm: SuperValidated<z.infer<typeof voteSchema>>;
	};

	let { scraps, voteForm }: Props = $props();
</script>

<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each scraps as scrap (scrap.id)}
		<ScrapVotingCard {scrap} form={voteForm} />
	{/each}
</div>

{#if scraps.length === 0}
	<div class="flex min-h-[200px] items-center justify-center rounded-md border border-dashed">
		<div class="text-center">
			<h3 class="text-lg font-medium">No scraps yet</h3>
			<p class="text-sm text-muted-foreground">Start a session to create your first scrap!</p>
		</div>
	</div>
{/if}
