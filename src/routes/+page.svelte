<script lang="ts">
	import * as d3 from 'd3';
	// @ts-expect-error
	import { geoBertin1953 } from 'd3-geo-projection';
	import { onMount } from 'svelte';
	import ColorLegend from '../components/color-legend.svelte';
	import CountrySelect from '../components/country-select.svelte';
	import DownloadData from '../components/download-data.svelte';
	import Sidebar from '../components/sidebar.svelte';
	import { aggregatedImports, exportsFromEU, importsFromEU } from '../data/aggregated_imports';
	import { centroids } from '../data/centroids';
	import * as world from '../data/world.json';
	import Sources from '../components/sources.svelte';

	let chartEl: HTMLDivElement | null = $state(null);
	let chartRect: DOMRect | undefined = $derived(
		(chartEl as HTMLDivElement | null)?.getBoundingClientRect()
	);
	let openedCountry: string | undefined = $state(undefined);

	const minImport = Math.min(...Object.values(importsFromEU));
	const maxImport = Math.max(...Object.values(importsFromEU));
	const split = (maxImport - minImport) / 8;
	const importQuantityColorScale = d3.scaleLinear(
		[
			minImport,
			minImport + split,
			minImport + 2 * split,
			minImport + 3 * split,
			minImport + 4 * split,
			minImport + 5 * split,
			minImport + 6 * split,
			minImport + 7 * split,
			maxImport
		],
		['#FDDFD5', '#F8C3B3', '#F5A898', '#F28D81', '#F0756D', '#EC6762', '#E94C53', '#E62C41']
	);

	const minExport = Math.min(...Object.values(exportsFromEU));
	const maxExport = 50000000;
	const exportQuantityColorScale = d3.scaleLinear([minExport, maxExport], ['#def6fa', '#006397']);

	const render = () => {
		if (!chartRect?.width || !chartRect?.height) {
			setTimeout(() => {
				chartRect = chartEl?.getBoundingClientRect();
				render();
			}, 100);
			return;
		}
		d3.select(chartEl).selectAll('*').remove();

		const projection = geoBertin1953().fitExtent(
			[
				[40, 10],
				[(chartRect?.width || 0) - 40, (chartRect?.height || 0) - 10]
			],
			world
		);

		const pathGenerator = d3.geoPath(projection);

		const svg = d3
			.select(chartEl)
			.append('svg')
			.attr('title', 'Map')
			.attr('width', chartRect?.width + 'px')
			.attr('height', (chartRect?.height || 0) - 5 + 'px');

		const defs = svg.append('defs');

		const pattern = defs
			.append('pattern')
			.attr('id', 'diagonal-stripes')
			.attr('patternUnits', 'userSpaceOnUse')
			.attr('width', 10)
			.attr('height', 10);

		pattern
			.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', 10)
			.attr('height', 10)
			.attr('fill', 'white');

		pattern
			.append('path')
			.attr('d', 'M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2')
			.attr('fill', 'none')
			.attr('stroke', '#00000050')
			.attr('stroke-width', '3px');

		defs
			.append('mask')
			.attr('id', 'mask-diagonal-stripes')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', 1)
			.attr('height', 1)
			.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', chartRect?.width + 'px')
			.attr('height', chartRect?.height + 'px')
			.attr('fill', 'url(#diagonal-stripes)');

		const radialGradient = defs.append('radialGradient').attr('id', 'radial-gradient');
		radialGradient.append('stop').attr('offset', '40%').attr('stop-color', 'black');
		radialGradient.append('stop').attr('offset', '100%').attr('stop-color', 'white');

		world.features
			.filter((f) => exportsFromEU[f.properties.brk_a3])
			.forEach((d) => {
				const mask = defs
					.append('mask')
					.attr('id', `mask-gradient-${d.properties.brk_a3}`)
					.attr('x', 0)
					.attr('y', 0)
					.attr('width', 1)
					.attr('height', 1);

				mask
					.append('rect')
					.attr('fill', 'white')
					.attr('x', 0)
					.attr('y', 0)
					.attr('width', chartRect?.width + 'px')
					.attr('height', chartRect?.height + 'px');

				const point = projection(centroids[d.properties.brk_a3]);
				mask
					.append('circle')
					.attr('cx', point[0])
					.attr('cy', point[1])
					.attr('r', '20px')
					.attr('fill', 'url(#radial-gradient)');
			});

		const bg = svg.append('g').attr('class', 'background');
		const container = svg.append('g').attr('class', 'container');

		bg.selectAll('path')
			.data(world.features)
			.join('path')
			.attr('d', pathGenerator as any)
			.attr('fill', 'white')
			.attr('filter', 'drop-shadow( 2px 2px 0px #00000010)');

		const countriesGroup = container.append('g');

		function highlightCountry(countryCode: string | null) {
			if (importsFromEU[countryCode || ''] || exportsFromEU[countryCode || '']) {
				d3.select(`.label-${countryCode}`).style('opacity', '1');

				d3.select(`.country-${countryCode}`).attr('stroke-width', '2px');
				d3.select(`.country-${countryCode}`)
					.raise()
					.attr('filter', 'drop-shadow(0px 0px 1px #E62D4150)');

				container
					.selectAll(`.arrow-group`)
					.filter(`.arrow-group-from-${countryCode}`)
					.style('opacity', '1');
				container
					.selectAll(`.arrow-group`)
					.filter(`.arrow-group-to-${countryCode}`)
					.style('opacity', '1');

				container
					.selectAll(`.target-group`)
					.filter(`.target-group-${countryCode}`)
					.style('opacity', '1');
			} else {
				d3.selectAll('.label').style('opacity', '0');

				d3.selectAll(`.country`).attr('stroke-width', '0.5px');

				container.selectAll(`.arrow-group`).style('opacity', '0');
				container.selectAll(`.target-group`).style('opacity', '0');
			}
		}

		countriesGroup
			.selectAll('path')
			.data(world.features)
			.join('path')
			.attr('class', (d) => `country country-${d.properties.brk_a3}`)
			.attr('d', pathGenerator as any)
			.attr('fill', (d) => {
				const importQuantity = importsFromEU[d.properties.brk_a3 || ''];
				const exportQuantity = exportsFromEU[d.properties.brk_a3 || ''];

				if (importQuantity === undefined && exportQuantity === undefined) {
					return 'white';
				}

				return importQuantityColorScale(importQuantity) || exportQuantityColorScale(exportQuantity);
			})
			.attr('mask', (d) =>
				exportsFromEU[d.properties.brk_a3 || ''] ? 'url(#mask-diagonal-stripes)' : 'none'
			)
			.attr('stroke', (d) =>
				importsFromEU[d.properties.brk_a3 || '']
					? importQuantityColorScale(maxImport)
					: exportsFromEU[d.properties.brk_a3 || '']
						? exportQuantityColorScale(maxExport)
						: 'grey'
			)
			.attr('stroke-width', '0.5px')
			.style('cursor', (d) =>
				importsFromEU[d.properties.brk_a3 || ''] || exportsFromEU[d.properties.brk_a3 || '']
					? 'pointer'
					: 'default'
			)
			.on('mouseenter', (e, d) => {
				highlightCountry(d.properties.brk_a3);
			})
			.on('click', (e, d) => {
				if (importsFromEU[d.properties.brk_a3 || ''] || exportsFromEU[d.properties.brk_a3 || '']) {
					setTimeout(() => {
						openedCountry = d.properties.brk_a3;
					});
				}
			})
			.on('mouseout', () => {
				highlightCountry(null);
			});

		const arrowGroup = container
			.selectAll('.arrow-group')
			.data(aggregatedImports)
			.join('g')
			.attr('class', (d) => `arrow-group arrow-group-from-${d.from} arrow-group-to-${d.to}`)
			.style('opacity', '0');

		arrowGroup
			.append('path')
			.attr('class', 'arrow')
			.attr('d', (d) => {
				const from = world.features.find((f) => f.properties.brk_a3 === d.from);
				const to = world.features.find((f) => f.properties.brk_a3 === d.to);

				const posFrom = projection(centroids[from?.properties?.brk_a3 || '']);
				const posTo = projection(centroids[to?.properties?.brk_a3 || '']);

				const curveIndex = 0;

				const control = [(posTo[0] + posFrom[0]) / 2, Math.min(posTo[1], posFrom[1]) - curveIndex];

				return `M${posFrom.join(' ')} C${posFrom.join(' ')}, ${control.join(' ')}, ${posTo.join(' ')}`;
			})
			.style('pointer-events', 'none')
			.style('stroke', '#333333')
			.style('stroke-dasharray', '3 2')
			.style('fill', 'none')
			.style('stroke-width', '1px');

		const targetGroup = container
			.selectAll('.target-group')
			.data(world.features)
			.join('g')
			.attr('class', (d) => `target-group target-group-${d.properties.brk_a3}`)
			.attr('pointer-events', 'none')
			.attr(
				'transform',
				(d) => `translate(${projection(centroids[d.properties.brk_a3]).join(', ')})`
			)
			.attr('opacity', '0');

		targetGroup
			.append('circle')
			.attr('cx', 0)
			.attr('cr', 0)
			.attr('r', 3)
			.attr('fill', (d) => (importsFromEU[d.properties.brk_a3] ? '#E62D41' : '#0c8bcf'))
			.attr(
				'filter',
				(d) =>
					`drop-shadow( 0px 0px 3px ${importsFromEU[d.properties.brk_a3] ? '#E62D41' : '#0c8bcf'})`
			);

		const labelGroup = container
			.selectAll('.label-group')
			.data(world.features)
			.join('g')
			.attr('class', `label-group`)
			.attr('transform', (d) => {
				const point = projection(centroids[d.properties.brk_a3]);
				const ref = [536.386821798111, 418.3598427429403];
				return ref[0] < point[0] && d.properties.position !== 'left'
					? `translate(${point[0] + 7}, ${point[1] - 12})`
					: `translate(${point[0] - 187}, ${point[1] - 12})`;
			});

		labelGroup
			.append('foreignObject')
			.attr('class', (d) => `label label-${d.properties.brk_a3}`)
			.attr('opacity', '0')
			.attr('pointer-events', 'none')
			.attr('width', '180px')
			.attr('height', '26px')
			.html((d) => {
				const point = projection(centroids[d.properties.brk_a3]);
				const ref = [536.386821798111, 418.3598427429403];
				return `<span class="country-label ${importsFromEU[d.properties.brk_a3 || ''] ? 'import' : ''} ${ref[0] > point[0] || d.properties.position === 'left' ? 'left' : ''}""><span>${d.properties.brk_name}</span></span>`;
			});

		return svg;
	};

	onMount(() => {
		render();
	});
