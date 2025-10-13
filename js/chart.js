import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Table } from "../components/Table.js";

const norm = (v) => (v ?? "").toString().normalize("NFKC").trim();

let allData = [];
let dateExtent = [null, null];

// --- Chargement CSV
d3.csv("../data/worldcup_dataset.csv", d3.autoType).then((raw) => {
    allData = raw.map((d) => ({
        ...d,
        team1: norm(d.team1),
        team2: norm(d.team2),
        date: new Date(d.date),
    }));

    dateExtent = d3.extent(allData, (d) => d.date);

    createDateSlider(dateExtent);
    renderTable(allData);
});

// --- Affiche la table
function renderTable(data) {
    d3.select("#chart").selectAll("*").remove();
    d3.select("#chart").append("svg").call(Table().data(data));
}

// --- Slider creation
function createDateSlider([minDate, maxDate]) {
    const width = 260;
    const height = 50;
    const margin = { left: 10, right: 10 };

    const svg = d3
        .select("#date-slider")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height);

    const scale = d3
        .scaleTime()
        .domain([minDate, maxDate])
        .range([margin.left, width - margin.right]);

    // --- Barre de fond (track)
    svg.append("line")
        .attr("x1", scale.range()[0])
        .attr("x2", scale.range()[1])
        .attr("y1", height / 2)
        .attr("y2", height / 2)
        .attr("stroke", "#555")
        .attr("stroke-width", 4)
        .attr("stroke-linecap", "round");

    // --- Barre active (plage sélectionnée)
    const rangeBar = svg
        .append("line")
        .attr("x1", scale(minDate))
        .attr("x2", scale(maxDate))
        .attr("y1", height / 2)
        .attr("y2", height / 2)
        .attr("stroke", "#2ecc71")
        .attr("stroke-width", 6)
        .attr("stroke-linecap", "round");

    // --- Poignées
    const handleMin = svg
        .append("circle")
        .attr("r", 7)
        .attr("cx", scale(minDate))
        .attr("cy", height / 2)
        .attr("fill", "#f1c40f")
        .attr("stroke", "#222")
        .attr("cursor", "pointer");

    const handleMax = svg
        .append("circle")
        .attr("r", 7)
        .attr("cx", scale(maxDate))
        .attr("cy", height / 2)
        .attr("fill", "#f1c40f")
        .attr("stroke", "#222")
        .attr("cursor", "pointer");

    const label = d3.select("#date-range-label");

    let currentMin = minDate;
    let currentMax = maxDate;

    // --- Fonction d'affichage
    function updateRange() {
        rangeBar
            .attr("x1", scale(currentMin))
            .attr("x2", scale(currentMax));

        const formatDate = d3.timeFormat("%d %b");
        const sameDay =
            currentMin.toDateString() === currentMax.toDateString();

        label.text(
            sameDay
                ? `${formatDate(currentMin)}`
                : `${formatDate(currentMin)} → ${formatDate(currentMax)}`
        );

        // Filtrage des données
        const filtered = allData.filter(
            (d) => d.date >= currentMin && d.date <= currentMax
        );
        renderTable(filtered);
    }

    // --- Poignée gauche (min)
    handleMin.call(
        d3.drag().on("drag", (event) => {
            const x = Math.max(
                scale.range()[0],
                Math.min(scale(currentMax), event.x) // autorisé à rejoindre max, pas le dépasser
            );
            currentMin = scale.invert(x);
            handleMin.attr("cx", x);
            updateRange();
        })
    );

    // --- Poignée droite (max)
    handleMax.call(
        d3.drag().on("drag", (event) => {
            const x = Math.min(
                scale.range()[1],
                Math.max(scale(currentMin), event.x) // autorisé à rejoindre min, pas le dépasser
            );
            currentMax = scale.invert(x);
            handleMax.attr("cx", x);
            updateRange();
        })
    );

    // --- Initialisation
    updateRange();
}
