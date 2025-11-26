<script lang="ts">
	let { colors, type, thresholds } = $props();
</script>

<div class="container">
	<div class="legend">
		<span class="mdf-emphasis"
			>{type === 'import' ? 'Imports' : 'Exports'} of banned pesticides (in tonnes)</span
		>
	</div>
	<div class={`shades ${type}`}>
		{#each [...colors].reverse() as color, index}
			<div class="shade-container">
				<div class="tick">
					>&nbsp;{new Intl.NumberFormat('en-US').format(
						thresholds[thresholds.length - 1 - index] / 1000
					)}
				</div>
				<div style:background-color={color} class="shade"></div>
			</div>
		{/each}
	</div>
</div>

<style>
	.container {
		width: 450px;
		max-width: 100%;

		.legend {
			width: 100%;
			margin-bottom: 5px;
		}

		.shades {
			display: flex;
			width: 100%;

			.shade {
				flex-grow: 1;
				height: 20px;
			}

			.shade-container {
				flex-grow: 1;
				position: relative;
			}

			.tick {
				position: absolute;
				bottom: calc(-2px - 0.8rem);
				right: 0;
			}
		}
	}

	@media (max-width: 75rem) {
		.container {
			width: 300px;
			font-size: 0.6rem;

			.legend {
				margin-bottom: 2px;
			}
		}
	}

	@media (max-width: 75rem) {
		.container {
			.shades {
				.shade {
					height: 10px;
				}
			}
		}
	}
</style>
