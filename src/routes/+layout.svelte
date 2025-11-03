<script lang="ts">
	import type { LayoutProps } from './$types';

	const { children }: LayoutProps = $props();
</script>

<main class="container">
	{@render children()}
</main>

<style>
	:global {
		@import '@guillaumemmm/marquedefabrique/reset.css';
		@import '@guillaumemmm/marquedefabrique/variables.css';
		@import '@guillaumemmm/marquedefabrique/kit.css';
	}

	@font-face {
		font-family: 'Source Sans Pro';
		font-style: normal;
		font-weight: 400;
		src: url('https://fonts.gstatic.com/s/sourcesanspro/v23/6xK3dSBYKcSV-LCoeQqfX1RYOo3qOK7lujVj9w.woff2');
		unicode-range:
			U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074,
			U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
	}

	@font-face {
		font-family: 'Source Sans Pro';
		font-style: bold;
		font-weight: 600;
		src: url('https://fonts.gstatic.com/s/sourcesanspro/v23/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwlxdu3cOWxw.woff2');
		unicode-range:
			U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074,
			U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
	}

	.container {
		min-height: 100dvh;
		background: #cccccc;
		display: flex;
		flex-direction: column;
		font-family: 'Source Sans Pro';
	}
</style>
