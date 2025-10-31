import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import { DonutChart } from "./DonutChart.js";

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

                    const parsePercent = (str) => {
                        if (!str) return 0;
                        const num = parseFloat(str.replace("%", "").trim());
                        return isNaN(num) ? 0 : num;
                    }

                    const p1 = parsePercent(d.match["possession team1"]);
                    const p2 = parsePercent(d.match["possession team2"]);
                    const pc = parsePercent(d.match["possession in contest"]);

                    if (p1 + p2 + pc === 0) return;

                    // --- Nettoyer l’ancienne popup
                    tooltip.html("");

                    // -- Données pour le DonutChart
                    const dataPie = [
                        { label: d.t1, value: p1, teamKey: "team1", match: d.match, color: "#3498db" },
                        { label: d.t2, value: p2, teamKey: "team2", match: d.match, color: "#9b59b6" },
                        { label: "Contesté", value: pc, teamKey: null, match: d.match, color: "#95a5a6" }
                    ]

                    // --- Créer le DonutChart dans la popup
                    DonutChart(tooltip.node(), dataPie);

                    tooltip.style("display", "block")
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
