<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import {
		Users,
		Calendar,
		Award,
		TrendingUp,
		Crown,
		Target,
		Hash,
		UserCheck,
		type Icon as IconType
	} from 'lucide-svelte';

	let { data } = $props();

	const formatNumber = (num: number) => {
		return new Intl.NumberFormat('en-US', {
			maximumFractionDigits: 1
		}).format(num);
	};

	const formatPercent = (num: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'percent',
			maximumFractionDigits: 1
		}).format(num);
	};
</script>

{#snippet statCard(label: string, value: string | number, Icon: typeof IconType)}
	<Card class="p-6">
		<div class="flex items-center gap-4">
			<div class="rounded-full bg-primary/10 p-3">
				<Icon class="size-6 text-primary" />
			</div>
			<div>
				<p class="text-sm font-medium text-muted-foreground">{label}</p>
				<h2 class="text-3xl font-bold">{value}</h2>
			</div>
		</div>
	</Card>
{/snippet}

{#snippet statRow(
	label: string,
	value: string | number,
	Icon: typeof IconType,
	valueClass = 'font-medium'
)}
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Icon class="size-5 text-primary" />
			<span class="text-muted-foreground">{label}</span>
		</div>
		<span class={valueClass}>{value}</span>
	</div>
{/snippet}

<div class="container mx-auto p-8">
	<div class="mb-8">
		<h1 class="text-4xl font-bold tracking-tight">Organizer Dashboard</h1>
		<p class="mt-2 text-muted-foreground">
			Welcome back! Here's an overview of your events and engagement.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		{@render statCard('Total Events', data.eventStats.totalEvents, Calendar)}
		{@render statCard('Total Attendees', data.eventStats.totalAttendees, Users)}
		{@render statCard(
			'Attendance Rate',
			formatPercent(data.eventStats.averageAttendancePerEvent),
			TrendingUp
		)}
		{@render statCard('Total Points', formatNumber(data.pointsStats.totalPointsAwarded), Award)}
	</div>

	<div class="mt-8 grid gap-4 md:grid-cols-2">
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold">Points Statistics</h3>
			<div class="space-y-4">
				{@render statRow(
					'Average Points per Attendee',
					formatNumber(data.pointsStats.averagePointsPerAttendee),
					Target
				)}
				{@render statRow(
					'Top Point Earner',
					`${data.pointsStats.topEarner.name} (${formatNumber(
						data.pointsStats.topEarner.totalPoints
					)} pts)`,
					Crown,
					'font-medium text-primary underline hover:text-blue-700 dark:hover:text-blue-300'
				)}
			</div>
		</Card>

		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold">Event Engagement</h3>
			<div class="space-y-4">
				{@render statRow('Total Events', data.eventStats.totalEvents, Calendar)}
				{@render statRow('Total Attendees', data.eventStats.totalAttendees, UserCheck)}
				{@render statRow(
					'Attendance Rate',
					formatPercent(data.eventStats.averageAttendancePerEvent),
					Hash
				)}
			</div>
		</Card>
	</div>
</div>
