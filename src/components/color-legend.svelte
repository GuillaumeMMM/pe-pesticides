<script lang="ts">
	let { scale, type, maxDisplayed } = $props();

	const count = 8;

	const splitLength = $derived(scale.domain()[scale.domain().length - 1] / count);
</script>

<div class="container">
	<div class="legend">
		<div>
			{`${new Intl.NumberFormat('en-US').format(maxDisplayed || scale.domain()[scale.domain().length - 1] / 1000)} ${type} tonnes of chemicals`}
		</div>

		<div>0</div>
	</div>
	<div class={`shades ${type}`}>
		{#each Array(count)
			.fill(null)
			.map((_, i) => (i === 0 ? scale(0) : scale((i + 1) * splitLength)))
			.reverse() as color}
			<div style:background-color={color} class="shade"></div>
		{/each}
	</div>
</div>

<style>
	.container {
		width: 400px;
		max-width: 100%;

		.legend {
			width: 100%;
			display: flex;
			justify-content: space-between;
			margin-bottom: 5px;
		}

		.shades {
			display: flex;
			width: 100%;

			.shade {
				flex-grow: 1;
				height: 20px;
			}

			&.exported .shade {
				background: repeating-linear-gradient(
					140deg,
					#ffffff90 0px,
					#ffffff90 4px,
					transparent 4px,
					transparent 8px
				);
			}
		}
	}
</style>
