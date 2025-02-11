<script lang="ts">
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { PointTransactionData } from '$lib/server/db/types';

	function getStatusBadgeVariant(status: PointTransactionData['status']) {
		const mapping = {
			pending: 'secondary',
			approved: 'default',
			rejected: 'destructive',
			deleted: 'default'
		} satisfies Record<PointTransactionData['status'], BadgeVariant>;

		return mapping[status];
	}

	function getStatusBadgeText(status: PointTransactionData['status']) {
		const mapping = {
			pending: 'Pending',
			approved: 'Approved',
			rejected: 'Rejected',
			deleted: 'Deleted'
		} satisfies Record<PointTransactionData['status'], string>;

		return mapping[status];
	}

	type Reviewer = { name: string };
	type Props = {
		status: PointTransactionData['status'];
		rejectionReason?: string | null;
		reviewer?: Reviewer | null;
	};

	const { status, rejectionReason, reviewer }: Props = $props();

	const className = $derived(
		status === 'approved' ? 'bg-green-700 hover:bg-green-800 text-white' : ''
	);
</script>

{#snippet badge({
	status,
	className
}: {
	status: PointTransactionData['status'];
	className: string;
})}
	<Badge variant={getStatusBadgeVariant(status)} class={className}>
		{getStatusBadgeText(status)}
	</Badge>
{/snippet}

<Tooltip.Provider delayDuration={0}>
	<Tooltip.Root>
		<Tooltip.Trigger>
			{@render badge({ status, className })}
		</Tooltip.Trigger>
		<Tooltip.Content>
			{#if reviewer}
				<p class="text-muted-foreground">
					Reviewed by <span class="text-foreground">{reviewer.name}</span>
				</p>
			{/if}
			{#if status === 'rejected' && rejectionReason}
				<p class="text-muted-foreground">
					Rejection reason: <span class="text-foreground">{rejectionReason}</span>
				</p>
			{/if}
			{#if status === 'pending'}
				<p class="text-muted-foreground">This transaction is not final.</p>
			{/if}
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
