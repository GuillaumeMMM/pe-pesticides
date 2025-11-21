<script lang="ts">
	import { onMount } from 'svelte';
	import { exportsFromEU, importsFromEU } from '../data/aggregated_imports';
	import { allImports } from '../data/all_imports';

	let { country, onClose } = $props();

	let closeEl: HTMLButtonElement | null = $state(null);
	let selectedTab = $state('1');

	const type = $derived(exportsFromEU[country] ? 'export' : 'import');

	const totalQuantity = $derived(exportsFromEU[country] || importsFromEU[country]);

	function formatQuantityInTonnes(val: number) {
		const tonnes = val / 1000;
		return new Intl.NumberFormat('en-US').format(Number(tonnes.toFixed(tonnes > 10 ? 0 : 2)));
	}

	const lines = $derived(
		allImports.filter((i) =>
			type === 'import' ? i.import_country.brk_a3 === country : i.export_country.brk_a3 === country
		)
	);

	const countryName = $derived(
		lines[0]?.[type === 'import' ? 'import_country' : 'export_country'].brk_name
	);

	const countriesWithThe = ['USA', 'GBR', 'ARE', 'NLD', 'DOM'];

	const countryNameInSentence = $derived(
		`${countriesWithThe.includes(country) ? 'the ' : ''}${countryName}`
	);

	const exportCompanies = $derived(
		lines
			.reduce((prev: Partial<(typeof lines)[0]>[], curr) => {
				const match = prev.find((e) => e.exporter === curr.exporter);
				if (match && match.quantity) {
					match.quantity += curr.quantity;
					return prev;
				} else {
					return [
						...prev,
						{
							exporter: curr.exporter,
							quantity: curr.quantity,
							export_country: curr.export_country,
							chemical: curr.chemical
						}
					];
				}
			}, [])
			.sort((cA, cB) => ((cA.quantity || 0) > (cB.quantity || 0) ? -1 : 1))
	);

	const substances = $derived(
		lines
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
			.sort((cA, cB) => ((cA.quantity || 0) > (cB.quantity || 0) ? -1 : 1))
	);

	function clickOutside(element: Element, callbackFunction: Function) {
		function onClick(event: MouseEvent) {
			if (!element.contains(event.target as any)) {
				callbackFunction();
			}
		}

		document.body.addEventListener('click', onClick);

		return {
			update(newCallbackFunction: Function) {
				callbackFunction = newCallbackFunction;
			},
			destroy() {
				document.body.removeEventListener('click', onClick);
			}
		};
	}

	onMount(() => {
		closeEl?.focus();
	});

	const json = $derived(JSON.stringify(lines));
	const blob = $derived(new Blob([json], { type: 'application/json' }));
	const href = $derived(URL.createObjectURL(blob));
</script>

