<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ChevronRight, Search } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	// Reactive search state with safe initialization
	let searchInput = $state('');
	$effect(() => {
		if (data?.query?.search) {
			searchInput = data.query.search;
		}
	});

	let searchTimeout: ReturnType<typeof setTimeout>;

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: true,
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	// Handle search input with debounce
	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const params = new URLSearchParams(window.location.search);
			params.set('search', searchInput);
			params.set('page', '1'); // Reset to first page on search
			goto(`?${params.toString()}`);
		}, 300);
	}
</script>

{#if !data?.scraps || !data?.stats}
	<div class="container mx-auto py-8">
		<div class="text-center">
			<p class="text-muted-foreground">Loading scraps...</p>
		</div>
	</div>
{:else}
	<div class="container mx-auto space-y-8 py-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">Scraps</h1>
				<p class="text-muted-foreground">View and manage scraps</p>
			</div>
		</div>

		<!-- Stats Cards -->
		<div class="grid gap-4 md:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Today's Scraps</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-3xl font-bold">{data.stats.todayCount}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>This Week's Scraps</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="text-3xl font-bold">{data.stats.weekCount}</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Filters -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex flex-1 items-center gap-4">
				<div class="relative max-w-sm flex-1">
					<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Search scraps..."
						class="pl-8"
						bind:value={searchInput}
						oninput={handleSearch}
					/>
				</div>
			</div>
		</div>

		<!-- Scraps Table -->
		{#if data.scraps.length === 0}
			<div class="rounded-lg border p-8 text-center">
				<p class="text-muted-foreground">No scraps found</p>
			</div>
		{:else}
			<div class="rounded-lg border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>User</Table.Head>
							<Table.Head>Title</Table.Head>
							<Table.Head>Created</Table.Head>
							<Table.Head>Points</Table.Head>
							<Table.Head />
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.scraps as scrap}
							<Table.Row>
								<Table.Cell>{scrap.userName}</Table.Cell>
								<Table.Cell>{scrap.title}</Table.Cell>
								<Table.Cell>{formatDate(scrap.createdAt)}</Table.Cell>
								<Table.Cell>{scrap.points}</Table.Cell>
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
			</div>
		{/if}
	</div>
{/if}
