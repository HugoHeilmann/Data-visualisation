// === main.js ===
// D3 v7 — FIFA World Cup 2022 Network Visualization (dark mode + labels)

const margin = { top: 20, right: 20, bottom: 20, left: 20 };
const PANEL_W = 340;
let { W, H } = calcSize();

const svg = d3.select("#chart")
  .attr("width", W)
  .attr("height", H)
  .style("max-width", "100%");

const rootG = svg.append("g");

// L'ordre des calques compte : d'abord liens, puis cercles/images, puis labels
const linkG   = rootG.append("g").attr("class", "links");
const circleG = rootG.append("g").attr("class", "fallback-nodes");
const nodeG   = rootG.append("g").attr("class", "nodes");
const labelG  = rootG.append("g").attr("class", "labels")
  .attr("pointer-events", "none"); // éviter que les labels bloquent les clics

const zoom = d3.zoom().scaleExtent([0.3, 4]).on("zoom", e => rootG.attr("transform", e.transform));
svg.call(zoom);

const groupFilter = d3.select("#groupFilter");
const koOnly = d3.select("#koOnly");
const details = d3.select("#details");

const ICON_PATH = "flags/";
const ICON_SIZE = 30, ICON_R = ICON_SIZE / 2;
const ICON_STATUS = new Map();

const parseDate = d3.timeParse("%d %b %Y");
const fmtDateShort = d3.timeFormat("%d %b");
const groupLetters = ["A","B","C","D","E","F","G","H"];
const groupColorScale = d3.scaleOrdinal().domain(groupLetters).range(d3.schemeTableau10.slice(0,8));
const KO_COLOR = "#ef4444";
const linkWidth = d3.scaleLinear().domain([0,8]).range([1,6]);

const tooltip = d3.select("#tooltip");

let sim = d3.forceSimulation()
  .force("link", d3.forceLink().id(d=>d.id).distance(120).strength(0.7))
  .force("charge", d3.forceManyBody().strength(-220))
  .force("center", d3.forceCenter(W/2, H/2))
  .alphaDecay(0.06);

let RAW_ROWS=[], ALL_NODES=[], ALL_LINKS=[];
let TEAM_GROUP=new Map(), TEAM_KO=new Map();
let currentFocusTeam=null;

init();

function calcSize(){
  const W = Math.max(720, Math.min(window.innerWidth - PANEL_W, 1400));
  const H = Math.max(520, Math.min(window.innerHeight - 40, 900));
  return { W, H };
}

function computeCenters(){ return {
  A:[W*0.2,H*0.24], B:[W*0.4,H*0.24], C:[W*0.6,H*0.24], D:[W*0.8,H*0.24],
  E:[W*0.2,H*0.62], F:[W*0.4,H*0.62], G:[W*0.6,H*0.62], H:[W*0.8,H*0.62]
};}

function init(){
  d3.csv("data/worldcup_dataset.csv").then(raw => boot(raw));
  groupFilter.on("change", refresh);
  koOnly.on("change", refresh);

  groupFilter.selectAll("option").data(
    [{label:"ALL groups",value:"ALL"}].concat(groupLetters.map(g=>({label:`Group ${g}`,value:g})))
  ).join("option").attr("value",d=>d.value).text(d=>d.label);
}

function boot(raw){
  RAW_ROWS = raw.map(d=>({
    team1:d.team1, team2:d.team2,
    g1:+d["number of goals team1"], g2:+d["number of goals team2"],
    date: parseDate(String(d.date).trim()),
    category: String(d.category||"").trim()
  })).filter(d=>d.team1 && d.team2 && Number.isFinite(d.g1) && Number.isFinite(d.g2) && d.date);

  const normGroup = cat => { const m=/group\s*([a-h])/i.exec(cat||""); return m?m[1].toUpperCase():null; };

  TEAM_GROUP.clear(); TEAM_KO.clear();
  const teamsSet=new Set();
  RAW_ROWS.forEach(r=>{
    teamsSet.add(r.team1); teamsSet.add(r.team2);
    const gl=normGroup(r.category);
    if(gl){
      if(!TEAM_GROUP.has(r.team1)) TEAM_GROUP.set(r.team1,gl);
      if(!TEAM_GROUP.has(r.team2)) TEAM_GROUP.set(r.team2,gl);
    } else {
      TEAM_KO.set(r.team1,true); TEAM_KO.set(r.team2,true);
    }
  });

  ALL_NODES = Array.from(teamsSet).sort().map(t=>({
    id:t, groupLetter: TEAM_GROUP.get(t)||null, qualifiedKO: !!TEAM_KO.get(t)
  }));

  ALL_LINKS = RAW_ROWS.map(m=>({
    source:m.team1, target:m.team2, g1:m.g1, g2:m.g2,
    total:m.g1+m.g2, date:m.date, category:m.category
  }));

  preloadIconStatus(ALL_NODES.map(d=>d.id)).then(()=>refresh());
}

async function preloadIconStatus(teams){
  await Promise.all(teams.map(team=>new Promise(res=>{
    if(ICON_STATUS.has(team)) return res();
    const href = ICON_PATH + nameToFile(team) + ".png";
    const img = new Image();
    img.onload = ()=>{ ICON_STATUS.set(team,true); res(); };
    img.onerror= ()=>{ ICON_STATUS.set(team,false); res(); };
    img.src = href;
  })));
}

