<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import type { PointTransactionJson } from '$lib/server/points';
	import { Minus, Plus } from 'lucide-svelte';

	type Props = {
		transaction: PointTransactionJson;
	};

	const { transaction }: Props = $props();

	const getStatusColors = (status: string) => {
		switch (status) {
			case 'pending':
				return 'bg-gray-100/50 dark:bg-slate-800/50';
			case 'approved':
				return 'bg-green-100/50 dark:bg-green-900/50';
			case 'rejected':
				return 'bg-red-100/50 dark:bg-red-900/50';
			default:
				return '';
		}
	};

	const getTextColors = (status: string) => {
		switch (status) {
			case 'rejected':
				return transaction.amount > 0
					? 'text-green-600/50 dark:text-green-400/50'
					: 'text-red-600/50 dark:text-red-400/50';
			default:
				return transaction.amount > 0
					? 'text-green-600 dark:text-green-400'
					: 'text-red-600 dark:text-red-400';
		}
	};
</script>

<div class="flex items-center rounded p-4 {getStatusColors(transaction.status)}">
	<div
		class="mr-3 rounded-full p-2 {transaction.amount > 0
			? 'bg-green-200 dark:bg-green-800/50'
			: 'bg-red-100 dark:bg-red-800/50'}"
	>
		{#if transaction.amount > 0}
			<Plus class="h-4 w-4 text-green-600 dark:text-green-400" />
		{:else}
			<Minus class="h-4 w-4 text-red-600 dark:text-red-400" />
		{/if}
	</div>
	<div class="flex items-center gap-2">
		<p class={transaction.status === 'rejected' ? 'text-foreground/50' : 'text-foreground'}>
			{transaction.reason}
		</p>
		<StatusBadge
			status={transaction.status}
			rejectionReason={transaction.rejectionReason}
			reviewer={transaction.reviewer}
		/>
	</div>

	<span class="ml-auto whitespace-nowrap font-mono font-medium {getTextColors(transaction.status)}">
		{transaction.amount > 0 ? '+' : ''}{transaction.amount}
		points
	</span>
</div>
