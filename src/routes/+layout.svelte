<script lang="ts">
	import '../app.css';
	import ClerkProvider from 'clerk-sveltekit/client/ClerkProvider.svelte';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import MainSidebar from './_components/Sidebar.svelte';

	let { children, data } = $props();
</script>

<ModeWatcher />
<Toaster />

<ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
	<Sidebar.Provider>
		<MainSidebar isOrganizer={data.isOrganizer} />
		<Sidebar.Inset>
			<main class="flex-1 p-4">
				<Sidebar.Trigger />
				{@render children?.()}
			</main>
		</Sidebar.Inset>
	</Sidebar.Provider>
</ClerkProvider>
