import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function HeaderColumn() {
    let teams = [];
    let data = [];
    let marginLeft = 150;
    let marginTop = 140;
    let cellHeight = 70;

    function header(selection) {
        selection.each(function () {
            const g = d3.select(this);

            // --- Calcul des stats pour chaque equipe
            const statsByTeam = {};
            teams.forEach((team) => {
                const matches = data.filter(d => d.team1 === team);
                if (!matches.length) {
                    statsByTeam[team] = { wins: 0, draws: 0, losses: 0 };
                    return;
                }

                let wins = 0, draws = 0, losses = 0;
                matches.forEach((match) => {
                    const g1 = +match["number of goals team1"];
                    const g2 = +match["number of goals team2"];
                    if (g1 > g2) wins++;
                    else if (g1 < g2) losses++;
                    else draws++;
                });

                const total = wins + draws + losses;
                statsByTeam[team] = {
                    wins: wins / total,
                    draws: draws / total,
                    losses: losses / total
                };
            });

            console.log("statsByTeam", statsByTeam);

            // --- Groupe principal pour chaque équipe
            const groups = g.selectAll("g.team-row").data(teams, (d) => d);

            const groupsEnter = groups.enter()
                .append("g")
                .attr("class", "team-row");

            // --- Fond coloré : 3 colonnes (vert / jaune / rouge)
            groupsEnter.each(function (d, i) {
                const group = d3.select(this);
                const y = marginTop + i * cellHeight;

                const stats = statsByTeam[d] || { wins: 0.33, draws: 0.33, losses: 0.33 };

                const wWins = marginLeft * stats.wins;
                const wDraws = marginLeft * stats.draws;
                const wLosses = marginLeft * stats.losses;

                // vert
                group.append("rect")
                    .attr("x", 0)
                    .attr("y", y)
                    .attr("width", wWins)
                    .attr("height", cellHeight)
                    .attr("fill", "#2ecc71")
                    .attr("stroke", "#555")
                    .attr("stroke-width", 1);

                // jaune
                group.append("rect")
                    .attr("x", wWins)
                    .attr("y", y)
                    .attr("width", wDraws)
                    .attr("height", cellHeight)
                    .attr("fill", "#f1c40f")
                    .attr("stroke", "#555")
                    .attr("stroke-width", 1);

                // rouge
                group.append("rect")
                    .attr("x", wWins + wDraws)
                    .attr("y", y)
                    .attr("width", wLosses)
                    .attr("height", cellHeight)
                    .attr("fill", "#e74c3c")
                    .attr("stroke", "#555")
                    .attr("stroke-width", 1);

                // --- Nom de l'équipe centré
                group
                    .append("text")
                    .attr("x", marginLeft / 2)
                    .attr("y", y + cellHeight / 2)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .attr("fill", "white")
                    .attr("font-weight", "bold")
                    .attr("font-size", 13)
                    .text(d);
            });

            groups.exit().remove();
        });
    }

    header.teams = function (v) {
        if (!arguments.length) return teams;
        teams = v;
        return header;
    };

    header.size = function (ml, mt, ch) {
        marginLeft = ml;
        marginTop = mt;
        cellHeight = ch;
        return header;
    };

    header.data = function (v) {
        if (!arguments.length) return data;
        data = v;
        return header;
    };

    return header;
}
