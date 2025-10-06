import { BarChart } from "./components/barChart.js";

d3.csv("data/dataset.csv").then(data => {
  data.forEach(d => {
    d.year = +d.year;
    d.value = +d.value;
  });

  BarChart({
    container: "#chart",
    data: data,
    color: "#ff7f0e"
  });
});
