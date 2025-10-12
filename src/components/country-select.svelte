<script lang="ts">
	import Select from 'svelte-select';
	import { countries } from '../data/countries';
	import { exportsFromEU, importsFromEU } from '../data/aggregated_imports';

	let { selectCountry } = $props();

	const items = countries
		.filter((c) => exportsFromEU[c.brk_a3] || importsFromEU[c.brk_a3])
		.map((c) => ({ value: c.brk_a3, label: c.brk_name }))
		.sort((a, b) => (a.label > b.label ? 1 : -1));
</script>

<Select
	{items}
	placeholder="Search a country"
	class="country-select"
	on:select={(e) => {
		selectCountry(e.detail.value);
	}}
>
	<div slot="empty" class="empty">No country matches the search</div>
</Select>

<style>
	:global {
		.country-select {
			cursor: text !important;

			input {
				cursor: text !important;
			}
		}

		.svelte-select.focused {
			outline: 2px solid #e62d41;
			outline-offset: 2px;
			border: none !important;
			box-shadow: none;
		}

		.item {
			cursor: pointer !important;
		}

		.item.hover {
			background-color: #e62d4130 !important;
		}

		.item.active {
			background-color: #e62d41 !important;
		}

		.empty {
			padding: 1rem;
		}
	}
</style>
