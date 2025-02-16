<script lang="ts">
	import type { LeaderboardEntry } from '$lib/server/points';
	import LeaderboardUser from './LeaderboardUser.svelte';

	type Props = {
		leaderboard: LeaderboardEntry[];
	};

	const { leaderboard }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	{#each leaderboard as entry, i (entry.name)}
		<LeaderboardUser
			name={entry.name}
			rank={i + 1}
			points={entry.totalPoints}
			transactions={entry.transactions}
		/>
	{/each}
</div>
