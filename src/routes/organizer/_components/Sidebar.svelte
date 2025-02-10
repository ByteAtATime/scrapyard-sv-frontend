<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Home, LayoutDashboard, ListChecks, Coins, UserRoundCog } from 'lucide-svelte';

	const items = [
		{
			title: 'Events',
			url: '/organizer/events',
			icon: LayoutDashboard
		},
		{
			title: 'Award Points',
			url: '/organizer/points/award',
			icon: Coins
		},
		{
			title: 'Review Transactions',
			url: '/organizer/transactions/review',
			icon: ListChecks
		}
	];
</script>

<Sidebar.Root collapsible="icon" variant="inset">
	<Sidebar.Header>
		<div class="flex items-center overflow-hidden p-2">
			<UserRoundCog class="h-6 w-6 shrink-0" />

			<span class="ml-2 text-lg font-semibold">Organizer</span>
		</div>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each items as item (item.title)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton>
								{#snippet child({ props })}
									<a href={item.url} {...props}>
										<item.icon />
										<span>{item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		<Sidebar.Separator />
		<Sidebar.Group>
			<Sidebar.GroupLabel>Actions</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props })}
								<a href="/" {...props}>
									<Home />
									<span>Back to App</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>
