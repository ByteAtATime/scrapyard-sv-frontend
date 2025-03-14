<script lang="ts">
	import TransactionCard from './_components/TransactionCard.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import { Coins } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { CONFIG } from '$lib/config';

	let { data } = $props();

	const { user, transactions, totalPoints } = $derived(data);
</script>

<div class="container max-w-3xl py-8">
	<div class="flex items-center gap-4">
		<Avatar.Root class="h-24 w-24 text-4xl">
			{#if user?.avatarUrl}
				<Avatar.Image src={user.avatarUrl} alt={user.name} />
			{/if}
			<Avatar.Fallback>{user?.name?.[0]?.toUpperCase()}</Avatar.Fallback>
		</Avatar.Root>
		<div class="flex-1">
			<h1 class="text-3xl font-bold">{user?.name}</h1>
			<div class="mt-2 flex items-center gap-2">
				<Coins class="h-4 w-4 text-yellow-500" />

				<span>
					<span class="text-2xl">{totalPoints}</span>
					<span class="text-lg text-muted-foreground">{CONFIG.points.plural}</span>
				</span>
			</div>
		</div>
	</div>

	<Separator class="my-4" />

	<h2 class="mb-4 text-xl font-semibold">Transaction History</h2>
	<div class="flex flex-col gap-3">
		<Tooltip.Provider delayDuration={0} disableHoverableContent>
			{#each transactions ?? [] as transaction}
				<TransactionCard {transaction} />
			{/each}
			{#if !transactions?.length}
				<p class="text-center text-muted-foreground">No transactions found</p>
			{/if}
		</Tooltip.Provider>
	</div>
</div>
