export function BubbleChart({ container, rows, width = 1200, height = 700 }) {
  
  // --- 1. MODIFICATION : Traitement des données ---
  // Nous créons 1 item par match, au lieu de 2
  const items = [];
  rows.forEach(r => {
    const parseNum = (k) => {
      const v = r[k];
      if (!v) return null;
      const n = parseFloat(String(v).replace('%','').trim());
      return isNaN(n) ? null : n;
    };
    
    const goals1 = parseNum('number of goals team1');
    const goals2 = parseNum('number of goals team2');
    
    items.push({ 
      team1: r.team1, 
      team2: r.team2,
      goals1: goals1,
      goals2: goals2,
      totalGoals: (goals1 || 0) + (goals2 || 0), // Taille basée sur le total
      match: `${r.team1} vs ${r.team2}`, 
      raw: r 
    });
  });

  // --- 2. MODIFICATION : Logique des sélecteurs ---
  // Puisque nous avons 1 bulle par match, les axes X et Y 
  // doivent pouvoir piocher dans TOUTES les stats.
  const numericKeys = [
      'total attempts team1','yellow cards team1', 'red cards team1', 'passes team1', 'defensive pressures applied team1', 'crosses team1', 'corners team1', 'receptions between midfield and defensive lines team1', 'right inside channel team1', 'left inside channel team1',
      'total attempts team2','yellow cards team2', 'red cards team2', 'passes team2', 'defensive pressures applied team2', 'crosses team2', 'corners team2', 'receptions between midfield and defensive lines team2', 'right inside channel team2', 'left inside channel team2'
  ];
  const allNumericKeys = Array.from(new Set(numericKeys)); // Enlève les doublons
  
  const options = ['totalGoals', 'possession team1', 'possession team2', ...allNumericKeys];

  const containerEl = d3.select(container);
  const xSel = containerEl.select('#bubble-x');
  const ySel = containerEl.select('#bubble-y');
  const mainPhaseSel = containerEl.select('#bubble-main-phase');
  const detailPhaseSel = containerEl.select('#bubble-detail-phase');
  const detailLabel = containerEl.select('#detail-label');

  const groupStages = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H'];
  const knockoutStages = ['Round of 16', 'Quarter-final', 'Semi-final', 'Play-off for third place', 'Final'];
  
  // Remplissage des sélecteurs (avec la nouvelle liste 'options')
  xSel.selectAll('option').data(options).enter().append('option').attr('value', d => d).text(d => d);
  ySel.selectAll('option').data(options).enter().append('option').attr('value', d => d).text(d => d);
  xSel.property('value','possession team1');
  ySel.property('value', 'possession team2');

  const mainPhaseOptions = [
      { value: 'all', text: 'Toutes les phases' },
      { value: 'group', text: 'Phase de Groupes' },
      { value: 'knockout', text: 'Phase Éliminatoire' }
  ];
  mainPhaseSel.selectAll('option').data(mainPhaseOptions).enter().append('option').attr('value', d => d.value).text(d => d.text);
  mainPhaseSel.property('value', 'all');

  let svg = containerEl.select('svg');
  if (svg.empty()) {
      svg = containerEl.append('svg').attr('width', width).attr('height', height);
  }

  function updateDetailSelect() {
      const selectedPhase = mainPhaseSel.node().value;
      let detailOptions = [];

      if (selectedPhase === 'group') {
          detailOptions = [{ value: 'all', text: 'Tous les groupes' }, ...groupStages.map(g => ({ value: g, text: g }))];
          detailLabel.style('display', null);
          detailPhaseSel.style('display', null);
      } else if (selectedPhase === 'knockout') {
          detailOptions = [{ value: 'all', text: 'Toutes les étapes' }, ...knockoutStages.map(k => ({ value: k, text: k }))];
          detailLabel.style('display', null);
          detailPhaseSel.style('display', null);
      } else {
          detailLabel.style('display', 'none');
          detailPhaseSel.style('display', 'none');
          detailPhaseSel.property('value', 'all'); 
      }

      detailPhaseSel.html('');
      detailPhaseSel.selectAll('option').data(detailOptions).enter().append('option').attr('value', d => d.value).text(d => d.text);
      render();
  }

  // --- Fonction Render (principales modifications ici) ---
  function render() {
    const goldColor = "#f1c40f";
    let isHoveringBubble = false; 

    let coordsTooltip = d3.select(container).select(".bubble-coords-tt");
    if (coordsTooltip.empty()) {
        coordsTooltip = d3.select(container)
            .append("div")
            .attr("class", "bubble-coords-tt");
    }

    const xKey = xSel.node().value;
    const yKey = ySel.node().value;
    const mainFilter = mainPhaseSel.node().value;
    const detailFilter = detailPhaseSel.node().value;

    // 3. MODIFICATION : Logique de mapping
    // 'it.goals' n'existe plus, et 'get' doit chercher dans raw
    let mapped = items.map(it => {
      const get = (k) => {
        if (k === 'totalGoals') return it.totalGoals;
        // 'k' est une clé du CSV comme "possession team1"
        return parseFloat((it.raw[k] || '').toString().replace('%','')) || null;
      };
      return { ...it, x: get(xKey), y: get(yKey) };
    }).filter(d => d.x != null && d.y != null);
    
    // Logique de filtrage (inchangée)
    if (mainFilter !== 'all') {
        mapped = mapped.filter(d => {
            const category = d.raw.category;
            const isGroup = category.startsWith('Group');
            if (mainFilter === 'group' && !isGroup) return false;
            if (mainFilter === 'knockout' && isGroup) return false;
            if (detailFilter !== 'all') return category === detailFilter;
            return true;
        });
    }

    const mx = d3.extent(mapped, d => d.x);
    const my = d3.extent(mapped, d => d.y);
    
    // 4. MODIFICATION : Taille basée sur le total des buts
    const maxGoals = d3.max(mapped, d => d.totalGoals || 0) || 1;
    // L'échelle de rayon utilise maintenant 5px comme min (pour 0 buts)
    const rScale = d3.scaleSqrt().domain([0, maxGoals]).range([20, 50]);


    const px = d3.scaleLinear().domain(mx).range([60, width-60]);
    const py = d3.scaleLinear().domain(my).range([height-60, 40]);
    const original_px = px.copy();
    const original_py = py.copy();

    // Fonction de zoom (modifiée pour les groupes <g>)
    function zoomed(event) {
        const { transform } = event;
        px.domain(transform.rescaleX(original_px).domain());
        py.domain(transform.rescaleY(original_py).domain());

        // MODIFICATION : Déplace les groupes <g>, pas les <circle>
        g.selectAll('g.match-bubble')
            .attr('transform', d => `translate(${px(d.x)}, ${py(d.y)})`);

        gx.call(d3.axisBottom(px));
        gy.call(d3.axisLeft(py));
        gx.selectAll('path, line').attr('stroke', goldColor);
        gx.selectAll('text').attr('fill', goldColor);
        gy.selectAll('path, line').attr('stroke', goldColor);
        gy.selectAll('text').attr('fill', goldColor);
    }

    svg.html(''); 

    const defs = svg.append('defs');
    const allTeams = Array.from(new Set(items.map(d => d.team1).concat(items.map(d => d.team2))));
    allTeams.forEach(teamName => {
      if (!teamName) return; // Sécurité
      const flagFileName = teamName.replace(/\s/g, '_').toUpperCase() + '.png'; 
      const patternId = 'flag-' + teamName.replace(/\s/g, '_').toLowerCase(); 
      const pattern = defs.append('pattern')
        .attr('id', patternId)
        .attr('width', 1) 
        .attr('height', 1)
        .attr('patternContentUnits', 'objectBoundingBox'); 
      pattern.append('image')
        .attr('xlink:href', `../../assets/${flagFileName}`) 
        .attr('width', 1)
        .attr('height', 1)
        .attr('preserveAspectRatio', 'xMidYMid slice'); 
    });

    const gx = svg.append('g').attr('transform', `translate(0,${height-60})`).call(d3.axisBottom(px));
    gx.selectAll('path, line').attr('stroke', goldColor);
    gx.selectAll('text').attr('fill', goldColor);
    const gy = svg.append('g').attr('transform', `translate(60,0)`).call(d3.axisLeft(py));
    gy.selectAll('path, line').attr('stroke', goldColor);
    gy.selectAll('text').attr('fill', goldColor);

    svg.append("text").attr("class", "x label").attr("text-anchor", "middle").attr("x", width / 2).attr("y", height - 20).style('font-weight', 'bold').style('fill', goldColor).text(xKey);
    svg.append("text").attr("class", "y label").attr("text-anchor", "middle").attr("y", 15).attr("x", -height / 2).attr("transform", "rotate(-90)").style('font-weight', 'bold').style('fill', goldColor).text(yKey);

    const g = svg.append('g');

    // --- 5. MODIFICATION MAJEURE : Dessin des bulles ---
    
    // Générateur de tarte (pie) 50/50
    const pie = d3.pie()
        .value(() => 50) // Deux valeurs égales
        .sort(null);

    // Générateur d'arc (demi-cercle)
    const arc = d3.arc()
        .innerRadius(0)
        // Le rayon extérieur est dynamique, basé sur le total des buts
        .outerRadius(d => rScale(d.data.totalGoals || 0));

    // Data join sur des groupes <g>
    const nodes = g.selectAll('g.match-bubble')
      .data(mapped, d => d.match); // Clé unique par match

    // --- ENTER ---
    const nodesEnter = nodes.enter().append('g')
        .attr('class', 'match-bubble')
        // Positionne le groupe <g>
        .attr('transform', d => `translate(${px(d.x)}, ${py(d.y)})`);

    // Pour chaque groupe, dessine les 2 demi-cercles
    nodesEnter.selectAll('path')
        .data(d => {
            // Crée les données pour la tarte 50/50
            const pieData = [
                { team: d.team1, totalGoals: d.totalGoals }, // Moitié 1
                { team: d.team2, totalGoals: d.totalGoals }  // Moitié 2
            ];
            return pie(pieData);
        })
        .enter().append('path')
        .attr('d', arc) // Dessine l'arc
        .attr('fill', (d, i) => {
            // d.data contient { team: '...', totalGoals: '...' }
            const teamName = d.data.team;
            if (!teamName) return '#ccc'; // Sécurité
            return `url(#flag-${teamName.replace(/\s/g, '_').toLowerCase()})`;
        })
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5);

    // --- 6. MODIFICATION : Tooltip sur le groupe ---
    nodesEnter
      .on('mouseover', (event,d) => { // 'd' est l'objet match complet
        isHoveringBubble = true;
        coordsTooltip.style("opacity", 0);
        
        const t = d3.select(container).selectAll('.bubble-tt').data([d]);
        t.enter().append('div').attr('class','bubble-tt')
          .merge(t)
          .style('position','absolute')
          .style('left',(event.pageX+8)+'px')
          .style('top',(event.pageY+8)+'px')
          // Nouveau contenu du tooltip
          .html(`
            <strong>${d.team1} vs ${d.team2}</strong><br/>
            Score: ${d.goals1} - ${d.goals2}<br/>
            <span style="font-size: 0.9em; color: #ccc;">(Total Buts: ${d.totalGoals})</span>
          `);
      })
      .on('mouseout', () => {
        isHoveringBubble = false;
        d3.select(container).selectAll('.bubble-tt').remove();
      });

    // --- EXIT ---
    nodes.exit().remove();
      
    // --- 7. MODIFICATION : Légende ---
    // Les données de la légende sont basées sur le total des buts
    const legendData = [maxGoals, Math.floor(maxGoals/2), 0]; 
    const uniqueLegendData = Array.from(new Set(legendData.filter(d => d >= 0))).sort((a,b) => b - a);

    const legendX = width - 120;
    const legendY = 60;
    const legend = svg.append('g').attr('class', 'bubble-legend').attr('transform', `translate(${legendX}, ${legendY})`);

    legend.append('text')
      .attr('x', -20).attr('y', -10).attr('text-anchor', 'middle')
      .style('font-size', '12px').style('font-weight', 'bold')
      .style('fill', goldColor)
      .text('Total Buts'); // Texte modifié
      
    let currentY = 0;
    uniqueLegendData.forEach(goals => {
      const r = rScale(goals);
      currentY += r; 
      legend.append('circle')
        .attr('cx', 0).attr('cy', currentY).attr('r', r)
        .attr('fill', goldColor).attr('fill-opacity', 0.5).attr('stroke', goldColor);
      legend.append('text')
        .attr('x', r + 5).attr('y', currentY).attr('dy', '0.35em') 
        .style('font-size', '10px').style('fill', goldColor)
        .text(`${goals} total`); // Texte modifié
      currentY += r + 5; 
    });
    
    // --- Gestion du Zoom et Coordonnées (modifié) ---
    const zoom = d3.zoom()
        .scaleExtent([1, 20])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed); 

    svg.call(zoom)
        .on("mouseover", () => {
            if (!isHoveringBubble) {
                coordsTooltip.style("opacity", 1);
            }
        })
        .on("mouseout", () => {
            coordsTooltip.style("opacity", 0);
        })
        .on("mousemove", (event) => {
            if (event.buttons === 0 && !isHoveringBubble) { 
                const [mouseX, mouseY] = d3.pointer(event);
                if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
                    coordsTooltip.style("opacity", 1); 
                    const xValue = px.invert(mouseX);
                    const yValue = py.invert(mouseY);
                    coordsTooltip.html(
                        `${xKey}: ${Math.round(xValue)}<br>
                         ${yKey}: ${Math.round(yValue)}`
                    )
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY + 15) + "px");
                } else {
                    coordsTooltip.style("opacity", 0);
                }
            } else if (isHoveringBubble) {
                coordsTooltip.style("opacity", 0);
            }
        });
  } // --- Fin de render() ---

  // Événements
  xSel.on('change', render);
  ySel.on('change', render);
  mainPhaseSel.on('change', updateDetailSelect);
  detailPhaseSel.on('change', render);
  
  updateDetailSelect(); // Lancement initial
}