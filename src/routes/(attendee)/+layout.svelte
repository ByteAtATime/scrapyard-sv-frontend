<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import MainSidebar from './_components/Sidebar.svelte';

	let { children, data } = $props();
</script>

<Sidebar.Provider>
	<MainSidebar isOrganizer={data.isOrganizer} />
	<Sidebar.Inset>
		<main class="flex-1 p-4">
			<Sidebar.Trigger />
			{@render children?.()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