</script>

<div class="container">
	<h1>BANNED PESTICIDES NOTIFIED FOR EXPORT FROM THE EU (2024)</h1>
	<!-- <div class="country-select">
		<CountrySelect
			selectCountry={(country: string) => {
				openedCountry = country;
			}}
		/>
	</div> -->

	<div class="sources">
		<Sources />
	</div>

	<div class="download-data">
		<DownloadData />
	</div>

	<div bind:this={chartEl} class="chart"></div>

	<div class="color-legend" aria-hidden="true">
		<ColorLegend scale={importQuantityColorScale} type="imported" maxDisplayed={20000} />

		<ColorLegend scale={exportQuantityColorScale} type="exported" maxDisplayed={50000} />
	</div>
</div>

<div class="dialog-container">
	<dialog open={Boolean(openedCountry)} class="dialog">
		{#if openedCountry}
			<Sidebar
				country={openedCountry}
				onClose={() => {
					openedCountry = undefined;
				}}
			/>
		{/if}
	</dialog>
</div>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape') {
			openedCountry = undefined;
		}
	}}
/>

<style>
	.container {
		flex: 1;
		display: flex;
		flex-direction: column;
		position: relative;
		height: 100%;

		.chart {
			flex: 1;
		}
	}

	h1 {
		text-align: center;
		font-size: 1.8rem;
		letter-spacing: 2px;
		padding-top: 1rem;
		width: 100%;
		font-weight: 600;
		font-family: Radikal-Bold;
		color: #843027;
	}

	.color-legend {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		max-width: calc(50% - 2rem);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.country-select {
		position: absolute;
		top: 1rem;
		right: 1rem;
		max-width: calc(100% - 2rem);
		width: 300px;
	}

	.sources {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		max-width: calc(50% - 2rem);
		width: 400px;
	}

	.download-data {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		max-width: calc(100% - 2rem);
	}

	.dialog-container {
		.dialog {
			border: none;
			position: absolute;
			padding: 0;
			z-index: 1;
			left: 0;
			top: 0;
			width: 100vw;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.222);
		}
	}

	@media (max-width: 1200px) {
		.download-data {
			display: none;
		}

		h1 {
			font-size: 1.5rem;
		}
	}

	@media (max-width: 700px) {
		.download-data {
			display: none;
		}

		h1 {
			font-size: 1.2rem;
		}

		.sources {
			display: none;
		}

		.color-legend {
			max-width: calc(100% - 2rem);
		}
	}

	:global {
		span.country-label {
			width: 100%;
			display: inline-flex;
			margin-top: 2px;

			&.left {
				justify-content: flex-end;
			}

			span {
				background-color: white;
				padding: 2px 4px;
				border-radius: 3px;
				border: 2px solid #006397;
			}

			&.import {
				span {
					border-color: #e62d41;
				}
			}
		}
	}
</style>
