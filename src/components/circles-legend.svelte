<script lang="ts">
	const { scale } = $props();

	const circlesLegendData = [20000, 10000, 5000, 2000, 1000, 500, 100, 0];
	const diameters = circlesLegendData.map((d) => 2 * scale(d * 1000));
</script>

<div class="container">
	<div class="legend">
		<strong class="mdf-emphasis">Exports of banned pesticides</strong> (in tonnes)
	</div>

	<div class="circles">
		{#each circlesLegendData as d, index}
			<div class="circle-container">
				<div class="circle-legend">{new Intl.NumberFormat('en-US').format(d)}</div>
				<div class="separator" style:height={`${70 - diameters[index]}px`}></div>
				<div
					style:width={`${Math.max(diameters[index], 3)}px`}
					style:height={`${Math.max(diameters[index], 3)}px`}
					class="circle"
				></div>
			</div>
		{/each}
	</div>
</div>

<style>
	.container {
		width: 300px;
		max-width: 100%;

		.legend {
			margin-bottom: 1rem;
		}

		.circles {
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
		}

		.circle-container {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 5px;
		}

		.circle-legend {
			writing-mode: sideways-lr;
		}

		.separator {
			border-left: 1px solid black;
		}

		.circle {
			border-radius: 50%;
			background-color: #333333;
			border: 1px solid white;
		}
	}

	@media (max-width: 50rem) {
		.container {
			width: 200px;
		}
	}
</style>
