<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import MainSidebar from './_components/Sidebar.svelte';

	let { children, data } = $props();
	const { isOrganizer, hasActiveQuests } = $derived(data);
</script>

<Sidebar.Provider>
	<MainSidebar {isOrganizer} {hasActiveQuests} />
	<Sidebar.Inset>
		<main class="flex-1 p-4">
			<Sidebar.Trigger />
			{@render children?.()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
