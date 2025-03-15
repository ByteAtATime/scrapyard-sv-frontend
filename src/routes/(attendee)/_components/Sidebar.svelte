<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import SignOutButton from 'clerk-sveltekit/client/SignOutButton.svelte';
	import {
		LayoutDashboard,
		ShoppingBag,
		Trophy,
		UserRoundCog,
		Users,
		Code,
		Vote,
		Scroll
	} from 'lucide-svelte';

	const items = [
		{
			title: 'Dashboard',
			url: '/',
			icon: LayoutDashboard
		},
		{
			title: 'Teams',
			url: '/teams',
			icon: Users
		},
		{
			title: 'Quests',
			url: '/quests',
			icon: Scroll
		},
		{
			title: 'Shop',
			url: '/shop',
			icon: ShoppingBag
		},
		{
			title: 'Leaderboard',
			url: '/leaderboard',
			icon: Trophy
		},
		{
			title: 'Scrapper',
			url: '/scrapper',
			icon: Code
		},
		{
			title: 'Scrap Voting',
			url: '/vote',
			icon: Vote
		}
	];

	type Props = {
		isOrganizer?: boolean;
		hasActiveQuests?: boolean;
	};

	let { isOrganizer, hasActiveQuests }: Props = $props();
</script>

<Sidebar.Root collapsible="icon" variant="inset">
	<Sidebar.Header>
		<div
			class="flex w-full items-center overflow-hidden p-2 transition-[width] group-data-[collapsible=icon]:!w-8"
		>
			<LayoutDashboard class="h-6 w-6 shrink-0" />
			<span class="ml-2 text-lg font-semibold">Scrapyard</span>
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
							{#if item.title === 'Quests' && hasActiveQuests}
								<Sidebar.MenuBadge class="bg-destructive text-destructive-foreground"
									>NEW</Sidebar.MenuBadge
								>
							{/if}
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		{#if isOrganizer}
			<Sidebar.Separator />
			<Sidebar.Group>
				<Sidebar.GroupLabel>Admin</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton>
								{#snippet child({ props })}
									<a href="/organizer" {...props}>
										<UserRoundCog />
										<span>Organizer Dashboard</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}
	</Sidebar.Content>
	<Sidebar.Footer class="flex flex-row items-center justify-between">
		<SignOutButton redirectUrl="/login" />
		<ThemeToggle />
	</Sidebar.Footer>
</Sidebar.Root>
