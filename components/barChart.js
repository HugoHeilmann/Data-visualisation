// components/barChart.js

export function BarChart({
  container,
  data,
  width = 600,
  height = 400,
  color = "#69b3a2",
  margin = { top: 30, right: 30, bottom: 50, left: 60 },
}) {
  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Échelles
  const x = d3.scaleBand()
    .domain(data.map(d => d.year))
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Barres
  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.year))
    .attr("y", y(0))
    .attr("width", x.bandwidth())
    .attr("height", 0)
    .attr("fill", color)
    .transition()
    .duration(800)
    .attr("y", d => y(d.value))
    .attr("height", d => y(0) - y(d.value));
}
