<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ChevronLeft, ChevronRight, Search, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { data, form } = $props();

	// Format date for display
	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		}).format(new Date(date));
	}

	// Format number with commas
	function formatNumber(num: number): string {
		return num.toLocaleString();
	}

	// Handle pagination
	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', page.toString());
		goto(url.toString());
	}

	// Handle filter form submission
	function handleFilterSubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const url = new URL(window.location.href);

		// Clear existing params
		url.searchParams.delete('userId');
		url.searchParams.delete('scrapId');
		url.searchParams.set('page', '1');

		// Add new params
		const userId = formData.get('userId') as string;
		const scrapId = formData.get('scrapId') as string;

		if (userId) url.searchParams.set('userId', userId);
		if (scrapId) url.searchParams.set('scrapId', scrapId);

		goto(url.toString());
	}

	// Clear filters
	function clearFilters() {
		const url = new URL(window.location.href);
		url.searchParams.delete('userId');
		url.searchParams.delete('scrapId');
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	// Show toast notification if form action was processed
	$effect(() => {
		if (form?.success) {
			toast.success('Vote has been deleted', {
				description:
					form.message || 'The vote and its associated point transactions were successfully removed'
			});
			// Refresh the page data after a successful operation
			goto(page.url.pathname + page.url.search, { invalidateAll: true });
		} else if (form?.error) {
			toast.error('Error', {
				description: form.error
			});
		}
	});
</script>

<div class="container mx-auto space-y-8 py-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Vote Management</h1>
			<p class="text-muted-foreground">Monitor and manage voting activity</p>
		</div>
		<Button href="/organizer/scrapper">Back to Dashboard</Button>
	</div>

	{#if !data || !data.voteStats}
		<div class="flex flex-col items-center justify-center space-y-4 p-8">
			<p class="text-lg text-muted-foreground">Loading vote statistics...</p>
			<div class="h-4 w-32 animate-pulse rounded bg-muted"></div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium">Total Votes</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{formatNumber(data.voteStats.totalVotes)}</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium">Last Hour</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{formatNumber(data.voteStats.lastHourVotes)}</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium">Last 24 Hours</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{formatNumber(data.voteStats.last24HourVotes)}</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium">Avg. Votes Per User</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{data.voteStats.averageVotesPerUser.toFixed(1)}</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			<div class="md:col-span-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Vote History</Card.Title>
						<Card.Description>View and manage all votes cast in the system</Card.Description>
					</Card.Header>
					<Card.Content>
						<!-- Filters -->
						<form class="mb-4 space-y-4" onsubmit={handleFilterSubmit}>
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<Label for="userId">User ID</Label>
									<Input
										id="userId"
										name="userId"
										type="number"
										placeholder="Filter by user ID"
										value={data.filters.userId || ''}
									/>
								</div>
								<div>
									<Label for="scrapId">Scrap ID</Label>
									<Input
										id="scrapId"
										name="scrapId"
										type="number"
										placeholder="Filter by scrap ID"
										value={data.filters.scrapId || ''}
									/>
								</div>
							</div>
							<div class="flex justify-between">
								<Button type="submit" class="flex items-center gap-2">
									<Search class="h-4 w-4" />
									Apply Filters
								</Button>
								{#if data.filters.userId || data.filters.scrapId}
									<Button
										type="button"
										variant="outline"
										onclick={clearFilters}
										class="flex items-center gap-2"
									>
										<X class="h-4 w-4" />
										Clear Filters
									</Button>
								{/if}
							</div>
						</form>

						<!-- Votes Table -->
						{#if !data.votes}
							<div class="flex items-center justify-center p-8">
								<p class="text-muted-foreground">Loading votes...</p>
							</div>
						{:else}
							<div class="rounded-md border">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>ID</Table.Head>
											<Table.Head>User</Table.Head>
											<Table.Head>Voted For</Table.Head>
											<Table.Head>Against</Table.Head>
											<Table.Head>Time</Table.Head>
											<Table.Head class="text-right">Actions</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#if data.votes.length === 0}
											<Table.Row>
												<Table.Cell colspan={6} class="py-4 text-center">
													No votes found matching the current filters.
												</Table.Cell>
											</Table.Row>
										{:else}
											{#each data.votes as vote}
												<Table.Row>
													<Table.Cell>{vote.id}</Table.Cell>
													<Table.Cell>{vote.userName} (#{vote.userId})</Table.Cell>
													<Table.Cell>
														<div class="max-w-[200px] truncate" title={vote.scrapTitle}>
															{vote.scrapTitle} (#{vote.scrapId})
														</div>
													</Table.Cell>
													<Table.Cell>
														<div class="max-w-[200px] truncate" title={vote.otherScrapTitle}>
															{vote.otherScrapTitle} (#{vote.otherScrapId})
														</div>
													</Table.Cell>
													<Table.Cell>{formatDate(vote.createdAt)}</Table.Cell>
													<Table.Cell class="text-right">
														<form method="POST" action="?/invalidateVote" use:enhance>
															<input type="hidden" name="voteId" value={vote.id} />
															<Button type="submit" variant="destructive" size="sm">Delete</Button>
														</form>
													</Table.Cell>
												</Table.Row>
											{/each}
										{/if}
									</Table.Body>
								</Table.Root>
							</div>
						{/if}

						<!-- Pagination -->
						{#if data.pagination && data.pagination.totalPages > 1}
							<div class="mt-4 flex items-center justify-between">
								<div class="text-sm text-muted-foreground">
									Showing {(data.pagination.page - 1) * data.pagination.pageSize + 1} to {Math.min(
										data.pagination.page * data.pagination.pageSize,
										data.pagination.totalItems
									)} of {data.pagination.totalItems} votes
								</div>
								<div class="flex items-center space-x-2">
									<Button
										variant="outline"
										size="sm"
										disabled={data.pagination.page === 1}
										onclick={() => goToPage(data.pagination.page - 1)}
									>
										<ChevronLeft class="h-4 w-4" />
									</Button>
									{#each Array(Math.min(5, data.pagination.totalPages)) as _, i}
										{@const pageNum = i + 1 + Math.max(0, data.pagination.page - 3)}
										{#if pageNum <= data.pagination.totalPages}
											<Button
												variant={pageNum === data.pagination.page ? 'default' : 'outline'}
												size="sm"
												onclick={() => goToPage(pageNum)}
											>
												{pageNum}
											</Button>
										{/if}
									{/each}
									<Button
										variant="outline"
										size="sm"
										disabled={data.pagination.page === data.pagination.totalPages}
										onclick={() => goToPage(data.pagination.page + 1)}
									>
										<ChevronRight class="h-4 w-4" />
									</Button>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<div>
				<Card.Root>
					<Card.Header>
						<Card.Title>Top Voters</Card.Title>
						<Card.Description>Users with the most votes</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if !data.voteStats.topVoters || data.voteStats.topVoters.length === 0}
							<p class="text-center text-muted-foreground">No voting data available</p>
						{:else}
							<div class="space-y-4">
								{#each data.voteStats.topVoters as voter, i}
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<Badge variant={i < 3 ? 'default' : 'outline'}>{i + 1}</Badge>
											<span>{voter.userName} (#{voter.userId})</span>
										</div>
										<span class="font-medium">{voter.voteCount} votes</span>
									</div>
									{#if i < data.voteStats.topVoters.length - 1}
										<Separator />
									{/if}
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root class="mt-6">
					<Card.Header>
						<Card.Title>User Voting Activity</Card.Title>
						<Card.Description>Recent voting activity by users</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if !data.userVotingActivity || data.userVotingActivity.length === 0}
							<p class="text-center text-muted-foreground">No user activity data available</p>
						{:else}
							<div class="space-y-4">
								{#each data.userVotingActivity.slice(0, 10) as user}
									<div class="flex flex-col gap-1">
										<div class="flex items-center justify-between">
											<span class="font-medium">{user.userName} (#{user.userId})</span>
											<Badge variant={user.totalVotes > 0 ? 'default' : 'secondary'}>
												{user.totalVotes} votes
											</Badge>
										</div>
										<div class="text-sm text-muted-foreground">
											{user.lastVoteTime
												? `Last vote: ${formatDate(user.lastVoteTime)}`
												: 'No votes yet'}
										</div>
									</div>
									{#if user !== data.userVotingActivity[Math.min(9, data.userVotingActivity.length - 1)]}
										<Separator />
									{/if}
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{/if}
</div>
