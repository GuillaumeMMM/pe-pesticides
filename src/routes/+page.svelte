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

	let chartEl: HTMLDivElement | null = $state(null);
	let chartRect: DOMRect | undefined = $derived(
		(chartEl as HTMLDivElement | null)?.getBoundingClientRect()
	);
	let openedCountry: string | undefined = $state(undefined);

	const importColors = [
		'#FDDFD5',
		'#F8C3B3',
		'#F5A898',
		'#F28D81',
		'#F0756D',
		'#EC6762',
		'#E94C53',
		'#E62C41'
	];

	const exportColors = [
		'#DEF6FA',
		'#C3E4EE',
		'#A7D2E2',
		'#A0CEDF',
		'#99C9DC',
		'#8BC0D6',
		'#62A4C3',
		'#006397'
	];

	const importThresholds = [0, 100, 500, 1000, 2000, 5000, 10000, 20000].map((d) => d * 1000);

	const exportThresholds = [0, 100, 500, 1000, 5000, 10000, 20000, 40000].map((d) => d * 1000);

	function getImportExportColor(value: number, thresholds: number[], colors: string[]) {
		for (let i = thresholds.length - 1; i >= 0; i--) {
			if (value > thresholds[i]) {
				return colors[i];
			}
		}
		return colors[0];
	}

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

				const isExport = Boolean(exportsFromEU[countryCode || '']);

				//	Reset Backgrounds & stroke
				d3.selectAll(`.country`).attr('stroke-width', '0.5px');
				d3.selectAll(`.country`)
					.attr('fill', fillCountry(null))
					.attr('stroke', strokeCountry(null));

				const fromGroup = container
					.selectAll(`.arrow-group`)
					.filter(`.arrow-group-from-${mainCountry}`);

				const toGroup = container
					.selectAll(`.arrow-group`)
					.filter(`.arrow-group-to-${mainCountry}`);

				fromGroup.style('opacity', '1');
				toGroup.style('opacity', '1');

				fromGroup.selectAll('.arrow').style('fill', isExport ? '#0c8bcf50' : '#E62D4190');
				toGroup.selectAll('.arrow').style('fill', isExport ? '#0c8bcf50' : '#E62D4190');

				container
					.selectAll(`.target-group`)
					.filter(`.target-group-${mainCountry}`)
					.style('opacity', '1');

				d3.select(`.label-${mainCountry}`).style('display', 'block');

				[...linkedCountries, mainCountry].forEach((c) => {
					d3.select(`.country-${c}`).attr('stroke-width', '1px');
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

			return getImportExportColor(
				importQuantity || exportQuantity,
				importQuantity ? importThresholds : exportThresholds,
				importQuantity ? importColors : exportColors
			);
		}

		function strokeCountry(countryCode: string | null) {
			return importsFromEU[countryCode || '']
				? importColors[importColors.length - 1]
				: exportsFromEU[countryCode || '']
					? exportColors[exportColors.length - 1]
					: 'grey';
		}

		countriesGroup
			.selectAll('path')
			.data(world.features)
			.join('path')
			.attr('class', (d) => `country country-${d.properties.brk_a3}`)
			.attr('d', pathGenerator as any)
			.attr('fill', (d) => fillCountry(d.properties.brk_a3))
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

				return `
					<div class="country-dropdown ${type}">
						<div class="country-dropdown-header">
							<div class="country-dropdown-name">
								<span>${d.properties.brk_name}</span>
								<div class="badge"><span>${type === 'import' ? 'importer' : 'exporter'}</span></div>
							</div>
							<div class="country-dropdown-header-quantity">${total} tonnes</div>
						</div>
						<div class="country-dropdown-stats">
						<div><svg xmlns="http://www.w3.org/2000/svg" width="12px" height="12px" viewBox="0 0 36 36"><path d="M30.4 17.6c-1.8-1.9-4.2-3.2-6.7-3.7-1.1-.3-2.2-.5-3.3-.6 2.8-3.3 2.3-8.3-1-11.1s-8.3-2.3-11.1 1-2.3 8.3 1 11.1c.6.5 1.2.9 1.8 1.1v2.2l-1.6-1.5a3.74 3.74 0 0 0-5.2 0 3.5 3.5 0 0 0-.1 5l4.6 5.4c.2 1.4.7 2.7 1.4 3.9.5.9 1.2 1.8 1.9 2.5v1.9c0 .6.4 1 1 1h13.6c.5 0 1-.5 1-1v-2.6c1.9-2.3 2.9-5.2 2.9-8.1v-5.8c.1-.4 0-.6-.2-.7zm-22-9.4c0-3.3 2.7-5.9 6-5.8 3.3 0 5.9 2.7 5.8 6 0 1.8-.8 3.4-2.2 4.5v-5a3.4 3.4 0 0 0-3.4-3.2c-1.8-.1-3.4 1.4-3.4 3.2v5.2c-1.7-1-2.7-2.9-2.8-4.9zM28.7 24c.1 2.6-.8 5.1-2.5 7.1-.2.2-.4.4-.4.7v2.1H14.2v-1.4c0-.3-.2-.6-.4-.8-.7-.6-1.3-1.3-1.8-2.2-.6-1-1-2.2-1.2-3.4 0-.2-.1-.4-.2-.6l-4.8-5.7c-.3-.3-.5-.7-.5-1.2 0-.4.2-.9.5-1.2.7-.6 1.7-.6 2.4 0l2.9 2.9v3l1.9-1V7.9c.1-.7.7-1.3 1.5-1.2.7 0 1.4.5 1.4 1.2v11.5l2 .4v-4.6c.1-.1.2-.1.3-.2.7 0 1.4.1 2.1.2v5.1l1.6.3v-5.2l1.2.3c.5.1 1 .3 1.5.5v5l1.6.3v-4.6c.9.4 1.7 1 2.4 1.7l.1 5.4z" class="cursor"/></svg></div>	
						<div class="country-dropdown-stats-label">Click the country for more info</div>
						</div>
					</div>
				`;
			});

		return svg;
	};

	const debounce = (func: Function, delay: number) => {
		let timer: number;

		return function () {
			// @ts-expect-error
			const context = this;
			const args = arguments;
			clearTimeout(timer);
			timer = setTimeout(() => func.apply(context, args), delay);
		};
	};

	const setWindowWidth = () => {
		chartRect = (chartEl as HTMLDivElement | null)?.getBoundingClientRect();
		render();
	};

	const debouncedSetWindowWidth = debounce(setWindowWidth, 300);

	onMount(() => {
		window.addEventListener('resize', debouncedSetWindowWidth);

		render();

		return () => {
			window.removeEventListener('resize', debouncedSetWindowWidth);
		};
	});
