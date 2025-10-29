// --- DonutChart.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { DonutDetail } from "./DonutDetail.js";

export function DonutChart(container, data) {
    const width = 180;
    const height = 180;
    const radius = Math.min(width, height) / 2;

    // Nettoie le contenu précédent
    d3.select(container).selectAll("*").remove();

    // Crée le SVG principal
    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height + 80)
        .style("cursor", "pointer")
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // --- Données et arcs
    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc()
        .innerRadius(radius * 0.55)
        .outerRadius(radius - 6);

    const total = d3.sum(data, d => d.value);
    const format = d3.format(".1f");

    // --- Arcs principaux
    const paths = svg.selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => d.data.color)
        .attr("stroke", "#111")
        .attr("stroke-width", 1)
        .style("opacity", 0.9)
        .on("click", function (event, d) {
            event.stopPropagation(); // 🔹 Empêche la fermeture immédiate

            // Animation de focus sur l’arc
            d3.selectAll("path").attr("stroke-width", 1).attr("transform", "scale(1)");
            d3.select(this)
                .transition().duration(200)
                .attr("transform", `scale(1.05)`)
                .attr("stroke-width", 2);

            // Si ce n’est pas "Contesté"
            if (d.data.label !== "Contesté") {
                const teamKey = d.data.teamKey;
                const match = d.data.match;
                if (!teamKey || !match) return;

                const safe = (v) => (isNaN(v) || v == null ? 0 : +v);
                const space = "  "; // deux espaces pour "attempts ..." dans ton CSV

                const teamStats = {
                    team: d.data.label,
                    stats: {
                        attemptsOutside: safe(match[`attempts outside the penalty area${space}${teamKey}`]),
                        attemptsInside:  safe(match[`attempts inside the penalty area${space}${teamKey}`]),
                        goalsOutside:    safe(match[`goal outside the penalty area ${teamKey}`]),
                        goalsInside:     safe(match[`goal inside the penalty area ${teamKey}`]),
                        totalGoals:      safe(match[`number of goals ${teamKey}`])
                    }
                };

                // Supprime le précédent détail s’il existe
                d3.select("#donut-detail").remove();

                // Crée le nouveau conteneur
                const detailContainer = document.createElement("div");
                detailContainer.id = "donut-detail";
                detailContainer.style.position = "absolute";
                detailContainer.style.left = "220px";
                detailContainer.style.top = "0px";
                detailContainer.style.pointerEvents = "auto";
                container.appendChild(detailContainer);

                // Affiche le donut détaillé
                DonutDetail(detailContainer, teamStats);

                // 🔹 Écoute un clic en dehors du donut pour fermer
                setTimeout(() => {
                    document.addEventListener("click", handleOutsideClick, { once: true });
                }, 0);
            }
        });

    // --- Ferme le détail si on clique ailleurs
    function handleOutsideClick(e) {
        const detail = document.getElementById("donut-detail");
        if (detail && !container.contains(e.target)) {
            d3.select("#donut-detail").remove();
            d3.selectAll("path").attr("stroke-width", 1).attr("transform", "scale(1)");
        } else {
            // Si on clique dans le donut, réécoute à nouveau
            document.addEventListener("click", handleOutsideClick, { once: true });
        }
    }

    // --- Pourcentages sur les arcs
    svg.selectAll("text.percent")
        .data(pie(data))
        .enter()
        .append("text")
        .attr("class", "percent")
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

    // --- Légende
    const legend = svg.append("g")
        .attr("transform", `translate(${-40}, ${radius + 30})`);

    const legendItems = legend.selectAll(".legend-item")
        .data(data)
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
}
