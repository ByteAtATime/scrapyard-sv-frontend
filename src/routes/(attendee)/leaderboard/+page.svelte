<script lang="ts">
	import Leaderboard from '$lib/components/leaderboard/Leaderboard.svelte';

	let { data } = $props();

	const { leaderboard } = $derived(data);
</script>

<main class="p-4">
	<h1 class="mb-4 text-2xl font-bold">Leaderboard</h1>
	{#if leaderboard.length === 0}
		<p>No data available.</p>
	{:else}
		<Leaderboard {leaderboard} />
	{/if}
</main>
