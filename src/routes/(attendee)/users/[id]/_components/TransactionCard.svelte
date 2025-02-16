<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import type { PointTransactionJson } from '$lib/server/points';
	import { Minus, Plus } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';

	let { transaction }: { transaction: PointTransactionJson } = $props();

	const status = $derived(transaction.status);
	const amount = $derived(transaction.amount);
	const isPositive = $derived(amount > 0);
	const isRejected = $derived(status === 'rejected');

	const statusColors = $derived.by(() => {
		switch (status) {
			case 'pending':
				return 'bg-muted hover:bg-muted/80';
			case 'approved':
				return 'bg-green-100 hover:bg-green-100/80 dark:bg-green-900/20 dark:hover:bg-green-900/30';
			case 'rejected':
				return 'bg-red-100 hover:bg-red-100/80 dark:bg-red-900/20 dark:hover:bg-red-900/30';
			default:
				return '';
		}
	});

	const iconColors = $derived.by(() => {
		const baseColor = isPositive
			? 'text-green-600 dark:text-green-400'
			: 'text-red-600 dark:text-red-400';
		return isRejected ? baseColor.replace(/text-/g, 'text-opacity-50 text-') : baseColor;
	});

	const amountColors = $derived.by(() => {
		const baseColor = isPositive
			? 'text-green-600 dark:text-green-400'
			: 'text-red-600 dark:text-red-400';
		return isRejected ? baseColor.replace(/text-/g, 'text-opacity-50 text-') : baseColor;
	});

	const iconBackgroundColor = $derived.by(() =>
		isPositive ? 'bg-green-200 dark:bg-green-900/50' : 'bg-red-200 dark:bg-red-900/50'
	);

	const formattedDate = $derived(
		transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : null
	);
</script>

{#snippet transactionCard()}
	<div
		class={cn(
			'rounded-xl transition-colors duration-200',
			statusColors,
			isRejected && 'opacity-75'
		)}
	>
		<div class="flex items-center gap-4 p-4">
			<div
				class={cn(
					'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
					iconBackgroundColor
				)}
			>
				{#if isPositive}
					<Plus class={cn('h-5 w-5', iconColors)} />
				{:else}
					<Minus class={cn('h-5 w-5', iconColors)} />
				{/if}
			</div>

			<div class="flex flex-1 flex-col gap-1">
				<p
					class={cn(
						'line-clamp-2 text-left text-sm',
						isRejected ? 'text-muted-foreground' : 'text-foreground'
					)}
				>
					{transaction.reason}
				</p>
				<div class="flex items-center gap-2">
					<StatusBadge {status} showTooltip={false} />
					{#if formattedDate}
						<span class="text-xs text-muted-foreground">{formattedDate}</span>
					{/if}
				</div>
			</div>

			<div class={cn('ml-auto whitespace-nowrap font-mono text-lg font-medium', amountColors)}>
				{isPositive ? '+' : ''}{amount}
			</div>
		</div>
	</div>
{/snippet}

{#snippet tooltipContent()}
	{#if transaction.reviewer}
		<p class="text-muted-foreground">
			Reviewed by <span class="text-foreground">{transaction.reviewer.name}</span>
		</p>
	{/if}
	{#if isRejected && transaction.rejectionReason}
		<p class="text-muted-foreground">
			Rejection reason: <span class="text-foreground">{transaction.rejectionReason}</span>
		</p>
	{/if}
	{#if status === 'pending'}
		<p class="text-muted-foreground">This transaction is not final.</p>
	{/if}
{/snippet}

<Tooltip.Root>
	<Tooltip.Trigger class="block w-full">
		{@render transactionCard()}
	</Tooltip.Trigger>
	<Tooltip.Content sideOffset={-40}>
		{@render tooltipContent()}
	</Tooltip.Content>
</Tooltip.Root>
