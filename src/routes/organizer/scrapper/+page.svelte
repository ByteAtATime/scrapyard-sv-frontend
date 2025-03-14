<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ChevronRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';

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
			hour12: true
		}).format(date);
	}

	function formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours}h ${mins}m`;
	}
</script>

{#if !data?.stats}
	<div class="container mx-auto py-8">
		<div class="text-center">
			<p class="text-muted-foreground">Loading dashboard...</p>
		</div>
	</div>
{:else}
	<div class="container mx-auto space-y-8 py-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">Scrapper Management</h1>
				<p class="text-muted-foreground">Manage sessions, scraps, and votes</p>
			</div>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
			<Card.Root>
				<Card.Header>
					<Card.Title>Active Sessions</Card.Title>
					<Card.Description>Currently active scrapping sessions</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="text-3xl font-bold">{data.stats.activeSessions}</div>
				</Card.Content>
				<Card.Footer>
					<Button
						variant="outline"
						class="w-full"
						onclick={() => goto('/organizer/scrapper/sessions')}
					>
						View Sessions
					</Button>
				</Card.Footer>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Today's Scraps</Card.Title>
					<Card.Description>Scraps created today</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="text-3xl font-bold">{data.stats.todayScraps}</div>
				</Card.Content>
				<Card.Footer>
					<Button
						variant="outline"
						class="w-full"
						onclick={() => goto('/organizer/scrapper/scraps')}
					>
						View Scraps
					</Button>
				</Card.Footer>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Today's Votes</Card.Title>
					<Card.Description>Votes cast today</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="text-3xl font-bold">{data.stats.todayVotes}</div>
				</Card.Content>
				<Card.Footer>
					<Button
						variant="outline"
						class="w-full"
						onclick={() => goto('/organizer/scrapper/votes')}
					>
						View Votes
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Recent Sessions</Card.Title>
					<Card.Description>Latest scrapping sessions</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if data.recentSessions.length === 0}
						<p class="text-center text-muted-foreground">No recent sessions</p>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>User</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Started</Table.Head>
									<Table.Head>Duration</Table.Head>
									<Table.Head />
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.recentSessions as session}
									<Table.Row>
										<Table.Cell>{session.userName}</Table.Cell>
										<Table.Cell>
											<Badge variant={getStatusVariant(session.status)}>
												{session.status}
											</Badge>
										</Table.Cell>
										<Table.Cell>{formatDate(session.startTime)}</Table.Cell>
										<Table.Cell>{formatDuration(session.duration)}</Table.Cell>
										<Table.Cell>
											<Button
												variant="ghost"
												size="icon"
												onclick={() => goto(`/organizer/scrapper/sessions/${session.id}`)}
											>
												<ChevronRight class="h-4 w-4" />
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Recent Scraps</Card.Title>
					<Card.Description>Latest submitted scraps</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if data.recentScraps.length === 0}
						<p class="text-center text-muted-foreground">No recent scraps</p>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Title</Table.Head>
									<Table.Head>User</Table.Head>
									<Table.Head>Points</Table.Head>
									<Table.Head>Created</Table.Head>
									<Table.Head />
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.recentScraps as scrap}
									<Table.Row>
										<Table.Cell class="max-w-[200px] truncate">{scrap.title}</Table.Cell>
										<Table.Cell>{scrap.userName}</Table.Cell>
										<Table.Cell>{scrap.points}</Table.Cell>
										<Table.Cell>{formatDate(scrap.createdAt)}</Table.Cell>
										<Table.Cell>
											<Button
												variant="ghost"
												size="icon"
												onclick={() => goto(`/organizer/scrapper/scraps/${scrap.id}`)}
											>
												<ChevronRight class="h-4 w-4" />
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
{/if}
