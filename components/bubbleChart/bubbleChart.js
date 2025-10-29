export function BubbleChart({ container, rows, width = 900, height = 500 }) {
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
    items.push({ team: r.team1, match: `${r.team1} vs ${r.team2}`, side: 1, goals: goals1, raw: r });
    items.push({ team: r.team2, match: `${r.team1} vs ${r.team2}`, side: 2, goals: goals2, raw: r });
  });

  const numericKeys1 = ['total attempts team1','yellow cards team1', 'red cards team1', 'passes team1', 'defensive pressures applied team1', 'crosses team1', 'corners team1', 'receptions between midfield and defensive lines team1', 'right inside channel team1', 'left inside channel team1'];
  const numericKeys2 = ['total attempts team2','yellow cards team2', 'red cards team2', 'passes team2', 'defensive pressures applied team2', 'crosses team2', 'corners team2', 'receptions between midfield and defensive lines team2', 'right inside channel team2', 'left inside channel team2'];

  const containerEl = d3.select(container);

  const xSel = containerEl.select('#bubble-x');
  const ySel = containerEl.select('#bubble-y');
  const mainPhaseSel = containerEl.select('#bubble-main-phase');
  const detailPhaseSel = containerEl.select('#bubble-detail-phase');
  const detailLabel = containerEl.select('#detail-label');

  // Données pour les filtres de phase
  const groupStages = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H'];
  const knockoutStages = ['Round of 16', 'Quarter-final', 'Semi-final', 'Play-off for third place', 'Final'];

  // Options pour les axes (inchangé)
  const xOptions = ['goals', 'possession team1', ...numericKeys1];
  const yOptions = ['goals', 'possession team2', ...numericKeys2];
  
  // Remplissage initial des sélecteurs (peut rester ici ou être mis dans le HTML)
  xSel.selectAll('option').data(xOptions).enter().append('option').attr('value', d => d).text(d => d);
  ySel.selectAll('option').data(yOptions).enter().append('option').attr('value', d => d).text(d => d);

  xSel.property('value','possession team1');
  ySel.property('value', 'possession team2');

  // 1. Options pour le filtre principal (mainPhaseSel)
  const mainPhaseOptions = [
      { value: 'all', text: 'Toutes les phases' },
      { value: 'group', text: 'Phase de Groupes' },
      { value: 'knockout', text: 'Phase Éliminatoire' }
  ];
  mainPhaseSel.selectAll('option').data(mainPhaseOptions).enter().append('option').attr('value', d => d.value).text(d => d.text);
  mainPhaseSel.property('value', 'all');

  // Le conteneur SVG doit être créé dynamiquement dans le conteneur principal
  // pour être effacé et recréé facilement.
  let svg = containerEl.select('svg');
  if (svg.empty()) {
      svg = containerEl.append('svg').attr('width', width).attr('height', height);
  }

  // Fonction pour mettre à jour le sélecteur de détail
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

      // Vider et remplir le sélecteur de détail
      detailPhaseSel.html('');
      detailPhaseSel.selectAll('option').data(detailOptions).enter().append('option').attr('value', d => d.value).text(d => d.text);

      render();
  }

  function render() {
    const goldColor = "#f1c40f";

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

    let mapped = items.map(it => {
      const get = (k) => {
        if (k === 'goals') return it.goals;
        return parseFloat((it.raw[k] || '').toString().replace('%','')) || null;
      };
      return { ...it, x: get(xKey), y: get(yKey) };
    }).filter(d => d.x != null && d.y != null);
    
    // LOGIQUE DE FILTRAGE
    if (mainFilter !== 'all') {
        mapped = mapped.filter(d => {
            const category = d.raw.category;
            const isGroup = category.startsWith('Group');
            
            // Filtre par phase principale
            if (mainFilter === 'group' && !isGroup) {
                return false;
            }
            if (mainFilter === 'knockout' && isGroup) {
                return false;
            }

            // Filtre par phase détaillée (si une sélection spécifique est faite)
            if (detailFilter !== 'all') {
                return category === detailFilter;
            }
            return true;
        });
    }

    const mx = d3.extent(mapped, d => d.x);
    const my = d3.extent(mapped, d => d.y);
    
    const maxGoals = d3.max(mapped, d => d.goals || 0) || 1;
    const rScale = d3.scaleSqrt().domain([0, maxGoals]).range([3, 20]);


    const px = d3.scaleLinear().domain(mx).range([60, width-60]);
    const py = d3.scaleLinear().domain(my).range([height-60, 40]);

    svg.html('');

    // --- Ajout des définitions de motifs (patterns) pour les drapeaux ---
    const defs = svg.append('defs');

    const allTeams = Array.from(new Set(items.map(d => d.team)));
    allTeams.forEach(teamName => {
      const flagFileName = teamName.replace(/\s/g, '_').toUpperCase() + '.png'; 
      const patternId = 'flag-' + teamName.replace(/\s/g, '_').toLowerCase(); 

      const pattern = defs.append('pattern')
        .attr('id', patternId)
        .attr('width', 1) 
        .attr('height', 1)
        .attr('patternContentUnits', 'objectBoundingBox'); 

      pattern.append('image')
        // Chemin corrigé pour l'architecture du projet (remonte deux niveaux)
        .attr('xlink:href', `../../assets/${flagFileName}`) 
        .attr('width', 1)
        .attr('height', 1)
        .attr('preserveAspectRatio', 'xMidYMid slice'); 
    });
    // --- Fin ajout des définitions de motifs ---

    const gx = svg.append('g').attr('transform', `translate(0,${height-60})`).call(d3.axisBottom(px));
    gx.selectAll('path, line').attr('stroke', goldColor);
    gx.selectAll('text').attr('fill', goldColor);

    const gy = svg.append('g').attr('transform', `translate(60,0)`).call(d3.axisLeft(py));
    gy.selectAll('path, line').attr('stroke', goldColor);
    gy.selectAll('text').attr('fill', goldColor);

    svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mouseover", () => {
        coordsTooltip.style("opacity", 1);
    })
    .on("mouseout", () => {
        coordsTooltip.style("opacity", 0);
    })
    .on("mousemove", (event) => {
        // 1. Obtenir la position de la souris relative au SVG
        const [mouseX, mouseY] = d3.pointer(event);

        // 2. S'assurer que la souris est dans la zone des axes
        if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {

            // 3. Convertir la position en valeur de données
            const xValue = px.invert(mouseX);
            const yValue = py.invert(mouseY);

            // 4. Mettre à jour le texte du tooltip (arrondi à l'unité)
            coordsTooltip.html(`
                ${xKey}: ${Math.round(xValue)}<br>
                ${yKey}: ${Math.round(yValue)}
            `);

            // 5. Positionner le tooltip
            // (event.pageX/Y) positionne par rapport à la page entière
            coordsTooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY + 15) + "px");

        } else {
            // Si la souris sort de la zone, cacher le tooltip
            coordsTooltip.style("opacity", 0);
        }
    });

    // --- Ajout des labels d'axes ---
    // Label de l'axe X
    svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 20) 
        .style('font-weight', 'bold')
        .style('fill', goldColor)
        .text(xKey);

    // Label de l'axe Y
    svg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("y", 15) 
        .attr("x", -height / 2) 
        .attr("transform", "rotate(-90)")
        .style('font-weight', 'bold')
        .style('fill', goldColor)
        .text(yKey);
    // --- Fin Ajout des labels d'axes ---


    const g = svg.append('g');
    const nodes = g.selectAll('circle').data(mapped, d => d.team + d.match);
    nodes.enter().append('circle')
      .attr('cx', d => px(d.x))
      .attr('cy', d => py(d.y))
      .attr('r', d => rScale(d.goals || 0))
      .attr('fill', d => `url(#flag-${d.team.replace(/\s/g, '_').toLowerCase()})`)
      .attr('stroke', goldColor) 
      .attr('stroke-width', 1.5)
      .on('mouseover', (event,d) => {
        // Le tooltip est toujours géré dynamiquement par JS
        const t = d3.select(container).selectAll('.bubble-tt').data([d]);
        t.enter().append('div').attr('class','bubble-tt')
          .merge(t)
          .style('position','absolute')
          .style('left',(event.pageX+8)+'px')
          .style('top',(event.pageY+8)+'px')
          .html(`<strong>${d.team}</strong><br/>Match: ${d.match}<br/>Goals: ${d.goals}`);
      })
      .on('mouseout', () => d3.select(container).selectAll('.bubble-tt').remove());
      
    // --- Légende pour la taille des bulles (Buts) ---
    const legendData = [maxGoals, Math.floor(maxGoals/2), 3]; 
    const uniqueLegendData = Array.from(new Set(legendData.filter(d => d > 0))).sort((a,b) => b - a);

    const legendX = width - 120;
    const legendY = 60;

    const legend = svg.append('g')
      .attr('class', 'bubble-legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);

    legend.append('text')
      .attr('x', -20)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', goldColor)
      .text('Goals');
      
    let currentY = 0;
    
    uniqueLegendData.forEach(goals => {
      const r = rScale(goals);
      currentY += r; 

      legend.append('circle')
        .attr('cx', 0)
        .attr('cy', currentY)
        .attr('r', r)
        .attr('fill', '#1f77b4') 
        .attr('fill-opacity', 0.7)
        .attr('stroke', goldColor);
        

      legend.append('text')
        .attr('x', r + 5) 
        .attr('y', currentY)
        .attr('dy', '0.35em') 
        .style('font-size', '10px')
        .style('fill', goldColor)
        .text(`${goals} goals`);
        
      currentY += r + 5; 
    });
    // --- Fin Légende ---
  }

  // Événements
  xSel.on('change', render);
  ySel.on('change', render);
  
  // GESTIONNAIRES D'ÉVÉNEMENTS POUR LES FILTRES DE PHASE
  mainPhaseSel.on('change', updateDetailSelect);
  detailPhaseSel.on('change', render);
  
  updateDetailSelect(); // Initialise le filtre de détail et lance le premier rendu
}