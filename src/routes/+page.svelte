<script lang="ts">
	import * as d3 from 'd3';
	// @ts-expect-error
	import { geoBertin1953 } from 'd3-geo-projection';
	import { onMount } from 'svelte';
	import ColorLegend from '../components/color-legend.svelte';
	import Sidebar from '../components/sidebar.svelte';
	import {
		aggregatedImports,
		exportsFromEU,
		importsFromEU,
		relatedCountries
	} from '../data/aggregated_imports';
	import { centroids } from '../data/centroids';
	import * as world from '../data/world.json';
	import Sources from '../components/sources.svelte';
	import { allImports } from '../data/all_imports';
	import { MediaQuery } from 'svelte/reactivity';

	let chartEl: HTMLDivElement | null = $state(null);
	let chartRect: DOMRect | undefined = $derived(
		(chartEl as HTMLDivElement | null)?.getBoundingClientRect()
	);
	let openedCountry: string | undefined = $state(undefined);

	const smallScreen = new MediaQuery('max-width: 50rem');

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

	const importQuantityCircleRadiusScale = d3.scaleSqrt(
		[minImport, maxImport],
		[0, smallScreen.current ? 15 : 25]
	);

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
				const mainCountry = countryCode;
				const linkedCountries = relatedCountries[countryCode || ''];

				//	Reset Backgrounds & stroke
				d3.selectAll(`.country`).attr('stroke-width', '0.5px');
				d3.selectAll(`.country`)
					.attr('fill', fillCountry(null))
					.attr('stroke', strokeCountry(null));

				container
					.selectAll(`.arrow-group`)
					.filter(`.arrow-group-from-${mainCountry}`)
					.style('opacity', '1');
				container
					.selectAll(`.arrow-group`)
					.filter(`.arrow-group-to-${mainCountry}`)
					.style('opacity', '1');

				container
					.selectAll(`.target-group`)
					.filter(`.target-group-${mainCountry}`)
					.style('opacity', '1');

				d3.select(`.label-${mainCountry}`).style('display', 'block');

				[...linkedCountries, mainCountry].forEach((c) => {
					d3.select(`.country-${c}`).attr('stroke-width', '2px');
					d3.select(`.country-${c}`).raise().attr('filter', 'drop-shadow(0px 0px 1px #E62D4150)');
					d3.select(`.country-${c}`).attr('fill', fillCountry(c)).attr('stroke', strokeCountry(c));
				});
			} else {
				d3.selectAll('.label').style('display', 'none');

				d3.selectAll(`.country`).attr('stroke-width', '0.5px');
				d3.selectAll(`.country`)
					.attr('fill', (d: any) => {
						return fillCountry(d.properties.brk_a3);
					})
					.attr('stroke', (d: any) => strokeCountry(d.properties.brk_a3));

				container.selectAll(`.arrow-group`).style('opacity', '0');
				container.selectAll(`.target-group`).style('opacity', '0');
			}
		}

		function fillCountry(countryCode: string | null) {
			const importQuantity = importsFromEU[countryCode || ''];
			const exportQuantity = exportsFromEU[countryCode || ''];

			if (importQuantity === undefined && exportQuantity === undefined) {
				return 'white';
			}

			return importQuantityColorScale(importQuantity) || exportQuantityColorScale(exportQuantity);
		}

		function strokeCountry(countryCode: string | null) {
			return importsFromEU[countryCode || '']
				? importQuantityColorScale(maxImport)
				: exportsFromEU[countryCode || '']
					? exportQuantityColorScale(maxExport)
					: 'grey';
		}

		countriesGroup
			.selectAll('path')
			.data(world.features)
			.join('path')
			.attr('class', (d) => `country country-${d.properties.brk_a3}`)
			.attr('d', pathGenerator as any)
			.attr('fill', (d) => fillCountry(d.properties.brk_a3))
			.attr('mask', (d) =>
				exportsFromEU[d.properties.brk_a3 || ''] ? 'url(#mask-diagonal-stripes)' : 'none'
			)
			.attr('stroke', (d) => strokeCountry(null))
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

		container
			.selectAll('g')
			.data(
				Object.entries(importsFromEU).map(([key, val]) => ({
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

				const middle = [(posTo[0] + posFrom[0]) / 2, (posTo[1] + posFrom[1]) / 2];
				const dir = [posTo[0] - posFrom[0], posTo[1] - posFrom[1]];
				const dirBase = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
				const norm = [dir[0] / dirBase, dir[1] / dirBase];
				const ortho = [-norm[1], norm[0]];

				const coeff = 5;

				const control1 = [middle[0] + coeff * ortho[0], middle[1] + coeff * ortho[1]];
				const control2 = [middle[0] - coeff * ortho[0], middle[1] - coeff * ortho[1]];

				return `M${posFrom.join(' ')} C${posFrom.join(' ')}, ${control1.join(' ')}, ${posTo.join(' ')} C${posTo.join(' ')}, ${control2.join(' ')}, ${posFrom.join(' ')}`;
			})
			.style('pointer-events', 'none')
			.style('fill', '#E62D4190');

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
				const shiftUp = point[1] > (chartRect?.height || 0) - 100 ? 50 : 0;
				const isRight = ref[0] < point[0] ? point[0] + 180 < chartRect!.width : point[0] - 180 < 0;
				return isRight
					? `translate(${point[0] + 7}, ${point[1] - 12 - shiftUp})`
					: `translate(${point[0] - 187}, ${point[1] - 12 - shiftUp})`;
			});

		labelGroup
			.append('foreignObject')
			.attr('class', (d) => `label label-${d.properties.brk_a3}`)
			.attr('pointer-events', 'none')
			.attr('width', '180px')
			.style('display', 'none')
			.attr('height', '200px')
			.html((d) => {
				const type = importsFromEU[d.properties.brk_a3] ? 'import' : 'export';

				const total = new Intl.NumberFormat('en-US').format(
					Math.round(
						(importsFromEU[d.properties.brk_a3] || exportsFromEU[d.properties.brk_a3]) / 1000
					)
				);

				const lines = allImports.filter((i) =>
					type === 'import'
						? i.import_country.brk_a3 === d.properties.brk_a3
						: i.export_country.brk_a3 === d.properties.brk_a3
				);
				const pesticides = lines
					.reduce((prev: Partial<(typeof lines)[0]>[], curr) => {
						const match = prev.find((e) => e.chemical === curr.chemical);
						if (match && match.quantity) {
							match.quantity += curr.quantity;
							return prev;
						} else {
							return [
								...prev,
								{
									quantity: curr.quantity,
									chemical: curr.chemical
								}
							];
						}
					}, [])
					.sort((cA, cB) => ((cA.quantity || 0) > (cB.quantity || 0) ? -1 : 1));
				return `
					<div class="country-dropdown ${type}">
						<div class="country-dropdown-name">${d.properties.brk_name} <div class="country-dropdown-quantity">${total} ${type === 'import' ? 'imported' : 'exported'} tonnes</div></div>
						<div class="country-dropdown-stats">
							<div class="country-dropdown-stats-label">Most ${type === 'import' ? 'imported' : 'exported'} pesticides :</div>
							<p class="country-dropdown-stats-list">${pesticides
								.slice(0, 3)
								.map((p) => p.chemical)
								.join(
									', '
								)}${pesticides.length > 3 ? `, and ${pesticides.length - 3} more` : ''}</p>
						</div>
					</div>
				`;
			});

		return svg;
	};

	onMount(() => {
		render();
	});
