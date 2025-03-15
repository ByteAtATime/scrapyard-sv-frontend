<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {
		Home,
		LayoutDashboard,
		ListChecks,
		Coins,
		UserRoundCog,
		Calendar,
		ShoppingBag,
		Code,
		Vote,
		Video,
		Trophy
	} from 'lucide-svelte';
	import { CONFIG } from '$lib/config';

	const items = [
		{
			title: 'Dashboard',
			url: '/organizer',
			icon: LayoutDashboard
		},
		{
			title: 'Events',
			url: '/organizer/events',
			icon: Calendar
		},
		{
			title: 'Quests',
			url: '/organizer/quests',
			icon: Trophy
		},
		{
			title: `${CONFIG.points.awardVerb} ${CONFIG.points.Plural}`,
			url: '/organizer/points/award',
			icon: Coins
		},
		{
			title: 'Review Transactions',
			url: '/organizer/transactions/review',
			icon: ListChecks
		},
		{
			title: 'Shop',
			url: '/organizer/shop',
			icon: ShoppingBag
		}
	];

	const scrapperItemss = [
		{
			title: 'Scrapper',
			url: '/organizer/scrapper',
			icon: Code
		},
		{
			title: 'Sessions',
			url: '/organizer/scrapper/sessions',
			icon: Calendar
		},
		{
			title: 'Scraps',
			url: '/organizer/scrapper/scraps',
			icon: Video
		},
		{
			title: 'Votes',
			url: '/organizer/scrapper/votes',
			icon: Vote
		}
	];
</script>

<Sidebar.Root collapsible="icon" variant="inset">
	<Sidebar.Header>
		<div
			class="flex w-full items-center overflow-hidden p-2 transition-[width] group-data-[collapsible=icon]:!w-8"
		>
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
			<Sidebar.GroupLabel>Scrapper</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each scrapperItemss as item (item.title)}
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
