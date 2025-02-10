<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import OrganizerSidebar from './_components/Sidebar.svelte';
</script>

<Sidebar.Provider>
	<OrganizerSidebar />
	<Sidebar.Inset>
		<main class="flex-1 p-4">
			<Sidebar.Trigger />
			<slot />
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
