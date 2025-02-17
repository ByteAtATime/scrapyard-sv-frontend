import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['./vitest.setup.ts'],
		coverage: {
			provider: 'v8',
			exclude: [
				'src/lib/components/**',
				'./.svelte-kit',
				'src/routes/**/!(api)/**', // non-endpoint routes. TODO: maybe add component tests?
				'src/*.*', // sveltekit files like app.d.ts
				'*.*', // config files in root
				'src/lib/hooks/**', // hooks from shadcn
				'src/lib/utils.ts' // utils from shadcn
			]
		}
	}
});
