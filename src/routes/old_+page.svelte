<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	// @ts-ignore
	import { geoBertin1953 } from 'd3-geo-projection';
	import ColorLegend from '../components/color-legend.svelte';
	import CirclesLegend from '../components/circles-legend.svelte';

	import * as world from '../data/world.json';
	import Sources from '../components/sources.svelte';
	import { getCountryNameSelection } from '../services/old_getCountryNameSelection';

	let chartEl: HTMLDivElement | null = $state(null);
	let chartRect: DOMRect | undefined = $derived(
		(chartEl as HTMLDivElement | null)?.getBoundingClientRect()
	);

	const arrows = [
		{ from: 'CHE', to: 'BRA' },
		{ from: 'CHE', to: 'AUS' },
		{ from: 'DEU', to: 'CAN' },
		{ from: 'DEU', to: 'AUS' }
	];

	const minImport = 0;
	const maxImport = 20_000;
	const importQuantities: { [key: string]: number } = {
		BRA: 20_000,
		AUS: 10_000,
		CAN: 100
	};
	const importQuantityColorScale = d3.scaleLinear([minImport, maxImport], ['white', '#E62C41']);
	const importQuantitySplitCount = 8;
	const importQuantitySplitLength = importQuantityColorScale.domain()[1] / importQuantitySplitCount;
	const importQuantityCircleRadiusScale = d3.scaleSqrt([minImport, maxImport], [0, 30]);

	const render = () => {
		d3.select(chartEl).selectAll('*').remove();

		const projection = geoBertin1953().fitExtent(
			[
				[0, 0],
				[chartRect?.width || 0, chartRect?.height || 0]
			],
			world
		);

		const UEuropeCentroid = projection(
			d3.geoCentroid(world.features.find((f) => f.properties.brk_a3 === 'CHE') as any)
		);

		const pathGenerator = d3.geoPath(projection);

		const svg = d3
			.select(chartEl)
			.append('svg')
			.attr('title', 'Map')
			.attr('width', chartRect?.width + 'px')
			.attr('height', chartRect?.height + 'px');

		const container = svg.append('g').attr('class', 'container');

		container
			.selectAll('path')
			.data(world.features)
			.join('path')
			.attr('d', pathGenerator as any)
			.attr('fill', (d) => {
				const importQuantity = importQuantities?.[d.properties.brk_a3];

				return (
					importQuantityColorScale(
						importQuantity +
							(importQuantitySplitLength - (importQuantity % importQuantitySplitLength))
					) || 'white'
				);
			})
			.attr('stroke', '#C9C7C8')
			.attr('stroke-width', 1)
			.on('mouseenter', function (e, d) {
				if (importQuantities[d.properties.brk_a3] === undefined) {
					return;
				}

				getCountryNameSelection(
					d as d3.ExtendedFeature,
					projection,
					importQuantityCircleRadiusScale,
					importQuantities
				);
			})
			.on('mouseout', function () {
				d3.select('#country-label').style('opacity', '0');
			});

		container
			.selectAll('g')
			.data(arrows)
			.join('g')
			.attr('class', 'arrow-group')
			.append('path')
			.attr('d', (d) => {
				const from = world.features.find((f) => f.properties.brk_a3 === d.from);
				const to = world.features.find((f) => f.properties.brk_a3 === d.to);
				const posFrom = projection(d3.geoCentroid(from as any));
				const posTo = projection(d3.geoCentroid(to as any));

				/* const curveIndex = 200; */
				const curveIndex = Math.max(importQuantities[d.to] / 2000, 5);

				/* const control = [(posTo[0] + posFrom[0]) / 2, Math.min(posTo[1], posFrom[1]) - curveIndex]; */
				const control = [
					(posTo[0] + posFrom[0]) / 2 - curveIndex,
					(posTo[1] + posFrom[1]) / 2 - curveIndex
				];
				const control2 = [
					(posTo[0] + posFrom[0]) / 2 + curveIndex,
					(posTo[1] + posFrom[1]) / 2 + curveIndex
				];

				/* return `M${posFrom.join(' ')} C${posFrom.join(' ')}, ${control.join(' ')}, ${posTo.join(' ')}`; */
				return `M${posFrom.join(' ')} C${posFrom.join(' ')}, ${control.join(' ')}, ${posTo.join(' ')}  C${posTo.join(' ')}, ${control2.join(' ')}, ${posFrom.join(' ')} M${posFrom.join(' ')}}`;
			})
			.style('pointer-events', 'none')
			/* .style('stroke', '#D53F48') */
			.style('opacity', 0.8)
			.style('fill', '#D53F4880')
			.style('stroke-width', '3px');

		container
			.selectAll('g')
			.data(
				Object.entries(importQuantities).map(([key, val]) => ({
					countryCode: key,
					quantityImported: val
				}))
			)
			.join('g')
			.attr('class', 'circle-group')
			.append('circle')
			.attr('id', 'country-import-circle')
			.attr('cx', function (d) {
				const country = world.features.find((f) => f.properties.brk_a3 === d.countryCode);
				const pos = projection(d3.geoCentroid(country as any));
				return `${pos[0]}px`;
			})
			.attr('cy', function (d) {
				const country = world.features.find((f) => f.properties.brk_a3 === d.countryCode);
				const pos = projection(d3.geoCentroid(country as any));
				return `${pos[1]}px`;
			})
			.attr('r', (d) => {
				return `${importQuantityCircleRadiusScale(d.quantityImported)}px`;
			})
			.attr('fill', '#333333')
			.attr('stroke', 'white')
			.attr('stroke-width', '1px')
			.style('pointer-events', 'none');

		container
			.append('text')
			.attr('id', 'country-label')
			.style('font-size', '18px')
			.style('pointer-events', 'none')
			.style('text-anchor', 'middle')
			/* .style('alignment-baseline', 'middle') */
			.text('');

		const unionGroup = container
			.append('g')
			.attr('transform', `translate(${UEuropeCentroid[0]}, ${UEuropeCentroid[1]})`);

		unionGroup
			.append('circle')
			.attr('fill', 'white')
			.attr('stroke', '#E62C41')
			.attr('stroke-width', '5px')
			.attr('r', '50px')
			.attr('cx', '0px')
			.attr('cy', '0px');

		unionGroup
			.append('text')
			.attr('x', '0')
			.attr('y', '0')
			.style('text-anchor', 'middle')
			.style('alignment-baseline', 'central')
			.style('font-size', '30px')
			.style('font-weight', '600')
			.text('EU');

		return svg;
	};

	onMount(() => {
		const svg = render();

		function zoomed({ transform }: { transform: d3.ZoomTransform }) {
			svg.select('.container').attr('transform', transform as any);
			svg
				.select('.container')
				.select('#country-label')
				.style('font-size', 18 / transform.k + 'px');

			svg
				.selectAll('.arrow-group')
				.select('path')
				.style('stroke-width', 3 / transform.k + 'px');
		}

		const zoom = d3
			.zoom()
			.scaleExtent([1, 1.5])
			.translateExtent([
				[0, 0],
				[chartRect?.width || 0, chartRect?.height || 0]
			])
			.on('zoom', zoomed);

		svg.call(zoom as any);
	});
</script>

<h1 class="title">
	<span class="mdf-emphasis">BANNED PESTICIDES NOTIFIED FOR EXPORT FROM THE EU</span> (2024)
</h1>

<div class="container">
	<div bind:this={chartEl} class="chart"></div>

	<div class="color-legend">
		<ColorLegend
			scale={importQuantityColorScale}
			splitLength={importQuantitySplitLength}
			count={importQuantitySplitCount}
			type="import"
		/>
	</div>

	<div class="circles-legend">
		<CirclesLegend scale={importQuantityCircleRadiusScale} />
	</div>

	<div class="sources">
		<Sources />
	</div>
</div>

<style>
	.container {
		flex: 1;
		display: flex;
		flex-direction: column;
		position: relative;

		.chart {
			flex: 1;
		}
	}

	.color-legend {
		position: absolute;
		top: 1rem;
		right: 1rem;
		max-width: 100%;
	}

	.circles-legend {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		max-width: 100%;
	}

	.title {
		font-size: 2.5rem;
		text-align: center;
		color: #812a21;
		font-weight: normal;
		padding: 10px 0;
		letter-spacing: 2px;
	}

	.sources {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		width: 600px;
		max-width: 100%;
	}
</style>
