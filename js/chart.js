import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Table } from "../components/Table.js";
import { FilterMemory } from "../data/FilterMemory.js";

const norm = (v) => (v ?? "").toString().normalize("NFKC").trim();

// --- Variables globales
let allData = [];
let selectedCategory = "All";
let currentMin = null;
let currentMax = null;
let currentGoalsMin = 0;
let currentGoalsMax = 10;

// --- Récupère le singleton
const filterMemory = FilterMemory.getInstance();

// 🧠 Attendre que la mémoire soit prête
filterMemory.waitUntilReady().then(() => {
    console.log("🧠 Mémoire prête :", filterMemory);

    // --- Chargement du CSV
    d3.csv("../data/worldcup_dataset.csv", d3.autoType).then((raw) => {
        allData = raw.map((d) => ({
            ...d,
            team1: norm(d.team1),
            team2: norm(d.team2),
            date: new Date(d.date),
            total_goals:
                (d["number of goals team1"] ?? 0) + (d["number of goals team2"] ?? 0),
        }));

        // --- Étendue globale des données
        const dateExtent = d3.extent(allData, (d) => d.date);
        const goalsExtent = d3.extent(allData, (d) => d.total_goals);

        // 🟢 Utiliser les valeurs sauvegardées si disponibles, sinon les bornes CSV
        currentMin = filterMemory.dateMin ?? dateExtent[0];
        currentMax = filterMemory.dateMax ?? dateExtent[1];
        currentGoalsMin = filterMemory.goalsMin ?? Math.floor(goalsExtent[0]);
        currentGoalsMax = filterMemory.goalsMax ?? Math.ceil(goalsExtent[1]);
        selectedCategory = filterMemory.selectedCategory ?? "All";

        // --- Crée les sliders avec les bornes globales mais positions mémorisées
        createDateSlider([dateExtent[0], dateExtent[1]]);
        createGoalsSlider();

        // --- Affiche directement les données filtrées
        applyFilters();

        // --- Menu déroulant des phases
        const categories = Array.from(new Set(allData.map((d) => d.category))).sort();
        const select = d3.select("#filter-category");

        categories.forEach((cat) => {
            select.append("option").attr("value", cat).text(cat);
        });

        // 🟢 Positionner sur la catégorie sauvegardée
        select.property("value", selectedCategory);

        // --- Gestion changement de phase
        select.on("change", function () {
            selectedCategory = this.value;
            filterMemory.setCategory(selectedCategory);
            applyFilters();
        });
    });
});

// --- Fonction d’affichage du tableau
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

    // --- Barre de fond
    svg.append("line")
        .attr("x1", scale.range()[0])
        .attr("x2", scale.range()[1])
        .attr("y1", height / 2)
        .attr("y2", height / 2)
        .attr("stroke", "#555")
        .attr("stroke-width", 4)
        .attr("stroke-linecap", "round");

    // --- Barre active
    const rangeBar = svg
        .append("line")
        .attr("x1", scale(currentMin))
        .attr("x2", scale(currentMax))
        .attr("y1", height / 2)
        .attr("y2", height / 2)
        .attr("stroke", "#2ecc71")
        .attr("stroke-width", 6)
        .attr("stroke-linecap", "round");

    // --- Poignées
    const handleMin = svg
        .append("circle")
        .attr("r", 7)
        .attr("cx", scale(currentMin))
        .attr("cy", height / 2)
        .attr("fill", "#f1c40f")
        .attr("stroke", "#222")
        .attr("cursor", "pointer");

    const handleMax = svg
        .append("circle")
        .attr("r", 7)
        .attr("cx", scale(currentMax))
        .attr("cy", height / 2)
        .attr("fill", "#f1c40f")
        .attr("stroke", "#222")
        .attr("cursor", "pointer");

    const label = d3.select("#date-range-label");

    // --- Mise à jour
    function updateRange() {
        rangeBar.attr("x1", scale(currentMin)).attr("x2", scale(currentMax));

        if (!currentMin || !currentMax) return;

        const formatDate = d3.timeFormat("%d %b");
        const sameDay = currentMin.toDateString() === currentMax.toDateString();

        label.text(
            sameDay
                ? `${formatDate(currentMin)}`
                : `${formatDate(currentMin)} → ${formatDate(currentMax)}`
        );

        // 🧠 Mise à jour FilterMemory
        filterMemory.setDateRange(currentMin, currentMax);
        applyFilters();
    }

    // --- Drag gauche
    handleMin.call(
        d3.drag().on("drag", (event) => {
            const x = Math.max(scale.range()[0], Math.min(scale(currentMax), event.x));
            currentMin = scale.invert(x);
            handleMin.attr("cx", x);
            updateRange();
        })
    );

    // --- Drag droite
    handleMax.call(
        d3.drag().on("drag", (event) => {
            const x = Math.min(scale.range()[1], Math.max(scale(currentMin), event.x));
            currentMax = scale.invert(x);
            handleMax.attr("cx", x);
            updateRange();
        })
    );

    updateRange();
}

