// Configuration
const margin = {top: 20, right: 20, bottom: 50, left: 60};
const width = 700 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Variables globales
let allData = [];
let filteredData = [];
let currentXAxis = 'possession_team1';
let currentYAxis = 'goals_team1';

// Couleurs pour les différentes phases
const colorScale = d3.scaleOrdinal()
    .domain(['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H',
                'Round of 16', 'Quarter-final', 'Semi-final', 'Final', 'Play-off for third place'])
    .range(['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
            '#e91e63', '#ff5722', '#795548', '#ffc107', '#607d8b']);

// Création du SVG principal
const svg = d3.select("#scatter-plot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip");

// Chargement des données
d3.csv("../data/worldcup_dataset.csv").then(rawData => {
    // Transformation des données
    allData = rawData.map(d => ({
        team1: d.team1,
        team2: d.team2,
        date: new Date(d.date),
        category: d.category,
        goals_team1: +d["number of goals team1"] || 0,
        goals_team2: +d["number of goals team2"] || 0,
        possession_team1: parseFloat(d["possession team1"]) || 0,
        possession_team2: parseFloat(d["possession team2"]) || 0,
        possession_in_contest: parseFloat(d["possession in contest"]) || 0,
        attempts_team1: +d["total attempts team1"] || 0,
        attempts_team2: +d["total attempts team2"] || 0,
        on_target_team1: +d["on target attempts team1"] || 0,
        on_target_team2: +d["on target attempts team2"] || 0,
        passes_team1: +d["passes team1"] || 0,
        passes_team2: +d["passes team2"] || 0,
        passes_completed_team1: +d["passes completed team1"] || 0,
        passes_completed_team2: +d["passes completed team2"] || 0,
        yellow_cards_team1: +d["yellow cards team1"] || 0,
        yellow_cards_team2: +d["yellow cards team2"] || 0,
        red_cards_team1: +d["red cards team1"] || 0,
        red_cards_team2: +d["red cards team2"] || 0
    }));

    filteredData = [...allData];
    createVisualization();
    createLegend();
    setupEventListeners();

});

function createVisualization() {
    // Nettoyer le SVG
    svg.selectAll("*").remove();

    // Échelles
    const xScale = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d[currentXAxis]))
        .range([0, width])
        .nice();

    const yScale = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d[currentYAxis]))
        .range([height, 0])
        .nice();

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    svg.append("g")
        .attr("class", "axis")
        .call(yAxis);

    // Labels des axes
    svg.append("text")
        .attr("transform", `translate(${width/2},${height + 40})`)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(getAxisLabel(currentXAxis));

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(getAxisLabel(currentYAxis));

    // Points
    svg.selectAll(".dot")
        .data(filteredData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d[currentXAxis]))
        .attr("cy", d => yScale(d[currentYAxis]))
        .attr("r", 5)
        .style("fill", d => colorScale(d.category))
        .style("opacity", 0.7)
        .on("mouseover", function(event, d) {
            showTooltip(event, d);
        })
        .on("mouseout", function() {
            hideTooltip();
        })
        .on("click", function(event, d) {
            showMatchDetails(d);
            highlightPoint(this);
        });
}

function createLegend() {
    const legend = d3.select("#legend");
    legend.selectAll("*").remove();

    const categories = [...new Set(allData.map(d => d.category))];

    const legendItems = legend.selectAll(".legend-item")
        .data(categories)
        .enter().append("div")
        .attr("class", "legend-item");

    legendItems.append("span")
        .attr("class", "legend-color")
        .style("background-color", d => colorScale(d));

    legendItems.append("span")
        .text(d => d);
}

function showTooltip(event, d) {
    tooltip.transition().duration(200).style("opacity", .9);
    tooltip.html(`
        <strong>${d.team1} vs ${d.team2}</strong><br/>
        ${d.category}<br/>
        ${d.date.toLocaleDateString('fr-FR')}<br/>
        X: ${d[currentXAxis]}<br/>
        Y: ${d[currentYAxis]}
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
}

function hideTooltip() {
    tooltip.transition().duration(500).style("opacity", 0);
}

function showMatchDetails(match) {
    const detailsDiv = d3.select("#match-details");

    detailsDiv.html(`
        <div class="match-info">
            <h3>${match.team1} vs ${match.team2}</h3>
            <div class="stat-row">
                <span class="stat-label">Score:</span>
                <span>${match.goals_team1} - ${match.goals_team2}</span>
            </div>

            <div class="stat-row">
                <span class="stat-label">Phase:</span>
                <span>${match.category}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Date:</span>
                <span>${match.date.toLocaleDateString('fr-FR')}</span>
            </div>
        </div>

        <h4>Statistiques Détaillées</h4>
        <div class="stat-row">
            <span class="stat-label">Possession:</span>
            <span>${match.possession_team1}% - ${match.possession_team2}%</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Possession en duel:</span>
            <span>${match.possession_in_contest}%</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Tentatives:</span>
            <span>${match.attempts_team1} - ${match.attempts_team2}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Tirs cadrés:</span>
            <span>${match.on_target_team1} - ${match.on_target_team2}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Passes totales:</span>
            <span>${match.passes_team1} - ${match.passes_team2}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Passes réussies:</span>
            <span>${match.passes_completed_team1} - ${match.passes_completed_team2}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Cartons jaunes:</span>
            <span>${match.yellow_cards_team1} - ${match.yellow_cards_team2}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Cartons rouges:</span>
            <span>${match.red_cards_team1} - ${match.red_cards_team2}</span>
        </div>
    `);
}

function highlightPoint(element) {
    svg.selectAll(".dot").classed("highlight", false);
    d3.select(element).classed("highlight", true);
}

function getAxisLabel(axis) {
    const labels = {
        'possession_team1': 'Possession Équipe 1 (%)',
        'goals_team1': 'Buts Équipe 1',
        'attempts_team1': 'Tentatives Équipe 1',
        'on_target_team1': 'Tirs Cadrés Équipe 1',
        'passes_completed_team1': 'Passes Complétées Équipe 1',
        'yellow_cards_team1': 'Cartons Jaunes Équipe 1'
    };
    return labels[axis] || axis;
}

function setupEventListeners() {
    // Changement d'axes
    d3.select("#x-axis").on("change", function() {
        currentXAxis = this.value;
        createVisualization();
    });

    d3.select("#y-axis").on("change", function() {
        currentYAxis = this.value;
        createVisualization();
    });

    // Filtre par phase
    d3.select("#phase-filter").on("change", function() {
        const selectedPhase = this.value;
        if (selectedPhase === "all") {
            filteredData = [...allData];
        } else {
            filteredData = allData.filter(d => d.category === selectedPhase);
        }
        createVisualization();
    });

    // Reset
    d3.select("#reset-btn").on("click", function() {
        filteredData = [...allData];
        d3.select("#x-axis").property("value", "possession_team1");
        d3.select("#y-axis").property("value", "goals_team1");
        d3.select("#phase-filter").property("value", "all");
        currentXAxis = "possession_team1";
        currentYAxis = "goals_team1";
        createVisualization();
        d3.select("#match-details").html(`
            <p style="color: #7f8c8d; font-style: italic;">
                Cliquez sur un point pour voir les détails du match
            </p>
        `);
    });
}
