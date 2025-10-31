import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function HeaderRow() {
    let teams = [];
    let marginLeft = 150;
    let marginTop = 120;
    let cellWidth = 80;
    let cellHeight = 40;

    function header(selection) {
        selection.each(function () {
            const g = d3.select(this);

            // --- Rectangles d’arrière-plan
            const rects = g.selectAll("rect").data(teams, (d) => d);

            rects
                .enter()
                .append("rect")
                .merge(rects)
                .attr("x", (_, i) => marginLeft + i * cellWidth)
                .attr("y", 0)
                .attr("width", cellWidth)
                .attr("height", marginTop)
                .attr("fill", "#2b2b2b")
                .attr("stroke", "#555")
                .attr("stroke-width", 1);

            rects.exit().remove();

            // --- Textes
            const texts = g.selectAll("text").data(teams, (d) => d);

            texts
                .enter()
                .append("text")
                .merge(texts)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("font-size", 12)
                .attr("fill", "white")
                .attr("font-weight", "bold")
                .attr("transform", (_, i) => {
                    const cx = marginLeft + i * cellWidth + cellWidth / 2;
                    const cy = marginTop / 2;

                    return `rotate(-90, ${cx}, ${cy})`;
                })
                .attr("x", (_, i) => marginLeft + i * cellWidth + cellWidth / 2)
                .attr("y", marginTop / 2)
                .text((d) => d);

            texts.exit().remove();
        });
    }

    header.teams = function (v) {
        if (!arguments.length) return teams;
        teams = v;
        return header;
    };

    header.size = function (ml, mt, cw, ch) {
        marginLeft = ml;
        marginTop = mt;
        cellWidth = cw;
        cellHeight = ch;
        return header;
    };

    return header;
}