// --- Slider des buts
function createGoalsSlider() {
    const [minGoals, maxGoals] = d3.extent(allData, (d) => d.total_goals);
    const width = 260;
    const height = 50;
    const margin = { left: 10, right: 10 };

    const svg = d3
        .select("#goals-slider")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height);

    const scale = d3
        .scaleLinear()
        .domain([minGoals, maxGoals])
        .range([margin.left, width + margin.left]);

    svg.append("line")
        .attr("x1", scale.range()[0])
        .attr("x2", scale.range()[1])
        .attr("y1", height / 2)
        .attr("y2", height / 2)
        .attr("stroke", "#555")
        .attr("stroke-width", 4)
        .attr("stroke-linecap", "round");

    const rangeBar = svg
        .append("line")
        .attr("x1", scale(currentGoalsMin))
        .attr("x2", scale(currentGoalsMax))
        .attr("y1", height / 2)
        .attr("y2", height / 2)
        .attr("stroke", "#3498db")
        .attr("stroke-width", 6)
        .attr("stroke-linecap", "round");

    const handleMin = svg
        .append("circle")
        .attr("r", 7)
        .attr("cx", scale(currentGoalsMin))
        .attr("cy", height / 2)
        .attr("fill", "#9b59b6")
        .attr("stroke", "#222")
        .attr("cursor", "pointer");

    const handleMax = svg
        .append("circle")
        .attr("r", 7)
        .attr("cx", scale(currentGoalsMax))
        .attr("cy", height / 2)
        .attr("fill", "#9b59b6")
        .attr("stroke", "#222")
        .attr("cursor", "pointer");

    const label = d3.select("#goals-range-label");

    function updateGoalsRange() {
        rangeBar
            .attr("x1", scale(currentGoalsMin))
            .attr("x2", scale(currentGoalsMax));

        label.text(`${Math.round(currentGoalsMin)} → ${Math.round(currentGoalsMax)}`);

        filterMemory.setGoalsRange(currentGoalsMin, currentGoalsMax);
        applyFilters();
    }

    handleMin.call(
        d3.drag().on("drag", (event) => {
            const x = Math.max(scale.range()[0], Math.min(scale(currentGoalsMax), event.x));
            currentGoalsMin = scale.invert(x);
            handleMin.attr("cx", x);
            updateGoalsRange();
        })
    );

    handleMax.call(
        d3.drag().on("drag", (event) => {
            const x = Math.min(scale.range()[1], Math.max(scale(currentGoalsMin), event.x));
            currentGoalsMax = scale.invert(x);
            handleMax.attr("cx", x);
            updateGoalsRange();
        })
    );

    updateGoalsRange();
}

// --- Application combinée
function applyFilters() {
    let filtered = allData.filter(
        (d) =>
            d.date >= currentMin &&
            d.date <= currentMax &&
            d.total_goals >= currentGoalsMin &&
            d.total_goals <= currentGoalsMax
    );

    if (selectedCategory !== "All") {
        filtered = filtered.filter((d) => d.category === selectedCategory);
    }

    renderTable(filtered);
}
