// --- DonutDetail.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function DonutDetail(container, teamData) {
    const { team, stats } = teamData;
    const data = [
        { label: "Attempts Outside", value: stats.attemptsOutside, color: "#1abc9c" },
        { label: "Attempts Inside", value: stats.attemptsInside, color: "#3498db" },
        { label: "Goals Outside", value: stats.goalsOutside, color: "#d30c0cff" },
        { label: "Goals Inside", value: stats.goalsInside, color: "#f39c12" },
        { label: "Total Goals", value: stats.totalGoals, color: "#9b59b6" },
    ];

    const width = 220;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    // Efface le contenu précédent
    d3.select(container).selectAll("*").remove();

    d3.select(container)
        .style("background", "#1e1e1e")
        .style("color", "#fff")
        .style("border", "1px solid #fff")
        .style("border-radius", "8px")
        .style("padding", "8px")
        .style("box-shadow", "0 2px 6px rgba(0, 0, 0, 0.4)");

    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height + 60)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc()
        .innerRadius(radius * 0.55)
        .outerRadius(radius - 5);

    const total = d3.sum(data, d => d.value);
    const format = d3.format(".0f");

    // --- Arcs
    svg.selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => d.data.color)
        .attr("stroke", "#111")
        .attr("stroke-width", 1)
        .style("opacity", 0.9)
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition().duration(200)
                .attr("transform", `scale(1.05)`);
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition().duration(200)
                .attr("transform", `scale(1)`);
        });

    // --- Labels
    svg.selectAll("text.label")
        .data(pie(data))
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "#fff")
        .attr("font-size", "10px")
        .text(d => d.data.value > 0 ? d.data.value : "");

    // --- Texte central
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "#ddd")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .text(team);

    // --- Légende
    const legend = svg.append("g")
        .attr("transform", `translate(${-70}, ${radius + 20})`);

    const legendItems = legend.selectAll(".legend-item")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (_, i) => `translate(0, ${i * 16})`);

    legendItems.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("fill", d => d.color);

    legendItems.append("text")
        .attr("x", 14)
        .attr("y", 9)
        .attr("fill", "#fff")
        .attr("font-size", "10px")
        .text(d => d.label);
}