</script>

<div class="container">
	<h1>BANNED PESTICIDES NOTIFIED FOR EXPORT FROM THE EU (2024)</h1>

	<div class="sources">
		<Sources />
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
		top: 4rem;
		right: 1rem;
		max-width: calc(50% - 2rem);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sources {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		max-width: calc(50% - 2rem);
		width: 500px;
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

	@media (max-width: 75rem) {
		h1 {
			font-size: 1.5rem;
		}

		.sources {
			width: 400px;
		}

		.color-legend {
			gap: 0.5rem;
		}
	}

	@media (max-width: 50rem) {
		h1 {
			font-size: 1rem;
		}

		.sources {
			display: none;
		}

		.color-legend {
			max-width: calc(100% - 2rem);
		}
	}

	:global {
		.country-dropdown {
			width: 100%;
			display: inline-flex;
			margin-top: 2px;
			flex-direction: column;
			background-color: white;
			border-radius: 3px;
			border: 1px solid #006397;

			&.left {
				justify-content: flex-end;
			}

			.country-dropdown-name {
				font-weight: 600;
				border-bottom: 1px solid #006397;
				padding: 4px 6px;
				background-color: #00639710;
			}

			&.import {
				border-color: #e62d41;

				.country-dropdown-name {
					border-color: #e62d41;
					background-color: #e62d4010;
				}
			}

			.country-dropdown-stats {
				padding: 4px 6px;
				font-size: 0.7rem;

				.country-dropdown-stats-list {
					display: flex;
					flex-direction: column;
					gap: 2px;
					margin-top: 2px;
					color: #333333;
				}
			}

			.country-dropdown-quantity {
				font-weight: 400;
				font-size: 0.7rem;
				margin-top: 3px;
			}
		}
	}
</style>
