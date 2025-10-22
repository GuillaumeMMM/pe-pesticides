<script lang="ts">
	let { bars } = $props();
</script>

<div class="bars-legend">Countries exporting to {countryNameInSentence}</div>
<ul class="bars">
	{#each exportCountries as country}
		<li class="bar">
			<div class="bar-label">{country.from.brk_name}</div>
			<div class="bar-stick-container">
				<div class="bar-stick" style:width={`${(100 * country.quantity) / totalQuantity}%`}>
					{country.quantity}
				</div>
			</div>
		</li>
	{/each}
</ul>
