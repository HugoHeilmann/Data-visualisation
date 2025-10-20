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
  containerEl.html('');

  const controls = containerEl.append('div').attr('class','bubble-controls');
  controls.append('label').text('team 1: ');
  const xSel = controls.append('select').attr('id','bubble-x');
  controls.append('label').text(' team 2: ');
  const ySel = controls.append('select').attr('id','bubble-y');

  // Correction de la définition de xOptions et yOptions
  const xOptions = ['goals', 'possession team1', ...numericKeys1];
  const yOptions = ['goals', 'possession team2', ...numericKeys2];
  
  xOptions.forEach(opt => xSel.append('option').attr('value',opt).text(opt));
  yOptions.forEach(opt => ySel.append('option').attr('value',opt).text(opt));

  xSel.property('value','possession team1');
  ySel.property('value', 'possession team2');

  const svg = containerEl.append('svg').attr('width', width).attr('height', height);

  function render() {
    const xKey = xSel.node().value;
    const yKey = ySel.node().value;

    const mapped = items.map(it => {
      const get = (k) => {
        if (k === 'goals') return it.goals;
        return parseFloat((it.raw[k] || '').toString().replace('%','')) || null;
      };
      return { ...it, x: get(xKey), y: get(yKey) };
    }).filter(d => d.x != null && d.y != null);

    const mx = d3.extent(mapped, d => d.x);
    const my = d3.extent(mapped, d => d.y);
    
    const maxGoals = d3.max(mapped, d => d.goals || 0) || 1;
    const rScale = d3.scaleSqrt().domain([0, maxGoals]).range([3, 20]);


    const px = d3.scaleLinear().domain(mx).range([60, width-60]);
    const py = d3.scaleLinear().domain(my).range([height-60, 40]);

    svg.selectAll('*').remove();

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
        .attr('xlink:href', `assets/${flagFileName}`) 
        .attr('width', 1)
        .attr('height', 1)
        .attr('preserveAspectRatio', 'xMidYMid slice'); 
    });
    // --- Fin ajout des définitions de motifs ---


    const gx = svg.append('g').attr('transform', `translate(0,${height-60})`).call(d3.axisBottom(px));
    const gy = svg.append('g').attr('transform', `translate(60,0)`).call(d3.axisLeft(py));

    // --- Ajout des labels d'axes ---
    // Label de l'axe X
    svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 20) 
        .style('font-weight', 'bold')
        .text(xKey);

    // Label de l'axe Y
    svg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("y", 15) 
        .attr("x", -height / 2) 
        .attr("transform", "rotate(-90)")
        .style('font-weight', 'bold')
        .text(yKey);
    // --- Fin Ajout des labels d'axes ---


    const g = svg.append('g');
    const nodes = g.selectAll('circle').data(mapped, d => d.team + d.match);
    nodes.enter().append('circle')
      .attr('cx', d => px(d.x))
      .attr('cy', d => py(d.y))
      .attr('r', d => rScale(d.goals || 0))
      .attr('fill', d => `url(#flag-${d.team.replace(/\s/g, '_').toLowerCase()})`)
      .attr('stroke', '#333') 
      .attr('stroke-width', 1.5)
      .on('mouseover', (event,d) => {
        const t = d3.select(container).selectAll('.bubble-tt').data([d]);
        t.enter().append('div').attr('class','bubble-tt')
          .merge(t)
          .style('position','absolute')
          .style('left',(event.pageX+8)+'px')
          .style('top',(event.pageY+8)+'px')
          .style('background','rgba(0,0,0,0.7)').style('color','#fff').style('padding','6px').style('border-radius','4px')
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
        .attr('stroke', '#333');

      legend.append('text')
        .attr('x', r + 5) 
        .attr('y', currentY)
        .attr('dy', '0.35em') 
        .style('font-size', '10px')
        .text(`${goals} goals`);
        
      currentY += r + 5; 
    });
    // --- Fin Légende ---
  }

  xSel.on('change', render);
  ySel.on('change', render);
  render();
}