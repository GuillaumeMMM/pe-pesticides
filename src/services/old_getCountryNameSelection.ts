import * as d3 from 'd3';

export function getCountryNameSelection(
	d: d3.ExtendedFeature,
	projection: d3.GeoProjection,
	importQuantityCircleRadiusScale: d3.ScalePower<number, number, never>,
	importQuantities: { [key: string]: number }
) {
	const [x, y] = projection(d3.geoCentroid(d)) as [number, number];

	return d3
		.select('#country-label')
		.attr('x', x + 'px')
		.attr(
			'y',
			y - importQuantityCircleRadiusScale(importQuantities[d.properties?.brk_a3]) - 10 + 'px'
		)
		.style('opacity', '1')
		.style('text-anchor', 'middle')
		.text(d.properties?.brk_name);
}
