import { BubbleChart } from "../components/bubbleChart/bubbleChart.js";
import { FilterMemory } from "../data/FilterMemory.js";

async function bubble() {
    try {

        const rows = await d3.csv("../data/worldcup_dataset.csv");

        if (!rows || rows.length === 0) {
            console.error("Les données CSV n'ont pas pu être chargées ou le fichier est vide.");
            return;
        }

        const container = document.getElementById('main-bubble-container');

        if (container) {
            BubbleChart({
                container: container,
                rows: rows,
                width: 1200,
                height: 700
            });
        } else {
            console.error("Le conteneur du graphique (ID: 'bubble-chart-container') n'a pas été trouvé.");
        }

    } catch (error) {
        console.error("Erreur lors de l'initialisation du graphique:", error);
    }
}

bubble();
