import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const norm = (v) => (v ?? "").toString().normalize("NFKC").trim();

export class FilterMemory {
    constructor() {
        if (FilterMemory.instance) {
            return FilterMemory.instance;
        }

        // Default values
        this.dateMin = null;
        this.dateMax = null;
        this.goalsMin = 0;
        this.goalsMax = 10;
        this.selectedCategory = "All";
        this.selectedXAxis = "possession_team1";
        this.selectedYAxis = "goals_team1";
        this.selectedBubbleXAxis = "possession team1";
        this.selectedBubbleYAxis = "possession team2";
        this.selectedBubbleMainPhase = "all";
        this.selectedBubbleDetailPhase = "all";
        this.koOnly = false;
        this.timestamp = Date.now();

        this.loadFromStorage();

        this.ready = this.loadData();

        FilterMemory.instance = this;
    }

    static getInstance() {
        return new FilterMemory();
    }

    async loadData() {
        try {
            const raw = await d3.csv("../data/worldcup_dataset.csv", d3.autoType);

            const data = raw.map((d) => ({
                ...d,
                team1: norm(d.team1),
                team2: norm(d.team2),
                date: new Date(d.date),
                total_goals:
                    (d["number of goals team1"] ?? 0) +
                    (d["number of goals team2"] ?? 0),
            }));

            // Détermination des bornes
            const dateExtent = d3.extent(data, (d) => d.date);
            const goalsExtent = d3.extent(data, (d) => d.total_goals);

            // Initialisation de la mémoire
            this.dateMin ??= dateExtent[0];
            this.dateMax ??= dateExtent[1];
            this.goalsMin ??= Math.floor(goalsExtent[0]);
            this.goalsMax ??= Math.ceil(goalsExtent[1]);

            this.category = "All";
        } catch (error) {
            console.error("Erreur de chargement du CSV :", error);
        }
    }

    async waitUntilReady() {
        await this.ready;
        return this;
    }

    setDateRange(min, max) {
        this.dateMin = min;
        this.dateMax = max;
        this.saveToStorage();
    }

    setGoalsRange(min, max) {
        this.goalsMin = min;
        this.goalsMax = max;
        this.saveToStorage();
    }

    setCategory(cat) {
        this.selectedCategory = cat;
        this.saveToStorage();
    }

    setXAxis(axis) {
        this.selectedXAxis = axis;
        this.saveToStorage();
    }

    setYAxis(axis) {
        this.selectedYAxis = axis;
        this.saveToStorage();
    }

    setBubbleXAxis(axis) {
        this.selectedBubbleXAxis = axis;
        this.saveToStorage();
    }

    setBubbleYAxis(axis) {
        this.selectedBubbleYAxis = axis;
        this.saveToStorage();
    }

    setBubbleMainPhase(phase) {
        this.selectedBubbleMainPhase = phase;
        this.saveToStorage();
    }

    setBubbleDetailPhase(phase) {
        this.selectedBubbleDetailPhase = phase;
        this.saveToStorage();
    }

    setKoOnly(value) {
        this.koOnly = value;
        this.saveToStorage();
    }

    saveToStorage() {
        const data = {
            dateMin: this.dateMin?.toISOString() ?? null,
            dateMax: this.dateMax?.toISOString() ?? null,
            goalsMin: this.goalsMin,
            goalsMax: this.goalsMax,
            selectedCategory: this.selectedCategory,
            selectedXAxis: this.selectedXAxis,
            selectedYAxis: this.selectedYAxis,
            selectedBubbleXAxis: this.selectedBubbleXAxis,
            selectedBubbleYAxis: this.selectedBubbleYAxis,
            selectedBubbleMainPhase: this.selectedBubbleMainPhase,
            selectedBubbleDetailPhase: this.selectedBubbleDetailPhase,
            koOnly: this.koOnly
        };
        localStorage.setItem("filterMemory", JSON.stringify(data));
    }

    loadFromStorage() {
        const raw = localStorage.getItem("filterMemory");
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);

            this.dateMin = parsed.dateMin ? new Date(parsed.dateMin) : null;
            this.dateMax = parsed.dateMax ? new Date(parsed.dateMax) : null;
            this.goalsMin = parsed.goalsMin ?? 0;
            this.goalsMax = parsed.goalsMax ?? 10;
            this.selectedCategory = parsed.selectedCategory ?? "All";
            this.selectedXAxis = parsed.selectedXAxis ?? "possession_team1";
            this.selectedYAxis = parsed.selectedYAxis ?? "goals_team1";
            this.selectedBubbleXAxis = parsed.selectedBubbleXAxis ?? "possession team1";
            this.selectedBubbleYAxis = parsed.selectedBubbleYAxis ?? "possession team2";
            this.selectedBubbleMainPhase = parsed.selectedBubbleMainPhase ?? "all";
            this.selectedBubbleDetailPhase = parsed.selectedBubbleDetailPhase ?? "all";
            this.koOnly = parsed.koOnly ?? false;
        } catch (error) {
            console.error("Erreur de parsing de la mémoire :", error);
        }
    }
}
