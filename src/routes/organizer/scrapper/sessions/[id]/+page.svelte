<!-- Session Details Page -->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import AttachmentPreview from '$lib/components/AttachmentPreview.svelte';

	let { data } = $props();

	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' {
		switch (status) {
			case 'active':
				return 'default';
			case 'paused':
				return 'secondary';
			case 'cancelled':
				return 'destructive';
			default:
				return 'default';
		}
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: true,
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	function formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours}h ${mins}m`;
	}
</script>

{#if !data?.session}
	<div class="container mx-auto py-8">
		<div class="text-center">
			<p class="text-muted-foreground">Loading session...</p>
		</div>
	</div>
{:else}
	<div class="container mx-auto space-y-8 py-8">
		<!-- Header -->
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={() => goto('/organizer/scrapper/sessions')}>
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold">Session Details</h1>
				<p class="text-muted-foreground">View session information</p>
			</div>
		</div>

		<!-- Session Info -->
		<div class="grid gap-8 md:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Session Information</Card.Title>
				</Card.Header>
				<Card.Content>
					<dl class="space-y-4">
						<div>
							<dt class="text-sm font-medium text-muted-foreground">User</dt>
							<dd class="text-lg">{data.session.userName}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Status</dt>
							<dd>
								<Badge variant={getStatusVariant(data.session.status)}>
									{data.session.status}
								</Badge>
							</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Started</dt>
							<dd>{formatDate(data.session.startTime)}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Duration</dt>
							<dd>{formatDuration(data.session.duration)}</dd>
						</div>
						{#if data.session.lastPausedAt}
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Last Paused</dt>
								<dd>{formatDate(data.session.lastPausedAt)}</dd>
							</div>
						{/if}
						{#if data.session.completedAt}
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Completed</dt>
								<dd>{formatDate(data.session.completedAt)}</dd>
							</div>
						{/if}
					</dl>
				</Card.Content>
			</Card.Root>

			<!-- Stats -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Session Stats</Card.Title>
				</Card.Header>
				<Card.Content>
					<dl class="space-y-4">
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Has Scrap</dt>
							<dd class="text-lg">{data.stats.scrapsCount > 0 ? 'Yes' : 'No'}</dd>
						</div>
						{#if data.stats.scrapsCount > 0}
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Points</dt>
								<dd class="text-lg">{data.stats.points}</dd>
							</div>
						{/if}
					</dl>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Scrap -->
		{#if data.scraps?.[0]}
			{@const scrap = data.scraps[0]}
			<div class="space-y-4">
				<h2 class="text-2xl font-bold">Scrap</h2>
				<Card.Root>
					<Card.Header>
						<Card.Title>{scrap.title}</Card.Title>
						<Card.Description>{scrap.description}</Card.Description>
					</Card.Header>
					{#if scrap.attachmentUrls.length > 0}
						<Card.Content>
							<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{#each scrap.attachmentUrls as url}
									<div class="aspect-video overflow-hidden rounded-lg">
										<AttachmentPreview {url} />
									</div>
								{/each}
							</div>
						</Card.Content>
					{/if}
					<Card.Footer>
						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground">
								{formatDate(scrap.createdAt)}
							</span>
							<Badge>{scrap.points} points</Badge>
						</div>
					</Card.Footer>
				</Card.Root>
			</div>
		{:else if data.session.status === 'completed'}
			<div class="rounded-lg border p-8 text-center">
				<p class="text-muted-foreground">No scrap was submitted for this session.</p>
			</div>
		{/if}
	</div>
{/if}
