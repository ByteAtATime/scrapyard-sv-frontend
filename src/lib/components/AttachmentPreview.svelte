<script lang="ts">
	let { url, class: className = '' }: { url: string; class?: string } = $props();

	const getYoutubeVideoId = (url: string): string | null => {
		// Handle youtube.com/watch?v= format
		let match = url.match(
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/
		);
		return match ? match[1] : null;
	};

	const attachmentType = $derived.by(() => {
		// Check if it's a YouTube URL
		const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

		if (isYoutube) {
			return { isYoutube: true, isImage: false, isVideo: false };
		}

		const extension = url.split('.').pop()?.toLowerCase();
		return {
			isYoutube: false,
			isImage: ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension ?? ''),
			isVideo: ['mp4', 'webm', 'ogg'].includes(extension ?? '')
		};
	});

	const youtubeEmbedUrl = $derived.by(() => {
		if (!attachmentType.isYoutube) return '';
		const videoId = getYoutubeVideoId(url);
		return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
	});
</script>

{#if attachmentType.isYoutube}
	<a href={url} target="_blank" rel="noopener noreferrer" class="h-full w-full {className}">
		{#if youtubeEmbedUrl}
			<iframe
				src={youtubeEmbedUrl}
				title="YouTube video"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
				class="h-full w-full rounded-lg"
			></iframe>
		{:else}
			<div class="flex h-full w-full items-center justify-center rounded-lg bg-muted">
				<span class="text-sm text-muted-foreground">YouTube Video</span>
			</div>
		{/if}
	</a>
{:else if attachmentType.isImage}
	<a href={url} target="_blank" rel="noopener noreferrer">
		<img
			src={url}
			alt="Attachment"
			class="h-full w-full rounded-lg object-cover {className}"
			loading="lazy"
		/>
	</a>
{:else if attachmentType.isVideo}
	<!-- svelte-ignore a11y_media_has_caption -- user generated content -->
	<video class="h-full w-full rounded-lg {className}" controls preload="metadata">
		<source src={url} type="video/{url.split('.').pop()}" />
		Your browser does not support the video tag.
	</video>
{:else}
	<div class="flex h-full w-full items-center justify-center rounded-lg bg-muted {className}">
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			class="text-sm text-muted-foreground hover:underline"
		>
			Open attachment
		</a>
	</div>
{/if}
