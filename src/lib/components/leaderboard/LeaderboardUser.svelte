<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import type { PointTransactionData } from '$lib/server/db/types';

	type Props = {
		name: string;
		rank: number;
		points: number;
		transactions: PointTransactionData[];
	};

	const { name, rank, points, transactions }: Props = $props();
</script>

<Popover.Root>
	<Popover.Trigger class="w-full">
		<div class="flex items-center justify-between rounded-md bg-muted p-3">
			<div class="flex items-center space-x-3">
				<span class="w-6 text-center text-lg font-semibold">
					{rank}
				</span>
				<span>
					<span class="font-semibold">{name}</span>
				</span>
			</div>
			<span class="font-semibold">{points} Points</span>
		</div>
	</Popover.Trigger>
	<Popover.Content>
		<h3 class="font-semibold">Transactions</h3>

		<div class="flex flex-col gap-2">
			{#each transactions as entry}
				<div class="flex items-center gap-1">
					<span class="text-sm text-muted-foreground">{entry.reason}</span>
					<span class="ml-auto">{entry.amount > 0 ? '+' : ''}{entry.amount}</span>
				</div>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>
