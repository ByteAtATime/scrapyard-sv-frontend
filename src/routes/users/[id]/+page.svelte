<script lang="ts">
	import TransactionCard from './_components/TransactionCard.svelte';

	let { data } = $props();

	const { user, transactions } = $derived(data);
</script>

<div class="container max-w-2xl">
	<h1 class="text-3xl font-bold">{user?.name}</h1>
	<p>Points: {user?.totalPoints}</p>

	<h2 class="mt-8 text-2xl font-bold">Transactions</h2>
	<div class="mt-4 flex flex-col gap-2">
		{#each transactions ?? [] as transaction}
			<TransactionCard {transaction} />
		{/each}
	</div>
</div>