function refresh(){
  if(!ALL_NODES.length || !ALL_LINKS.length) return;
  currentFocusTeam = null;

  const gflt   = groupFilter.node().value;
  const koMode = koOnly.node().checked;

  const isGroupCat = cat => /group\s*[a-h]/i.test(cat||"");
  const teamGroup  = t => TEAM_GROUP.get(t)||null;

  // === 1) Filtrer les liens ===
  let links = ALL_LINKS.filter(l=>{
    const inGroup = isGroupCat(l.category);
    const g1 = teamGroup(getId(l.source));
    const g2 = teamGroup(getId(l.target));

    if (koMode && inGroup) return false;
    if (gflt !== "ALL") {
      if (!inGroup) return false;
      if (g1 !== gflt || g2 !== gflt) return false;
    }
    return true;
  });

  const idsFromLinks = new Set(links.flatMap(l=>[getId(l.source), getId(l.target)]));
  let nodes = ALL_NODES.filter(n=>idsFromLinks.has(n.id));

  if(!nodes.length){
    linkG.selectAll("line").data([]).join(exit=>exit.remove());
    nodeG.selectAll("image").data([]).join(exit=>exit.remove());
    circleG.selectAll("circle").data([]).join(exit=>exit.remove());
    labelG.selectAll("text").data([]).join(exit=>exit.remove());
    details.text("Aucun élément pour ces filtres.");
    return;
  }

  // === 2) Liens ===
  const linkSel = linkG.selectAll("line").data(
    links, d => `${getId(d.source)}__${getId(d.target)}__${+d.date}`
  );
  linkSel.join(
    enter=>enter.append("line")
      .attr("stroke", d=>phaseColor(d.category))
      .attr("stroke-width", d=>linkWidth(d.total))
      .attr("stroke-opacity", .85),
    update=>update,
    exit=>exit.remove()
  );

  // === 3) Nœuds ===
  circleG.selectAll("circle").data(nodes, d=>d.id).join(
  enter => enter.append("circle")
    .attr("r", ICON_R - 1)
    .attr("fill", "#1e293b")
    // contour coloré selon le groupe, sinon gris bleuté
    .attr("stroke", d => groupColorScale(d.groupLetter) || "#60a5fa")
    .attr("stroke-width", 2)
    .attr("opacity", d => ICON_STATUS.get(d.id) ? 0 : 1)
    .style("transition", "stroke 0.2s ease, r 0.2s ease, opacity 0.2s ease")
    .on("mouseenter", function () {
      d3.select(this)
        .attr("stroke", "#38bdf8")
        .attr("stroke-width", 3);
    })
    .on("mouseleave", function (e, d) {
      d3.select(this)
        .attr("stroke", groupColorScale(d.groupLetter) || "#60a5fa")
        .attr("stroke-width", 2);
    }),
  update => update
    .attr("stroke", d => groupColorScale(d.groupLetter) || "#60a5fa")
    .attr("stroke-width", 2),
  exit => exit.remove()
);


  nodeG.selectAll("image").data(nodes, d=>d.id).join(
    enter=>enter.append("image")
      .attr("width",ICON_SIZE)
      .attr("height",ICON_SIZE)
      .attr("href", d=>ICON_PATH + nameToFile(d.id) + ".png"),
    update=>update,
    exit=>exit.remove()
  );

  nodeG.selectAll("image").attr("opacity", d=>ICON_STATUS.get(d.id)?1:0);
  circleG.selectAll("circle").attr("opacity", d=>ICON_STATUS.get(d.id)?0:1);

  // === 4) Labels sous chaque drapeau ===
  labelG.selectAll("text").data(nodes, d=>d.id).join(
    enter => enter.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ICON_R + 14)
      .attr("font-size", 10)
      .attr("fill", d => groupColorScale(d.groupLetter) || "#94a3b8")
      .style("paint-order", "stroke")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2)  
      .style("pointer-events", "none")
      .text(d => d.id),
    update => update.text(d => d.id),
    exit => exit.remove()
  );

  // === 5) Layout ===
  const centersNow = computeCenters();
  sim.nodes(nodes);
  sim.force("link").links(links);
  sim.force("x", d3.forceX(d=>{
    const base = centersNow[d.groupLetter] || [W/2,H/2];
    return d.qualifiedKO ? lerp(base[0], W/2, 0.4) : base[0];
  }).strength(0.16));
  sim.force("y", d3.forceY(d=>{
    const base = centersNow[d.groupLetter] || [W/2,H/2];
    return d.qualifiedKO ? lerp(base[1], H/2, 0.4) : base[1];
  }).strength(0.16));
  sim.force("collide", d3.forceCollide(ICON_R*0.95));
  sim.alpha(0.9).restart();

  sim.on("tick", ()=>{
    linkG.selectAll("line")
      .attr("x1", d=> d.source.x).attr("y1", d=> d.source.y)
      .attr("x2", d=> d.target.x).attr("y2", d=> d.target.y);
    nodeG.selectAll("image").attr("x", d=>d.x-ICON_R).attr("y", d=>d.y-ICON_R);
    circleG.selectAll("circle").attr("cx", d=>d.x).attr("cy", d=>d.y);
    labelG.selectAll("text").attr("x", d=>d.x).attr("y", d=>d.y);
  });
}

function phaseColor(category){
  const m=/group\s*([a-h])/i.exec(category||"");
  if(m) return groupColorScale(m[1].toUpperCase());
  return KO_COLOR;
}
function nameToFile(team){
  return team.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/&/g,"and").replace(/['’]/g,"").replace(/[^a-z0-9\s-]/g,"")
    .trim().replace(/\s+/g,"-");
}
function getId(x){ return typeof x==="object" ? x.id : x; }
function lerp(a,b,t){ return a+(b-a)*t; }