<div class="container" use:clickOutside={onClose}>
	<div class={`panel ${type}`}>
		<h1 class="mdf-title2">{countryName}</h1>

		<button
			type="button"
			class="close mdf-button"
			onclick={onClose}
			aria-label="Close the sidebar"
			bind:this={closeEl}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24px"
				height="24px"
				viewBox="0 0 24 24"
				fill="none"
			>
				<path
					d="M20.7457 3.32851C20.3552 2.93798 19.722 2.93798 19.3315 3.32851L12.0371 10.6229L4.74275 3.32851C4.35223 2.93798 3.71906 2.93798 3.32854 3.32851C2.93801 3.71903 2.93801 4.3522 3.32854 4.74272L10.6229 12.0371L3.32856 19.3314C2.93803 19.722 2.93803 20.3551 3.32856 20.7457C3.71908 21.1362 4.35225 21.1362 4.74277 20.7457L12.0371 13.4513L19.3315 20.7457C19.722 21.1362 20.3552 21.1362 20.7457 20.7457C21.1362 20.3551 21.1362 19.722 20.7457 19.3315L13.4513 12.0371L20.7457 4.74272C21.1362 4.3522 21.1362 3.71903 20.7457 3.32851Z"
					fill="#0F0F0F"
				/>
			</svg>
		</button>

		<div class="content">
			<div class="figures">
				<div class="figure">
					<div class="separator"></div>
					<div class="figure-right">
						<div class="figure-label mdf-muted">
							Notified {type === 'export' ? 'exports' : 'imports'} (in tonnes)
						</div>
						<div class="figure-value mdf-emphasis">
							{new Intl.NumberFormat('en-US').format(Math.round(totalQuantity / 1000))}
						</div>
					</div>
				</div>
			</div>

			<div role="tablist" class="tablist">
				<button
					id="tab-1"
					type="button"
					role="tab"
					aria-selected={selectedTab === '1'}
					aria-controls="tabpanel-1"
					onclick={() => {
						selectedTab = '1';
					}}
				>
					Pesticides
				</button>
				<button
					id="tab-2"
					type="button"
					role="tab"
					aria-selected={selectedTab === '2'}
					aria-controls="tabpanel-2"
					onclick={() => {
						selectedTab = '2';
					}}
				>
					Exporting companies
				</button>
			</div>

			{#if selectedTab === '1'}
				<div id="tabpanel-1" role="tabpanel" aria-labelledby="tab-1">
					<div class="table-container">
						<table class="table">
							<caption class="mdf-emphasis visually-hidden"
								>Active ingredients {type === 'export' ? 'exported' : 'imported'}</caption
							>
							<thead>
								<tr>
									<th>Active ingredient</th>
									<th>Amount notified for {type === 'export' ? 'export' : 'import'} (in tonnes)</th>
								</tr>
							</thead>
							<tbody>
								{#each substances as line}
									<tr>
										<td>{line.chemical}</td>
										<td>{formatQuantityInTonnes(line.quantity || 0)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
			{#if selectedTab === '2'}
				<div class="table-container">
					<table class="table">
						<caption class="mdf-emphasis visually-hidden"
							>Companies exporting {type === 'export' ? 'from' : 'to'}
							{countryNameInSentence}</caption
						>
						<thead>
							<tr>
								<th>Export company</th>
								<th>Amount notified for {type === 'export' ? 'export' : 'import'} (in tonnes)</th>
							</tr>
						</thead>
						<tbody>
							{#each exportCompanies as line}
								<tr>
									<td>{line.exporter}</td>
									<td>{formatQuantityInTonnes(line.quantity || 0)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<a
				type="button"
				class="download mdf-button"
				{href}
				download={`${countryName.split(' ').join('_')}_data.json`}
			>
				<span class="download-icon" aria-hidden="true">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24px"
						height="24px"
						viewBox="0 0 24 24"
						fill="none"
					>
						<path
							d="M12.5535 16.5061C12.4114 16.6615 12.2106 16.75 12 16.75C11.7894 16.75 11.5886 16.6615 11.4465 16.5061L7.44648 12.1311C7.16698 11.8254 7.18822 11.351 7.49392 11.0715C7.79963 10.792 8.27402 10.8132 8.55352 11.1189L11.25 14.0682V3C11.25 2.58579 11.5858 2.25 12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V14.0682L15.4465 11.1189C15.726 10.8132 16.2004 10.792 16.5061 11.0715C16.8118 11.351 16.833 11.8254 16.5535 12.1311L12.5535 16.5061Z"
							fill="white"
						/>
						<path
							d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z"
							fill="white"
						/>
					</svg>
				</span>
				Download the country's data</a
			>
		</div>
	</div>
</div>

<style>
	.container {
		width: 800px;
		max-width: 100%;
		height: 100%;
		margin-left: auto;
		padding: 10px;
	}

	.panel {
		background-color: white;
		height: 100%;
		max-height: calc(100dvh - 20px);
		overflow-y: auto;
		position: relative;
		padding: 1rem;
		border-radius: 10px;
	}

	.close {
		background-color: none;
		background: none;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		position: absolute;
		width: 2.5rem;
		height: 2.5rem;
		top: 1rem;
		right: 1rem;
		padding: 0;
		outline-color: #0f0f0f;

		&:hover {
			background-color: rgb(230, 229, 229);
		}
	}

	.content {
		margin-top: 1rem;
	}

	.tablist {
		width: calc(100% - 4px);
		display: flex;
		margin-top: 2rem;

		button {
			flex: 1;
			height: 40px;
			background: white;
			font-size: 1rem;
			font-weight: 600;
			border: none;
			border-bottom: 1px solid #33333350;
			color: #333333;
			cursor: pointer;

			&:hover {
				background: #91919110;
			}

			&:focus-visible {
				outline: 2px solid #0f0f0f;
				outline-offset: 2px;
			}

			&[aria-selected='true'] {
				color: #e62d41;
				background: #e62d4010;
				border-bottom: 2px solid #e62d41;
			}
		}
	}

	.export {
		.tablist button {
			&[aria-selected='true'] {
				color: #006397;
				background: #00639710;
				border-bottom: 2px solid #006397;
			}
		}
	}

	.figures {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem 4rem;
	}

	.figure {
		min-width: 80px;
		display: flex;
		gap: 1rem;
	}

	.separator {
		height: 100%;
		background-color: #e62d41;
		border-radius: 5px;
		width: 5px;
	}

	.figure-right {
		padding: 10px 0;
		display: flex;
		flex-direction: column;
		gap: 10px;

		.figure-label {
			font-size: 1.2rem;
		}

		.figure-value {
			font-size: 2rem;
		}
	}

	.export {
		.separator {
			background-color: #006397;
		}
	}

	.table-container {
		margin-top: 1rem;
	}

	table {
		thead {
			th {
				text-align: left;
				padding: 8px 10px;
				border: 1px solid #e62d41;
				background-color: #e62d4010;
			}
		}
		td {
			border: 1px solid #919191;
			padding: 8px 10px;
		}

		tbody > tr:nth-child(even) {
			background-color: #91919110;
		}

		caption {
			text-align: left;
			padding-bottom: 10px;
		}
	}

	.download {
		margin-top: 1rem;
		background-color: #e62d41;
		border-color: #9a2733;
		outline-color: #9a2733;
		display: inline-flex;

		&:hover {
			background-color: #9a2733;
		}
	}

	.export {
		thead th {
			border-color: #006397;
			background-color: #00639720;
		}

		.download {
			background-color: #006397;
			border-color: #194b65;
			outline-color: #194b65;

			&:hover {
				background-color: #194b65;
			}
		}
	}

	.download-icon {
		display: inline-flex;
		margin-right: 5px;
	}
</style>
