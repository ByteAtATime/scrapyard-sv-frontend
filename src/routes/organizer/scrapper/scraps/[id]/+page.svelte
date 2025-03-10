<!-- Scrap Details Page -->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: true,
			month: 'short',
			day: 'numeric'
		}).format(date);
	}
</script>

{#if !data?.scrap || !data?.session}
	<div class="container mx-auto py-8">
		<div class="text-center">
			<p class="text-muted-foreground">Loading scrap...</p>
		</div>
	</div>
{:else}
	<div class="container mx-auto space-y-8 py-8">
		<!-- Header -->
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={() => goto('/organizer/scrapper/scraps')}>
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold">Scrap Details</h1>
				<p class="text-muted-foreground">View scrap information</p>
			</div>
		</div>

		<!-- Content -->
		<div class="grid gap-8 md:grid-cols-2">
			<!-- Scrap Info -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Scrap Information</Card.Title>
				</Card.Header>
				<Card.Content>
					<dl class="space-y-4">
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Title</dt>
							<dd class="text-lg">{data.scrap.title}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Description</dt>
							<dd class="whitespace-pre-wrap">{data.scrap.description}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">User</dt>
							<dd>{data.scrap.userName}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Created</dt>
							<dd>{formatDate(data.scrap.createdAt)}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Points</dt>
							<dd class="text-lg font-semibold">{data.scrap.points}</dd>
						</div>
						{#if data.scrap.attachmentUrls.length > 0}
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Attachments</dt>
								<dd class="mt-2">
									<div class="grid gap-2">
										{#each data.scrap.attachmentUrls as url}
											<a
												href={url}
												target="_blank"
												rel="noopener noreferrer"
												class="text-primary hover:underline"
											>
												View Attachment
											</a>
										{/each}
									</div>
								</dd>
							</div>
						{/if}
					</dl>
				</Card.Content>
			</Card.Root>

			<!-- Session Info -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Session Information</Card.Title>
				</Card.Header>
				<Card.Content>
					<dl class="space-y-4">
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Status</dt>
							<dd class="capitalize">{data.session.status}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Started</dt>
							<dd>{formatDate(data.session.startTime)}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Duration</dt>
							<dd>{Math.floor(data.session.duration / 60)}h {data.session.duration % 60}m</dd>
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
						<div class="pt-2">
							<Button
								variant="outline"
								onclick={() => goto(`/organizer/scrapper/sessions/${data.session.id}`)}
							>
								View Session Details
							</Button>
						</div>
					</dl>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
{/if}
