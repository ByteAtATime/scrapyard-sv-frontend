<script lang="ts">
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { PointTransactionData } from '$lib/server/db/types';

	function getStatusBadgeVariant(status: PointTransactionData['status']) {
		const mapping = {
			pending: 'secondary',
			approved: 'default',
			rejected: 'destructive'
		} satisfies Record<PointTransactionData['status'], BadgeVariant>;

		return mapping[status];
	}

	function getStatusBadgeText(status: PointTransactionData['status']) {
		const mapping = {
			pending: 'Pending',
			approved: 'Approved',
			rejected: 'Rejected'
		} satisfies Record<PointTransactionData['status'], string>;

		return mapping[status];
	}

	type Props = {
		status: PointTransactionData['status'];
		rejectionReason?: string | null;
	};

	const { status, rejectionReason }: Props = $props();

	const className = $derived(
		status === 'approved' ? 'bg-green-700 hover:bg-green-800 text-white' : ''
	);
</script>

{#snippet badge()}
	<Badge variant={getStatusBadgeVariant(status)} class={className}>
		{getStatusBadgeText(status)}
	</Badge>
{/snippet}

{#if status === 'rejected' && rejectionReason}
	<Tooltip.Provider delayDuration={0}>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{@render badge()}
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>
					Reason:
					<span class="text-muted-foreground">{rejectionReason}</span>
				</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{:else}
	{@render badge()}
{/if}
