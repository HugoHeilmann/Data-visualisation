import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import { HeaderRow } from "./HeaderRow.js";
import { HeaderColumn } from "./HeaderColumn.js";
import { CellGrid } from "./CellGrid.js";

export function Table() {
    let data = [];
    let marginTop = 120;
    let marginLeft = 150;

    function table(selection) {
        selection.each(function () {
            const svg = d3.select(this).style("background", "#1a1a1a");

            // --- Teams
            const teams1 = Array.from(new Set(data.map((d) => d.team1))).sort();
            const teams2 = Array.from(new Set(data.map((d) => d.team2))).sort();

            if (!teams1.length || !teams2.length) {
                console.warn("[Table] Aucune équipe trouvée. Vérifie les colonnes 'team1' / 'team2' et l’appel Table().data(data).");
            }

            const cellWidth = 40;
            const cellHeight = 25;

            const totalWidth = marginLeft + cellWidth * teams2.length;
            const totalHeight = marginTop + cellHeight * teams1.length;

            svg.attr("width", totalWidth).attr("height", totalHeight);

            // --- Sup-Left Corner
            svg.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", marginLeft)
                .attr("height", marginTop)
                .attr("fill", "#333");

            svg.append("text")
                .attr("x", marginLeft / 2)
                .attr("y", marginTop / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", "white")
                .attr("font-weight", "bold")
                .text("Local / Visiteur");

            // --- Créer les sous-composants
            const headerRow = HeaderRow()
                .teams(teams2)
                .size(marginLeft, marginTop, cellWidth);

            const headerColumn = HeaderColumn()
                .teams(teams1)
                .data(data)
                .size(marginLeft, marginTop, cellHeight);

            const cellGrid = CellGrid()
                .teams(teams1, teams2)
                .data(data)
                .size(marginLeft, marginTop, cellWidth, cellHeight);

            svg.append("g").call(headerRow);
            svg.append("g").call(headerColumn);
            svg.append("g").call(cellGrid);
        });
    }

    table.data = function (v) {
        data = v;
        return table;
    };

    return table;
}
