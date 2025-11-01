import { FilterMemory } from "../../data/FilterMemory.js";

export async function BubbleChart({ container, rows, width = 1200, height = 700 }) {

    const parseNum = (v) => {
    if (v === null || v === undefined) return 0;
    const n = parseFloat(String(v).replace('%','').trim());
    return isNaN(n) ? 0 : n;
};

const items = [];
rows.forEach(r => {
    const goals1 = parseNum(r['number of goals team1']);
    const goals2 = parseNum(r['number of goals team2']);
    items.push({
    team1: r.team1,
    team2: r.team2,
    goals1: goals1,
    goals2: goals2,
    totalGoals: (goals1 || 0) + (goals2 || 0),
    match: `${r.team1} vs ${r.team2}`,
    raw: r
    });
});

const numericKeys = [
    'total attempts team1','yellow cards team1', 'red cards team1', 'passes team1', 'defensive pressures applied team1', 'crosses team1', 'corners team1', 'receptions between midfield and defensive lines team1', 'right inside channel team1', 'left inside channel team1',
    'total attempts team2','yellow cards team2', 'red cards team2', 'passes team2', 'defensive pressures applied team2', 'crosses team2', 'corners team2', 'receptions between midfield and defensive lines team2', 'right inside channel team2', 'left inside channel team2'
];

const allNumericKeys = Array.from(new Set(numericKeys));
const options = ['totalGoals', 'possession team1', 'possession team2', ...allNumericKeys];
const containerEl = d3.select(container);
const xSel = containerEl.select('#bubble-x');
const ySel = containerEl.select('#bubble-y');
const mainPhaseSel = containerEl.select('#bubble-main-phase');
const detailPhaseSel = containerEl.select('#bubble-detail-phase');
const detailLabel = containerEl.select('#detail-label');

// Filters memory
const filterMemory = FilterMemory.getInstance();
await filterMemory.waitUntilReady();
const savedBubbleX = filterMemory.selectedBubbleXAxis ?? 'possession team1';
const savedBubbleY = filterMemory.selectedBubbleYAxis ?? 'possession team2';
const savedBubbleMainPhase = filterMemory.selectedBubbleMainPhase ?? 'all';
const savedBubbleDetailPhase = filterMemory.selectedBubbleDetailPhase ?? 'all';

const groupStages = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H'];
const knockoutStages = ['Round of 16', 'Quarter-final', 'Semi-final', 'Play-off for third place', 'Final'];
xSel.selectAll('option').data(options).enter().append('option').attr('value', d => d).text(d => d);
ySel.selectAll('option').data(options).enter().append('option').attr('value', d => d).text(d => d);
xSel.property('value', savedBubbleX);
ySel.property('value', savedBubbleY);
const mainPhaseOptions = [
    { value: 'all', text: 'Toutes les phases' },
    { value: 'group', text: 'Phase de Groupes' },
    { value: 'knockout', text: 'Phase Éliminatoire' }
];
mainPhaseSel.selectAll('option').data(mainPhaseOptions).enter().append('option').attr('value', d => d.value).text(d => d.text);
mainPhaseSel.property('value', savedBubbleMainPhase);
let svg = containerEl.select('svg');
if (svg.empty()) {
    svg = containerEl.append('svg').attr('width', width).attr('height', height);
}

function updateDetailSelect() {
    const selectedPhase = mainPhaseSel.node().value;
    let detailOptions = [];

    if (selectedPhase === 'group') {
        detailOptions = [
            { value: 'all', text: 'Tous les groupes' },
            ...groupStages.map(g => ({ value: g, text: g }))
        ];
        detailLabel.style('display', null);
        detailPhaseSel.style('display', null);
    } else if (selectedPhase === 'knockout') {
        detailOptions = [
            { value: 'all', text: 'Toutes les étapes' },
            ...knockoutStages.map(k => ({ value: k, text: k }))
        ];
        detailLabel.style('display', null);
        detailPhaseSel.style('display', null);
    } else {
        // Si "Toutes les phases"
        detailOptions = [];
        detailLabel.style('display', 'none');
        detailPhaseSel.style('display', 'none');
    }

    // 🧠 On vide et on recharge les options
    detailPhaseSel.html('');
    detailPhaseSel
        .selectAll('option')
        .data(detailOptions)
        .enter()
        .append('option')
        .attr('value', d => d.value)
        .text(d => d.text);

    // 🧠 On restaure la valeur sauvegardée (si valide)
    let savedValue = filterMemory.selectedBubbleDetailPhase;
    if (savedValue && /^[A-H]$/i.test(savedValue)) {
        // Exemple : "F" → "Group F"
        savedValue = `Group ${savedValue.toUpperCase()}`;
    } else if (savedValue === "ALL") {
        savedValue = "all";
    }
    const isValid = detailOptions.some(opt => opt.value === savedValue);
    if (isValid) {
        detailPhaseSel.property('value', savedValue);
    } else {
        // sinon on remet sur "all"
        detailPhaseSel.property('value', 'all');
        filterMemory.setBubbleDetailPhase('all');
    }

    render();
}

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

    let mapped = items.map(it => {
    const get = (k) => {
        if (k === 'totalGoals') return it.totalGoals;
        return parseNum(it.raw[k]) || null;
    };
    return { ...it, x: get(xKey), y: get(yKey) };
    }).filter(d => d.x != null && d.y != null);

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
    const maxGoals = d3.max(mapped, d => d.totalGoals || 0) || 1;
    const rScale = d3.scaleSqrt().domain([0, maxGoals]).range([8, 30]);
    const px = d3.scaleLinear().domain(mx).range([60, width-60]);
    const py = d3.scaleLinear().domain(my).range([height-60, 40]);
    const original_px = px.copy();
    const original_py = py.copy();

    function zoomed(event) {
        const { transform } = event;
        px.domain(transform.rescaleX(original_px).domain());
        py.domain(transform.rescaleY(original_py).domain());
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
    if (!teamName) return;
    const flagFileName = teamName.replace(/\s/g, '_').toUpperCase() + '.png';
    const patternId = 'flag-' + teamName.replace(/\s/g, '_').toLowerCase();
    const pattern = defs.append('pattern')
        .attr('id', patternId)
        .attr('width', 1).attr('height', 1)
        .attr('patternContentUnits', 'objectBoundingBox');
    pattern.append('image')
        .attr('xlink:href', `../../assets/${flagFileName}`)
        .attr('width', 1).attr('height', 1)
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

    const pie = d3.pie().value(() => 50).sort(null);
    const arc = d3.arc().innerRadius(0).outerRadius(d => rScale(d.data.totalGoals || 0));

    const nodes = g.selectAll('g.match-bubble')
    .data(mapped, d => d.match);

    const nodesEnter = nodes.enter().append('g')
        .attr('class', 'match-bubble')
        .attr('transform', d => `translate(${px(d.x)}, ${py(d.y)})`);

    nodesEnter.selectAll('path')
        .data(d => {
            const pieData = [
                { team: d.team1, totalGoals: d.totalGoals },
                { team: d.team2, totalGoals: d.totalGoals }
            ];
            return pie(pieData);
        })
        .enter().append('path')
        .attr('d', arc)
        .attr('fill', (d) => {
            const teamName = d.data.team;
            if (!teamName) return '#ccc';
            return `url(#flag-${teamName.replace(/\s/g, '_').toLowerCase()})`;
        })
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5);

    nodesEnter
    .on('mouseover', (event,d) => {
        isHoveringBubble = true;
        coordsTooltip.style("opacity", 0);
        d3.select(event.currentTarget).style('cursor', 'pointer');
    })
    .on('mouseout', () => {
        isHoveringBubble = false;
        d3.select(event.currentTarget).style('cursor', 'default');
    })
    .on('click', (event, d) => {
        event.stopPropagation();

        const ttId = "tt-match-" + d.team1.replace(/\s/g, '_') + "-" + d.team2.replace(/\s/g, '_');

        if (!d3.select(container).select("#" + ttId).empty()) {
            d3.select("#" + ttId).raise().style('z-index', 1002);
            return;
        }

        const p = (key) => parseNum(d.raw[key]);
        const perc = (val, max) => (val / (max || 1)) * 100;

        const poss1 = p('possession team1');
        const poss2 = p('possession team2');
        const possC = p('possession in contest');

        const l_cha1 = p('left channel team1');
        const li_cha1 = p('left inside channel team1');
        const l_cha2 = p('left channel team2');
        const li_cha2 = p('left inside channel team2');
        const maxLeft = Math.max(l_cha1 + li_cha1 + l_cha2 + li_cha2, 1);

        const c_cha1 = p('central channel team1');
        const c_cha2 = p('central channel team2');
        const maxMid = Math.max(c_cha1 + c_cha2, 1);

        const r_cha1 = p('right channel team1');
        const ri_cha1 = p('right inside channel team1');
        const r_cha2 = p('right channel team2');
        const ri_cha2 = p('right inside channel team2');
        const maxRight = Math.max(r_cha1 + ri_cha1 + r_cha2 + ri_cha2, 1);

        const inbehind1 = p('inbehind offers to receive team1');
        const inbehind2 = p('inbehind offers to receive team2');
        const maxBehind = Math.max(inbehind1 + inbehind2, 1);

        const inbetween1 = p('inbetween offers to receive team1');
        const inbetween2 = p('inbetween offers to receive team2');
        const maxBetween = Math.max(inbetween1 + inbetween2, 1);

        const infront1 = p('infront offers to receive team1');
        const infront2 = p('infront offers to receive team2');
        const maxFront = Math.max(infront1 + infront2, 1);

        const passes1 = p('passes completed team1');
        const passes2 = p('passes completed team2');
        const maxPasses = Math.max(passes1 + passes2, 1);

        const switch1 = p('switches of play completed team1');
        const switch2 = p('switches of play completed team2');
        const maxSwitch = Math.max(switch1 + switch2, 1);

        const press1 = p('defensive pressures applied team1');
        const press2 = p('defensive pressures applied team2');
        const maxPress = Math.max(press1 + press2, 1);

        const totalTir1 = p('total attempts team1');
        const inTir1 = p('attempts inside the penalty area team1');
        const outTir1 = p('attempts outside the penalty area  team1');
        const totalTir2 = p('total attempts team2');
        const inTir2 = p('attempts inside the penalty area  team2');
        const outTir2 = p('attempts outside the penalty area  team2');
        const maxTirAll = Math.max(inTir1 + outTir1 + inTir2 + outTir2, 1);

        const tooltipHTML = `
            <div class="tt-header">
                ${d.team1} vs ${d.team2}
                <button class="tt-close-btn" data-id="${ttId}">×</button>
            </div>

            <div class="tt-content">
                <div class="tt-section">
                    <div class="tt-title">Possession & Score</div>
                    <div class="tt-possession-container">
                        <div class="tt-score">${d.goals1} - ${d.goals2}</div>
                    </div>
                    <div class="tt-bar-chart">
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Possession</div>
                            <div class="tt-bar-container tt-single-bar">
                                <div class="tt-bar poss-t1" style="width: ${poss1}%;" title="${d.team1}: ${poss1}%">${poss1 > 10 ? poss1 + '%' : ''}</div>
                                <div class="tt-bar poss-c" style="width: ${possC}%;" title="Contesté: ${possC}%">${possC > 10 ? possC + '%' : ''}</div>
                                <div class="tt-bar poss-t2" style="width: ${poss2}%;" title="${d.team2}: ${poss2}%">${poss2 > 10 ? poss2 + '%' : ''}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tt-section">
                    <div class="tt-title">Analyse Spatiale</div>
                    <div class="tt-bar-chart">
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Nbre d'actions couloir gauche</div>
                            <div class="tt-bar-container">
                                <div class="tt-bar t1-light" style="width: ${perc(l_cha1, maxLeft)}%;" title="${d.team1} - Canal Gauche: ${l_cha1}">${perc(l_cha1, maxLeft) > 5 ? l_cha1 : ''}</div>
                                <div class="tt-bar t1-dark" style="width: ${perc(li_cha1, maxLeft)}%;" title="${d.team1} - Intérieur Gauche: ${li_cha1}">${perc(li_cha1, maxLeft) > 5 ? li_cha1 : ''}</div>
                                <div class="tt-bar t2-light" style="width: ${perc(l_cha2, maxLeft)}%;" title="${d.team2} - Canal Gauche: ${l_cha2}">${perc(l_cha2, maxLeft) > 5 ? l_cha2 : ''}</div>
                                <div class="tt-bar t2-dark" style="width: ${perc(li_cha2, maxLeft)}%;" title="${d.team2} - Intérieur Gauche: ${li_cha2}">${perc(li_cha2, maxLeft) > 5 ? li_cha2 : ''}</div>
                            </div>
                        </div>
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Nbre d'actions axe central</div>
                            <div class="tt-bar-container">
                                <div class="tt-bar t1" style="width: ${perc(c_cha1, maxMid)}%;" title="${d.team1} - Canal Central: ${c_cha1}">${perc(c_cha1, maxMid) > 5 ? c_cha1 : ''}</div>
                                <div class="tt-bar t2" style="width: ${perc(c_cha2, maxMid)}%;" title="${d.team2} - Canal Central: ${c_cha2}">${perc(c_cha2, maxMid) > 5 ? c_cha2 : ''}</div>
                            </div>
                        </div>
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Nbre d'actions couloir droit</div>
                            <div class="tt-bar-container">
                                <div class="tt-bar t1-light" style="width: ${perc(r_cha1, maxRight)}%;" title="${d.team1} - Canal Droit: ${r_cha1}">${perc(r_cha1, maxRight) > 5 ? r_cha1 : ''}</div>
                                <div class="tt-bar t1-dark" style="width: ${perc(ri_cha1, maxRight)}%;" title="${d.team1} - Intérieur Droit: ${ri_cha1}">${perc(ri_cha1, maxRight) > 5 ? ri_cha1 : ''}</div>
                                <div class="tt-bar t2-light" style="width: ${perc(r_cha2, maxRight)}%;" title="${d.team2} - Canal Droit: ${r_cha2}">${perc(r_cha2, maxRight) > 5 ? r_cha2 : ''}</div>
                                <div class="tt-bar t2-dark" style="width: ${perc(ri_cha2, maxRight)}%;" title="${d.team2} - Intérieur Droit: ${ri_cha2}">${perc(ri_cha2, maxRight) > 5 ? ri_cha2 : ''}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tt-section">
                    <div class="tt-title">Réception</div>
                    <div class="tt-bar-chart">
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Nbre d'appels derrière la défense</div>
                            <div class="tt-bar-container">
                                <div class="tt-bar t1-light" style="width: ${perc(inbehind1, maxBehind)}%;" title="${d.team1} - Réception Derrière: ${inbehind1}">${perc(inbehind1, maxBehind) > 5 ? inbehind1 : ''}</div>
                                <div class="tt-bar t2-light" style="width: ${perc(inbehind2, maxBehind)}%;" title="${d.team2} - Réception Derrière: ${inbehind2}">${perc(inbehind2, maxBehind) > 5 ? inbehind2 : ''}</div>
                            </div>
                        </div>
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Nbre d'appels entre les lignes</div>
                            <div class="tt-bar-container">
                                <div class="tt-bar t1" style="width: ${perc(inbetween1, maxBetween)}%;" title="${d.team1} - Réception Entre Lignes: ${inbetween1}">${perc(inbetween1, maxBetween) > 5 ? inbetween1 : ''}</div>
                                <div class="tt-bar t2" style="width: ${perc(inbetween2, maxBetween)}%;" title="${d.team2} - Réception Entre Lignes: ${inbetween2}">${perc(inbetween2, maxBetween) > 5 ? inbetween2 : ''}</div>
                            </div>
                        </div>
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Nbre d'appels devant la défense</div>
                            <div class="tt-bar-container">
                                <div class="tt-bar t1-dark" style="width: ${perc(infront1, maxFront)}%;" title="${d.team1} - Réception Devant: ${infront1}">${perc(infront1, maxFront) > 5 ? infront1 : ''}</div>
                                <div class="tt-bar t2-dark" style="width: ${perc(infront2, maxFront)}%;" title="${d.team2} - Réception Devant: ${infront2}">${perc(infront2, maxFront) > 5 ? infront2 : ''}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tt-section">
                    <div class="tt-title">Passes & Défense</div>
                    <div class="tt-bar-chart">
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Passes Complétées</div>
                            <div class="tt-bar-container">
                                <div class="tt-bar t1" style="width: ${perc(passes1, maxPasses)}%;" title="${d.team1} Passes: ${passes1}">${perc(passes1, maxPasses) > 10 ? passes1 : ''}</div>
                                <div class="tt-bar t2" style="width: ${perc(passes2, maxPasses)}%;" title="${d.team2} Passes: ${passes2}">${perc(passes2, maxPasses) > 10 ? passes2 : ''}</div>
                            </div>
                        </div>
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Renversements de Jeu</div>
                            <div class="tt-bar-container">
                                <div class="tt-bar t1-light" style="width: ${perc(switch1, maxSwitch)}%;" title="${d.team1} Renversements: ${switch1}">${perc(switch1, maxSwitch) > 10 ? switch1 : ''}</div>
                                <div class="tt-bar t2-light" style="width: ${perc(switch2, maxSwitch)}%;" title="${d.team2} Renversements: ${switch2}">${perc(switch2, maxSwitch) > 10 ? switch2 : ''}</div>
                            </div>
                        </div>
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Pressions Défensives</div>
                            <div class="tt-bar-container">
                                <div class="tt-bar t1-dark" style="width: ${perc(press1, maxPress)}%;" title="${d.team1} Pressions Défensives: ${press1}">${perc(press1, maxPress) > 10 ? press1 : ''}</div>
                                <div class="tt-bar t2-dark" style="width: ${perc(press2, maxPress)}%;" title="${d.team2} Pressions Défensives: ${press2}">${perc(press2, maxPress) > 10 ? press2 : ''}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tt-section">
                    <div class="tt-title">Tirs (${totalTir1} vs ${totalTir2})</div>
                    <div class="tt-bar-chart">
                        <div class="tt-bar-labeled-group">
                            <div class="tt-bar-label">Tirs (Intérieur / Extérieur)</div>
                            <div class="tt-bar-container tt-single-bar">
                                <div class="tt-bar t1-inside" style="width: ${perc(inTir1, maxTirAll)}%;" title="${d.team1} Tirs intérieur zone pénalty: ${inTir1}">${perc(inTir1, maxTirAll) > 5 ? inTir1 : ''}</div>
                                <div class="tt-bar t1-outside" style="width: ${perc(outTir1, maxTirAll)}%;" title="${d.team1} Tirs extérieur zone pénalty: ${outTir1}">${perc(outTir1, maxTirAll) > 5 ? outTir1 : ''}</div>
                                <div class="tt-bar t2-inside" style="width: ${perc(inTir2, maxTirAll)}%;" title="${d.team2} Tirs intérieur zone pénalty: ${inTir2}">${perc(inTir2, maxTirAll) > 5 ? inTir2 : ''}</div>
                                <div class="tt-bar t2-outside" style="width: ${perc(outTir2, maxTirAll)}%;" title="${d.team2} Tirs extérieur zone pénalty: ${outTir2}">${perc(outTir2, maxTirAll) > 5 ? outTir2 : ''}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const ttWidth = 420;
        const xOffset = Math.random() * 60 - 30;
        const yOffset = Math.random() * 60 - 30;
        const newLeft = (window.innerWidth / 2) - (ttWidth / 2) + xOffset;
        const newTop = window.scrollY + 100 + yOffset;

        const t = d3.select(container).append('div')
            .attr('class', 'bubble-tt')
            .attr('id', ttId)
            .style('position', 'absolute')
            .style('left', newLeft + 'px')
            .style('top', newTop + 'px')
            .style('z-index', 1001)
            .html(tooltipHTML)
            .on('mouseover', () => { isHoveringBubble = true; })
            .on('mouseout', () => { isHoveringBubble = false; });

        t.select('.tt-close-btn').on('click', function(event) {
            event.stopPropagation();
            t.remove();
        });

        function dragstarted(event) {
            d3.select(this.parentNode).raise().style('z-index', 1002);
        }
        function dragged(event) {
            const ttNode = d3.select(this.parentNode);
            const currentLeft = parseFloat(ttNode.style('left'));
            const currentTop = parseFloat(ttNode.style('top'));
            ttNode.style('left', (currentLeft + event.dx) + 'px');
            ttNode.style('top', (currentTop + event.dy) + 'px');
        }
        function dragended(event) {
            d3.select(this.parentNode).style('z-index', 1001);
        }
        t.select('.tt-header').call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );
    });

    nodes.exit().remove();

    const legendData = [maxGoals, Math.floor(maxGoals/2), 0];
    const uniqueLegendData = Array.from(new Set(legendData.filter(d => d >= 0))).sort((a,b) => b - a);
    const legendX = width - 120;
    const legendY = 60;
    const legend = svg.append('g').attr('class', 'bubble-legend').attr('transform', `translate(${legendX}, ${legendY})`);
    legend.append('text')
    .attr('x', -20).attr('y', -10).attr('text-anchor', 'middle')
    .style('font-size', '12px').style('font-weight', 'bold')
    .style('fill', goldColor)
    .text('Total Buts');
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
        .text(`${goals} total`);
    currentY += r + 5;
    });

    const zoom = d3.zoom()
        .scaleExtent([1, 20])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    svg.call(zoom)
        .on("mouseover", () => {
            if (!isHoveringBubble) coordsTooltip.style("opacity", 1);
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
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY + 15) + 'px');
                } else {
                    coordsTooltip.style("opacity", 0);
                }
            } else if (isHoveringBubble) {
                coordsTooltip.style("opacity", 0);
            }
        });
}

xSel.on('change', function () {
    const newVal = this.value;
    filterMemory.setBubbleXAxis(newVal);
    render();
});
ySel.on('change', function () {
    const newVal = this.value;
    filterMemory.setBubbleYAxis(newVal);
    render();
});
mainPhaseSel.on('change', function () {
    const newVal = this.value;
    filterMemory.setBubbleMainPhase(newVal);
    updateDetailSelect();
});
detailPhaseSel.on('change', function () {
    const newVal = this.value;
    filterMemory.setBubbleDetailPhase(newVal);
    render();
});

updateDetailSelect();
}
