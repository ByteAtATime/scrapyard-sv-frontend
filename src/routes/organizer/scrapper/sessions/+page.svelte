<!-- Sessions List Page -->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { ChevronRight, Search } from 'lucide-svelte';
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();

	// Reactive search state with safe initialization
	let searchInput = $state('');
	$effect(() => {
		if (data?.filters?.search) {
			searchInput = data.filters.search;
		}
	});

	let searchTimeout: ReturnType<typeof setTimeout>;

	// Status filter options
	const statusOptions = [
		{ value: '', label: 'All' },
		{ value: 'active', label: 'Active' },
		{ value: 'paused', label: 'Paused' },
		{ value: 'completed', label: 'Completed' },
		{ value: 'cancelled', label: 'Cancelled' }
	];

	// Page size options
	const pageSizeOptions = [
		{ value: '10', label: '10 per page' },
		{ value: '20', label: '20 per page' },
		{ value: '50', label: '50 per page' },
		{ value: '100', label: '100 per page' }
	];

	// Reactive state for select values
	let selectedStatus = $state(data?.filters?.status || '');
	let selectedPageSize = $state(String(data?.pagination?.pageSize || 20));

	$effect(() => {
		if (data?.filters?.status !== undefined) {
			selectedStatus = data.filters.status || '';
		}
		if (data?.pagination?.pageSize) {
			selectedPageSize = String(data.pagination.pageSize);
		}
	});

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

	// Handle search input with debounce
	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const params = new URLSearchParams(window.location.search);
			params.set('search', searchInput);
			params.set('page', '1'); // Reset to first page on search
			goto(`?${params.toString()}`);
			invalidateAll();
		}, 300);
	}

	// Handle status filter change
	async function handleStatusChange(status: string) {
		const params = new URLSearchParams(window.location.search);
		console.log('status', status);
		if (status) {
			params.set('status', status);
		} else {
			params.delete('status');
		}
		params.set('page', '1'); // Reset to first page on filter change
		await goto(`?${params.toString()}`);
		await invalidateAll();
	}

	// Handle page size change
	async function handlePageSizeChange(size: string) {
		const params = new URLSearchParams(window.location.search);
		params.set('pageSize', size);
		params.set('page', '1'); // Reset to first page on size change
		await goto(`?${params.toString()}`);
		await invalidateAll();
	}

	// Handle pagination
	async function goToPage(page: number) {
		if (page < 1 || page > data.pagination.totalPages) return;
		const params = new URLSearchParams(window.location.search);
		params.set('page', page.toString());
		await goto(`?${params.toString()}`);
		await invalidateAll();
	}
</script>

{#if !data?.sessions || !data?.sessionStats || !data?.pagination || !data?.filters || !data?.statusCounts}
	<div class="container mx-auto py-8">
		<div class="text-center">
			<p class="text-muted-foreground">Loading sessions...</p>
		</div>
	</div>
{:else}
	<div class="container mx-auto space-y-8 py-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">Sessions</h1>
				<p class="text-muted-foreground">Manage scrapping sessions</p>
			</div>
		</div>

		<!-- Status Cards -->
		<div class="grid gap-4 md:grid-cols-4">
			{#each statusOptions.filter((opt) => opt.value) as status}
				<Card.Root>
					<Card.Header>
						<Card.Title>{status.label}</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-3xl font-bold">
							{data.statusCounts[status.value as keyof typeof data.statusCounts]}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Filters -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex flex-1 items-center gap-4">
				<div class="relative max-w-sm flex-1">
					<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Search sessions..."
						class="pl-8"
						bind:value={searchInput}
						oninput={handleSearch}
					/>
				</div>
				<Select.Root type="single" bind:value={selectedStatus} onValueChange={handleStatusChange}>
					<Select.Trigger class="w-[180px]">
						{statusOptions.find((opt) => opt.value === selectedStatus)?.label ?? 'Filter by status'}
					</Select.Trigger>
					<Select.Content>
						{#each statusOptions as option}
							<Select.Item value={option.value} label={option.label}>
								{option.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Show:</span>
				<Select.Root
					type="single"
					bind:value={selectedPageSize}
					onValueChange={handlePageSizeChange}
				>
					<Select.Trigger class="w-[140px]">
						{pageSizeOptions.find((opt) => opt.value === selectedPageSize)?.label ?? '20 per page'}
					</Select.Trigger>
					<Select.Content>
						{#each pageSizeOptions as option}
							<Select.Item value={option.value} label={option.label}>
								{option.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<!-- Sessions Table -->
		{#if data.sessions.length === 0}
			<div class="rounded-lg border p-8 text-center">
				<p class="text-muted-foreground">No sessions found</p>
			</div>
		{:else}
			<div class="rounded-lg border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>User</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Started</Table.Head>
							<Table.Head>Duration</Table.Head>
							<Table.Head>Scraps</Table.Head>
							<Table.Head>Points</Table.Head>
							<Table.Head />
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.sessions as session}
							{@const stats = data.sessionStats[session.id]}
							<Table.Row>
								<Table.Cell>{session.userName}</Table.Cell>
								<Table.Cell>
									<Badge variant={getStatusVariant(session.status)}>
										{session.status}
									</Badge>
								</Table.Cell>
								<Table.Cell>{formatDate(session.startTime)}</Table.Cell>
								<Table.Cell>{formatDuration(session.duration)}</Table.Cell>
								<Table.Cell>{stats.totalScraps}</Table.Cell>
								<Table.Cell>{stats.points}</Table.Cell>
								<Table.Cell>
									<Button
										variant="ghost"
										size="icon"
										href="/organizer/scrapper/sessions/{session.id}"
									>
										<ChevronRight class="h-4 w-4" />
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			<!-- Pagination -->
			<div class="flex items-center justify-between">
				<div class="text-sm text-muted-foreground">
					Showing {(data.pagination.page - 1) * data.pagination.pageSize + 1} to
					{Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)} of
					{data.pagination.total} sessions
				</div>
				<div class="flex gap-2">
					<Button
						variant="outline"
						disabled={data.pagination.page === 1}
						onclick={() => goToPage(data.pagination.page - 1)}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						disabled={data.pagination.page === data.pagination.totalPages}
						onclick={() => goToPage(data.pagination.page + 1)}
					>
						Next
					</Button>
				</div>
			</div>
		{/if}
	</div>
{/if}
