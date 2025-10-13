import { BarChart } from "./components/barChart.js";

// Charger les données de la Coupe du Monde
d3.csv("data/worldcup_dataset.csv").then(rawData => {
  console.log("Données brutes chargées:", rawData.slice(0, 3)); // Debug: voir les premières lignes
  
  // Nettoyer et transformer les données
  const data = rawData.map(d => ({
    // Informations de base du match
    team1: d.team1,
    team2: d.team2,
    date: new Date(d.date),
    category: d.category,
    
    // Scores et statistiques
    goals_team1: +d["number of goals team1"] || 0,
    goals_team2: +d["number of goals team2"] || 0,
    possession_team1: parseFloat(d["possession team1"]) || 0,
    possession_team2: parseFloat(d["possession team2"]) || 0,
    
    // Tentatives
    attempts_team1: +d["total attempts team1"] || 0,
    attempts_team2: +d["total attempts team2"] || 0,
    on_target_team1: +d["on target attempts team1"] || 0,
    on_target_team2: +d["on target attempts team2"] || 0,
    
    // Passes et statistiques avancées
    passes_team1: +d["passes team1"] || 0,
    passes_team2: +d["passes team2"] || 0,
    passes_completed_team1: +d["passes completed team1"] || 0,
    passes_completed_team2: +d["passes completed team2"] || 0,
    
    // Cartons
    yellow_cards_team1: +d["yellow cards team1"] || 0,
    yellow_cards_team2: +d["yellow cards team2"] || 0,
    red_cards_team1: +d["red cards team1"] || 0,
    red_cards_team2: +d["red cards team2"] || 0
  }));

  console.log("Données transformées:", data.slice(0, 3)); // Debug: voir les données transformées
  console.log("Nombre total de matchs:", data.length);

  // Exemple de visualisation : Nombre de buts par équipe
  // Créer des données agrégées pour la visualisation
  const teamGoals = {};
  
  data.forEach(match => {
    // Compter les buts pour chaque équipe
    if (!teamGoals[match.team1]) teamGoals[match.team1] = 0;
    if (!teamGoals[match.team2]) teamGoals[match.team2] = 0;
    
    teamGoals[match.team1] += match.goals_team1;
    teamGoals[match.team2] += match.goals_team2;
  });

  // Convertir en format pour le graphique
  const chartData = Object.entries(teamGoals)
    .map(([team, goals]) => ({
      year: team, // On utilise 'year' car le barChart l'attend
      value: goals
    }))
    .sort((a, b) => b.value - a.value) // Trier par nombre de buts décroissant
    .slice(0, 10); // Prendre les 10 meilleures équipes

  console.log("Données pour le graphique:", chartData);

  // Créer le graphique
  BarChart({
    container: "#chart",
    data: chartData,
    color: "#ff7f0e",
    width: 800,
    height: 500
  });

  // Ajouter un titre dynamique
  d3.select("body")
    .insert("h2", "#chart")
    .text("Top 10 des équipes par nombre de buts marqués - Coupe du Monde 2022")
    .style("text-align", "center")
    .style("margin", "20px 0");
})
.catch(error => {
  console.error("Erreur lors du chargement des données:", error);
});
