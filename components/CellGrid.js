import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function CellGrid() {
    let teams1 = [];
    let teams2 = [];
    let data = [];
    let marginLeft = 150;
    let marginTop = 100;
    let cellWidth = 50;
    let cellHeight = 40;

    function grid(selection) {
        selection.each(function () {
            const g = d3.select(this);

            // Create or select the tooltip
            let tooltip = d3.select("#tooltip");
            if (tooltip.empty()) {
                tooltip = d3.select("body")
                    .append("div")
                    .attr("id", "tooltip")
                    .style("position", "absolute")
                    .style("background", "#fff")
                    .style("padding", "5px 10px")
                    .style("border", "1px solid #ccc")
                    .style("border-radius", "4px")
                    .style("pointer-events", "none")
                    .style("opacity", 0)
                    .style("display", "none");
            }

            const cells = [];
            teams1.forEach((t1, i) => {
                teams2.forEach((t2, j) => {
                    const match = data.find(
                        (d) => d.team1 === t1 && d.team2 === t2
                    );
                    cells.push({ t1, t2, match });
                });
            });

            const rects = g
                .selectAll("rect")
                .data(cells, (d) => d.t1 + "-" + d.t2);

            rects.enter()
                .append("rect")
                .merge(rects)
                .attr("x", (d) => marginLeft + teams2.indexOf(d.t2) * cellWidth)
                .attr("y", (d) => marginTop + teams1.indexOf(d.t1) * cellHeight)
                .attr("width", cellWidth)
                .attr("height", cellHeight)
                .attr("stroke", "#444")
                .attr("stroke-width", 1)
                .attr("fill", (d) => {
                    if (!d.match) return "#2b2b2b"; // aucun match trouvé

                    const g1 = d.match["number of goals team1"];
                    const g2 = d.match["number of goals team2"];

                    if (g1 > g2) return "#2ecc71"; // vert victoire
                    if (g1 < g2) return "#e74c3c"; // rouge défaite

                    return "#f1c40f"; // jaune match nul
                })
                .on("click", (event, d) => {
                    // --- Si aucun match trouvé -> cacher la popup
                    if (!d.match) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", 0)
                            .on("end", () => tooltip.style("display", "none"));
                        return;
                    }

                    // --- Fonction pour convertir "54%" → 54 (nombre)
                    const parsePercent = (str) => {
                        if (!str) return 0;
                        const num = parseFloat(str.replace("%", "").trim());
                        return isNaN(num) ? 0 : num;
                    };

                    // --- Récupère les valeurs de possession
                    const p1 = parsePercent(d.match["possession team1"]);
                    const p2 = parsePercent(d.match["possession team2"]);
                    const pc = parsePercent(d.match["possession in contest"]);

                    // Si aucune donnée valide
                    if (p1 + p2 + pc === 0) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", 0)
                            .on("end", () => tooltip.style("display", "none"));
                        return;
                    }

                    // Nettoie le contenu précédent
                    tooltip.html("");

                    // --- Dimensions du donut
                    const width = 180;
                    const height = 180;
                    const radius = Math.min(width, height) / 2;

                    const svg = tooltip
                        .append("svg")
                        .attr("width", width)
                        .attr("height", height + 80)
                        .append("g")
                        .attr("transform", `translate(${width / 2}, ${height / 2})`);

                    // --- Données du donut
                    const dataPie = [
                        { label: d.t1, value: p1, color: "#00bcbcff" },
                        { label: d.t2, value: p2, color: "#FF00FF" },
                        { label: "Contesté", value: pc, color: "#7B68EE" }
                    ];

                    const pie = d3.pie()
                        .value(d => d.value)
                        .sort(null);

                    const arc = d3.arc()
                        .innerRadius(radius * 0.55)
                        .outerRadius(radius - 6);

                    // --- Tracé du donut
                    svg.selectAll("path")
                        .data(pie(dataPie))
                        .enter()
                        .append("path")
                        .attr("d", arc)
                        .attr("fill", d => d.data.color)
                        .attr("stroke", "#111")
                        .attr("stroke-width", 1)
                        .style("opacity", 0.9);

                    // --- Pourcentages sur les arcs
                    const total = p1 + p2 + pc;
                    const format = d3.format(".1f");

                    svg.selectAll("text")
                        .data(pie(dataPie))
                        .enter()
                        .append("text")
                        .attr("transform", d => `translate(${arc.centroid(d)})`)
                        .attr("text-anchor", "middle")
                        .attr("dy", "0.35em")
                        .attr("fill", "#fff")
                        .attr("font-size", "11px")
                        .text(d => `${format((d.data.value / total) * 100)}%`);

                    // --- Texte central
                    svg.append("text")
                        .attr("text-anchor", "middle")
                        .attr("dy", "0.35em")
                        .attr("fill", "#ddd")
                        .attr("font-size", "13px")
                        .attr("font-weight", "bold")
                        .text("Possession");

                    // --- Légende sous le donut
                    const legend = svg.append("g")
                        .attr("transform", `translate(${-40}, ${radius + 30})`);

                    const legendItems = legend.selectAll(".legend-item")
                        .data(dataPie)
                        .enter()
                        .append("g")
                        .attr("class", "legend-item")
                        .attr("transform", (_, i) => `translate(0, ${i * 18})`);

                    legendItems.append("rect")
                        .attr("width", 12)
                        .attr("height", 12)
                        .attr("rx", 2)
                        .attr("ry", 2)
                        .attr("fill", d => d.color)
                        .attr("stroke", "#111");

                    legendItems.append("text")
                        .attr("x", 18)
                        .attr("y", 10)
                        .attr("fill", "#fff")
                        .attr("font-size", "11px")
                        .text(d => d.label);

                    // --- Position et affichage de la popup
                    tooltip
                        .style("display", "block")
                        .style("background", "#1e1e1e")
                        .style("color", "#fff")
                        .style("border", "1px solid #fff")
                        .style("border-radius", "8px")
                        .style("padding", "8px")
                        .style("left", (event.pageX + 20) + "px")
                        .style("top", (event.pageY - 20) + "px")
                        .transition()
                        .duration(200)
                        .style("opacity", 1);
                });


            rects.exit().remove();
        });
    }

    grid.data = function (v) {
        if (!arguments.length) return data;
        data = v;
        return grid;
    }

    grid.teams = function (t1, t2) {
        teams1 = t1;
        teams2 = t2;
        return grid;
    };

    grid.size = function (ml, mt, cw, ch) {
        marginLeft = ml;
        marginTop = mt;
        cellWidth = cw;
        cellHeight = ch;
        return grid;
    };

    return grid;
}