</script>

<div class="container">
	<h1>BANNED PESTICIDES NOTIFIED FOR EXPORT FROM THE EU (2024)</h1>

	<div class="sources">
		<Sources />
	</div>

	<div bind:this={chartEl} class="chart"></div>

	<div class="color-legend" aria-hidden="true">
		<ColorLegend colors={importColors} thresholds={importThresholds} type="import" />

		<ColorLegend colors={exportColors} thresholds={exportThresholds} type="export" />
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
		gap: 2rem;
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
			gap: 1.5rem;
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

			.country-dropdown-header {
				border-bottom: 1px solid #006397;
				padding: 4px 6px;
				background-color: #00639710;

				.country-dropdown-name {
					font-weight: 600;
					display: flex;
					justify-content: space-between;
					flex-wrap: wrap;

					.badge {
						font-weight: 400;
						color: white;
						background-color: #006397;
						border-radius: 3px;
						padding: 2px 4px 2px 4px;
						font-size: 0.7rem;
						display: flex;
						align-items: center;
					}

					.country-dropdown-header-quantity {
						font-weight: 400;
						font-size: 0.7rem;
						margin-top: 3px;
					}
				}
			}

			&.import {
				border-color: #e62d41;

				.country-dropdown-header {
					border-color: #e62d41;
					background-color: #e62d4010;
				}

				.badge {
					background-color: #c42535;
				}
			}

			.country-dropdown-stats {
				padding: 4px 6px;
				font-size: 0.7rem;
				display: flex;
				align-items: center;
				gap: 2px;
			}

			.cursor {
				alignment-baseline: central;
			}
		}
	}
</style>
