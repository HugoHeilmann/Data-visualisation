import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Table } from "../components/Table.js";

// --- Fonction utilitaire de normalisation
const norm = (v) => (v ?? "").toString().normalize("NFKC").trim();

// --- Variables globales
let allData = [];
let dateExtent = [null, null];
let selectedCategory = "All";
let currentMin = null;
let currentMax = null;

// --- Chargement du CSV
d3.csv("../data/worldcup_dataset.csv", d3.autoType).then((raw) => {
    allData = raw.map((d) => ({
        ...d,
        team1: norm(d.team1),
        team2: norm(d.team2),
        date: new Date(d.date),
    }));

    // Bornes temporelles globales
    dateExtent = d3.extent(allData, (d) => d.date);

    // Création du slider de dates
    createDateSlider(dateExtent);

    // Premier affichage du tableau
    renderTable(allData);

    // --- Création du menu déroulant de phases / catégories
    const categories = Array.from(new Set(allData.map(d => d.category))).sort();

    const select = d3.select("#filter-category");
    categories.forEach(cat => {
        select.append("option")
            .attr("value", cat)
            .text(cat);
    });

    // Gestion du changement de phase
    select.on("change", function() {
        selectedCategory = this.value;
        applyFilters();
    });
});

// --- Fonction d'affichage du tableau
function renderTable(data) {
    d3.select("#chart").selectAll("*").remove();
    d3.select("#chart").append("svg").call(Table().data(data));
}

// --- Création du slider temporel
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

    // --- Poignées (cercles)
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

    // Initialisation globale
    currentMin = minDate;
    currentMax = maxDate;

    // --- Fonction de mise à jour du slider
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

        // Applique les filtres combinés
        applyFilters();
    }

    // --- Poignée gauche (min)
    handleMin.call(
        d3.drag().on("drag", (event) => {
            const x = Math.max(
                scale.range()[0],
                Math.min(scale(currentMax), event.x) // autorisé à rejoindre max, pas dépasser
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
                Math.max(scale(currentMin), event.x) // autorisé à rejoindre min, pas dépasser
            );
            currentMax = scale.invert(x);
            handleMax.attr("cx", x);
            updateRange();
        })
    );

    // --- Initialisation
    updateRange();
}

// --- Application combinée des filtres (date + catégorie)
function applyFilters() {
    let filtered = allData.filter(
        (d) => d.date >= currentMin && d.date <= currentMax
    );

    if (selectedCategory !== "All") {
        filtered = filtered.filter((d) => d.category === selectedCategory);
    }

    renderTable(filtered);
}
