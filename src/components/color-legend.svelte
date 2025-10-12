<script lang="ts">
	let { scale, splitLength, count, type } = $props();
</script>

<div class="container">
	<div class="legend">
		<div>
			{`${new Intl.NumberFormat('en-US').format(scale.domain()[scale.domain().length - 1] / 1000)} ${type} tons of chemicals`}
		</div>

		<div>0</div>
	</div>
	<div class={`shades ${type}`}>
		{#each Array(count + 1)
			.fill(null)
			.map((_, i) => scale(i * splitLength))
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
					135deg,
					#ffffff90 0px,
					#ffffff90 4px,
					transparent 4px,
					transparent 8px
				);
			}
		}
	}
</style>
