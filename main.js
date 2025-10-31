class TacticalScatterPlot {
    constructor() {
        this.data = null;
        this.teamStats = new Map();
        this.width = 1200;
        this.height = 420;
        this.margin = { top: 35, right: 60, bottom: 50, left: 60 };
        this.selectedTeam = null;
        
        console.log('Initializing Tactical Parallel Coordinates...');
        this.init();
    }
    
    async init() {
        try {
            await this.loadData();
            this.processTeamStats();
            this.calculateTournamentAverages();
            this.setupFilters();
            this.createParallelCoordinates();
            console.log('Parallel coordinates with filters created successfully!');
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    async loadData() {
        console.log('Loading World Cup data...');
        
        this.data = await d3.csv('data/worldcup_dataset.csv', d => {
            return {
                team1: d.team1,
                team2: d.team2,
                possession1: parseFloat(d['possession team1'].replace('%', '')),
                possession2: parseFloat(d['possession team2'].replace('%', '')),
                goals1: +d['number of goals team1'],
                goals2: +d['number of goals team2'],
                attempts1: +d['total attempts team1'],
                attempts2: +d['total attempts team2'],
                onTarget1: +d['on target attempts team1'],
                onTarget2: +d['on target attempts team2'],
                passes1: +d['passes team1'],
                passes2: +d['passes team2'],
                passesCompleted1: +d['passes completed team1'],
                passesCompleted2: +d['passes completed team2'],
                conceded1: +d['conceded team1'],
                conceded2: +d['conceded team2'],
                goalPreventions1: +d['goal preventions team1'],
                goalPreventions2: +d['goal preventions team2'],
                fouls1: +d['fouls against team1'],
                fouls2: +d['fouls against team2'],
                defensivePressures1: +d['defensive pressures applied team1'],
                defensivePressures2: +d['defensive pressures applied team2'],
                lineBreaks1: +d['attempted line breaks team1'],
                lineBreaks2: +d['attempted line breaks team2'],
                lineBreaksCompleted1: +d['completed line breaksteam1'],
                lineBreaksCompleted2: +d['completed line breaks team2'],
                centralChannel1: +d['central channel team1'],
                centralChannel2: +d['central channel team2'],
                leftChannel1: +d['left channel team1'],
                leftChannel2: +d['left channel team2'],
                rightChannel1: +d['right channel team1'],
                rightChannel2: +d['right channel team2'],
                category: d.category,
                date: d.date
            };
        });
        
        console.log(`Loaded ${this.data.length} matches`);
    }
    
    processTeamStats() {
        console.log('Processing team statistics...');

        this.teamStats.clear();
        
        this.data.forEach(match => {
            [1, 2].forEach(teamNum => {
                const teamName = match[`team${teamNum}`];
                
                if (!this.teamStats.has(teamName)) {
                    this.teamStats.set(teamName, {
                        name: teamName,
                        totalPossession: 0,
                        totalGoals: 0,
                        totalAttempts: 0,
                        totalOnTarget: 0,
                        totalPasses: 0,
                        totalPassesCompleted: 0,
                        totalDefensivePressures: 0,
                        totalLineBreaks: 0,
                        totalLineBreaksCompleted: 0,
                        totalCentralChannel: 0,
                        totalWingPlay: 0,
                        totalConceded: 0,
                        totalOnTargetConceded: 0,
                        totalGoalPreventions: 0,
                        totalFouls: 0,
                        matchCount: 0,
                        phases: new Set(),
                        group: null,
                        finalPhase: null
                    });
                }
                
                const team = this.teamStats.get(teamName);
                
                team.totalPossession += match[`possession${teamNum}`];
                team.totalGoals += match[`goals${teamNum}`];
                team.totalAttempts += match[`attempts${teamNum}`];
                team.totalOnTarget += match[`onTarget${teamNum}`];
                team.totalPasses += match[`passes${teamNum}`];
                team.totalPassesCompleted += match[`passesCompleted${teamNum}`];
                team.totalDefensivePressures += match[`defensivePressures${teamNum}`];
                team.totalLineBreaks += match[`lineBreaks${teamNum}`];
                team.totalLineBreaksCompleted += match[`lineBreaksCompleted${teamNum}`] || 0;
                team.totalCentralChannel += match[`centralChannel${teamNum}`];
                team.totalWingPlay += match[`leftChannel${teamNum}`] + match[`rightChannel${teamNum}`];
                team.totalConceded += match[`conceded${teamNum}`];
                const opponentNum = teamNum === 1 ? 2 : 1;
                team.totalOnTargetConceded += match[`onTarget${opponentNum}`];
                team.totalGoalPreventions += match[`goalPreventions${teamNum}`];
                team.totalFouls += match[`fouls${teamNum}`];
                team.matchCount++;
                team.phases.add(match.category);
            });
        });
        
        this.teamStats.forEach(team => {
            team.avgPossession = team.totalPossession / team.matchCount;
            team.efficiency = team.totalAttempts > 0 ? (team.totalGoals / team.totalAttempts) * 100 : 0;
            team.goalsPerMatch = team.totalGoals / team.matchCount;
            team.avgOnTarget = team.totalOnTarget / team.matchCount;
            team.passAccuracy = team.totalPasses > 0 ? (team.totalPassesCompleted / team.totalPasses) * 100 : 0;
            team.avgDefensivePressures = team.totalDefensivePressures / team.matchCount;
            team.avgLineBreaks = team.totalLineBreaks / team.matchCount;
            team.avgPasses = team.totalPasses / team.matchCount;
            team.avgAttempts = team.totalAttempts / team.matchCount;
            team.avgCentralPlay = team.totalCentralChannel / team.matchCount;
            team.avgWingPlay = team.totalWingPlay / team.matchCount;
            team.avgConceded = team.totalConceded / team.matchCount;
            team.avgOnTargetConceded = team.totalOnTargetConceded / team.matchCount;
            team.avgGoalPreventions = team.totalGoalPreventions / team.matchCount;
            team.avgFouls = team.totalFouls / team.matchCount;
            team.shotAccuracy = team.totalAttempts > 0 ? (team.totalOnTarget / team.totalAttempts) * 100 : 0;
            team.lineBreakAccuracy = team.totalLineBreaks > 0 ? (team.totalLineBreaksCompleted / team.totalLineBreaks) * 100 : 0;
            
            const phasesArray = Array.from(team.phases);
            
            const groupPhase = phasesArray.find(phase => phase.startsWith('Group'));
            team.group = groupPhase || 'Unknown';
            
            const phaseOrder = ['Group stage', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
            let finalPhase = 'Group stage';
            
            phasesArray.forEach(phase => {
                if (phase.includes('Round of 16')) finalPhase = 'Round of 16';
                else if (phase.includes('Quarter-final')) finalPhase = 'Quarter-final';
                else if (phase.includes('Semi-final')) finalPhase = 'Semi-final';
                else if (phase.includes('Final') && !phase.includes('Semi')) finalPhase = 'Final';
            });
            
            team.finalPhase = finalPhase;
        });
        
        this.calculateTournamentAverages();
        
        console.log(`Processed ${this.teamStats.size} teams`);
        
        const examples = Array.from(this.teamStats.values()).slice(0, 3);
        examples.forEach(team => {
            console.log(`${team.name}: Possession=${team.avgPossession.toFixed(1)}%, Efficiency=${team.efficiency.toFixed(1)}%`);
        });
    }
    
    createScatterPlot() {
        console.log('createScatterPlot() called but scatter plot has been replaced with parallel coordinates.');
    }

    createParallelCoordinates() {
        console.log('Creating parallel coordinates visualization...');

        d3.select('#chart').selectAll('*').remove();
        
        const teams = Array.from(this.teamStats.values());
        this.renderParallelCoordinates(teams);
        
        console.log('Parallel coordinates complete!');
    }
    
    updateParallelCoordinates(filteredTeams) {
        if (this.selectedTeam) {
            console.log('Équipe sélectionnée, filtres ignorés');
            return;
        }
        
        const foreground = d3.select('.foreground');
        const background = d3.select('.background');
        
        foreground.selectAll('path').style('opacity', 0.1);
        background.selectAll('path').style('opacity', 0.1);
        
        const allTeams = Array.from(this.teamStats.values());
        filteredTeams.forEach(team => {
            const index = allTeams.indexOf(team);
            foreground.select(`path:nth-child(${index + 1})`).style('opacity', 0.9);
            background.select(`path:nth-child(${index + 1})`).style('opacity', 0.8);
        });
    }
    
    renderParallelCoordinates(teams) {
        console.log('Rendering parallel coordinates visualization...');

        const margin = this.margin;
        const width = 1200;
        const height = 500;

        const svg = d3.select('#chart')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('max-width', '100%')
            .style('max-height', '100%');

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const metrics = [
            { key: 'avgPossession', label: 'Possession %' },
            { key: 'efficiency', label: 'Efficacité %' },
            { key: 'passAccuracy', label: 'Précision Passes %' },
            { key: 'shotAccuracy', label: 'Précision Tirs %' },
            { key: 'lineBreakAccuracy', label: 'Taux Percées %' },
            { key: 'avgCentralPlay', label: 'Jeu Central p. M' },
            { key: 'avgWingPlay', label: 'Jeu Latéral p. M' },
            { key: 'avgFouls', label: 'Fautes p. M' }
        ];

        const allTeams = Array.from(this.teamStats.values());
        const y = {};
        metrics.forEach((m) => {
            const extent = d3.extent(allTeams, d => +d[m.key]);
            if (!isFinite(extent[0]) || !isFinite(extent[1])) {
                extent[0] = 0; extent[1] = 1;
            }
            y[m.key] = d3.scaleLinear()
                .domain([extent[0], extent[1]])
                .range([chartHeight, 0]);
        });

        const x = d3.scalePoint()
            .domain(metrics.map(m => m.key))
            .range([0, chartWidth])
            .padding(0.5);

        function path(d) {
            return d3.line()(metrics.map(m => [x(m.key), y[m.key](d[m.key]) ]));
        }

        const groupColors = d3.scaleOrdinal(d3.schemeCategory10);

        g.append('g')
            .attr('class', 'background')
            .selectAll('path')
            .data(teams)
            .enter().append('path')
            .attr('d', path)
            .attr('stroke', '#ddd')
            .attr('fill', 'none')
            .attr('opacity', 0.8);

        const foreground = g.append('g')
            .attr('class', 'foreground')
            .selectAll('path')
            .data(teams)
            .enter().append('path')
            .attr('d', path)
            .attr('stroke', d => groupColors(Array.from(d.phases)[0]))
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('opacity', 0.9)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.target).attr('stroke-width', 4).attr('opacity', 1);
            })
            .on('mouseout', (event, d) => {
                d3.select(event.target).attr('stroke-width', 2).attr('opacity', 0.9);
            })
            .on('click', (event, d) => {
                console.log(`Équipe sélectionnée: ${d.name}`);
                
                if (this.selectedTeam === d.name) {
                    this.selectedTeam = null;
                    this.showAllTeams();
                } else {
                    this.selectedTeam = d.name;
                    this.filterToTeam(d);
                }
            });

        const axis = d3.axisLeft();

        const axisGroup = g.selectAll('.axis')
            .data(metrics)
            .enter().append('g')
            .attr('class', 'axis')
            .attr('transform', d => `translate(${x(d.key)},0)`);

        axisGroup.each(function(d) {
            const key = d.key;
            d3.select(this).call(axis.scale(y[key]));
        });

        axisGroup.append('text')
            .attr('class', 'axis-label')
            .attr('y', -7)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .text(d => d.label);

        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', width / 2)
            .attr('y', 18)
            .style('text-anchor', 'middle')
            .style('font-size', '15px')
            .style('font-weight', 'bold');

        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip-radar')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background', 'rgba(255, 255, 255, 0.95)')
            .style('backdrop-filter', 'blur(10px)')
            .style('border', '2px solid #8A1538')
            .style('border-radius', '15px')
            .style('padding', '15px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('box-shadow', '0 8px 25px rgba(138, 21, 56, 0.3)')
            .style('z-index', '1000')
            .style('max-width', '520px');

        foreground.on('mouseover', (event, d) => {
            d3.select(event.target).attr('stroke-width', 4).attr('opacity', 1);
            
            this.showTooltipRadar(event, d, tooltip);
        }).on('mousemove', (event, d) => {
            this.positionTooltip(tooltip, event);
        }).on('mouseleave', (event, d) => {
            if (!this.selectedTeam || this.selectedTeam !== d.name) {
                d3.select(event.target).attr('stroke-width', 2).attr('opacity', 0.9);
            }
            
            tooltip.transition()
                .duration(200)
                .style('opacity', 0);
        });

        console.log('Parallel coordinates complete!');
    }
    
    calculateTournamentAverages() {
        const teams = Array.from(this.teamStats.values());
        
        this.tournamentAverages = {
            possession: d3.mean(teams, d => d.avgPossession),
            efficiency: d3.mean(teams, d => d.efficiency),
            goalsPerMatch: d3.mean(teams, d => d.goalsPerMatch),
            onTarget: d3.mean(teams, d => d.avgOnTarget),
            passAccuracy: d3.mean(teams, d => d.passAccuracy),
            defensivePressures: d3.mean(teams, d => d.avgDefensivePressures),
            lineBreaks: d3.mean(teams, d => d.avgLineBreaks),
            centralPlay: d3.mean(teams, d => d.avgCentralPlay),
            wingPlay: d3.mean(teams, d => d.avgWingPlay),
            conceded: d3.mean(teams, d => d.avgConceded),
            onTargetConceded: d3.mean(teams, d => d.avgOnTargetConceded),
            goalPreventions: d3.mean(teams, d => d.avgGoalPreventions),
            fouls: d3.mean(teams, d => d.avgFouls),
            attempts: d3.mean(teams, d => d.avgAttempts),
            passes: d3.mean(teams, d => d.avgPasses),
            shotAccuracy: d3.mean(teams, d => d.shotAccuracy),
            lineBreakAccuracy: d3.mean(teams, d => d.lineBreakAccuracy)
        };
        
        console.log('Tournament averages calculated');
    }
    
    setupFilters() {
        console.log('Setting up filters with country search...');
        
        this.setupLegendModal();
        
        const teams = Array.from(this.teamStats.values());
        
        const groups = [...new Set(teams.map(t => t.group))].sort();
        const groupFilter = d3.select('#group-filter');
        groupFilter.selectAll('option:not([value="all"])').remove();
        groups.forEach(group => {
            if (group && group !== 'Unknown') {
                groupFilter.append('option').attr('value', group).text(group);
            }
        });
        
        const countrySearch = d3.select('#country-search');
        const suggestionsList = d3.select('#country-suggestions');
        
        countrySearch.on('input', () => {
            const searchTerm = countrySearch.node().value.toLowerCase().trim();
            
            if (searchTerm.length === 0) {
                suggestionsList.classed('hidden', true);
                this.applyFilters();
                return;
            }
            
            const matches = teams.filter(t => 
                t.name.toLowerCase().includes(searchTerm)
            ).slice(0, 10);
            
            if (matches.length > 0) {
                suggestionsList.classed('hidden', false);
                suggestionsList.selectAll('*').remove();
                
                matches.forEach(team => {
                    suggestionsList.append('div')
                        .attr('class', 'suggestion-item')
                        .text(team.name)
                        .on('click', () => {
                            countrySearch.node().value = team.name;
                            suggestionsList.classed('hidden', true);
                            this.applyFilters();
                        });
                });
            } else {
                suggestionsList.classed('hidden', true);
            }
            
            this.applyFilters();
        });
        
        d3.select('body').on('click', (event) => {
            if (!event.target.closest('#country-search') && !event.target.closest('#country-suggestions')) {
                suggestionsList.classed('hidden', true);
            }
        });
        
        d3.select('#group-filter').on('change', () => this.applyFilters());
        d3.select('#phase-filter').on('change', () => this.applyFilters());
        d3.select('#reset-filters').on('click', () => this.resetFilters());
        
        console.log('Filters with country search setup complete');
    }
    
    applyFilters() {
        const selectedGroup = d3.select('#group-filter').node().value;
        const selectedPhase = d3.select('#phase-filter').node().value;
        const countrySearch = d3.select('#country-search').node().value.toLowerCase().trim();
        
        const teams = Array.from(this.teamStats.values());
        const filteredTeams = teams.filter(team => {
            const groupMatch = selectedGroup === 'all' || team.group === selectedGroup;
            const phaseMatch = selectedPhase === 'all' || team.finalPhase === selectedPhase;
            const countryMatch = countrySearch === '' || team.name.toLowerCase().includes(countrySearch);
            
            return groupMatch && phaseMatch && countryMatch;
        });
        
        this.updateParallelCoordinates(filteredTeams);
        
        console.log(`Filtered to ${filteredTeams.length}/${teams.length} teams (Group: ${selectedGroup}, Phase: ${selectedPhase}, Search: "${countrySearch}")`);
    }
    
    resetFilters() {
        d3.select('#country-search').property('value', '');
        d3.select('#group-filter').property('value', 'all');
        d3.select('#phase-filter').property('value', 'all');
        d3.select('#country-suggestions').classed('hidden', true);
        
        this.selectedTeam = null;
        this.applyFilters();
        console.log('Filters reset');
    }
    
    setupLegendModal() {
        const legendBtn = d3.select('#legend-btn');
        const legendModal = d3.select('#legend-modal');
        const closeBtn = d3.select('#close-legend');
        
        legendBtn.on('click', () => {
            legendModal.classed('hidden', false);
            console.log('📖 Légende ouverte');
        });
        
        closeBtn.on('click', () => {
            legendModal.classed('hidden', true);
            console.log('📖 Légende fermée');
        });
        
        legendModal.on('click', (event) => {
            if (event.target.id === 'legend-modal') {
                legendModal.classed('hidden', true);
                console.log('📖 Légende fermée (clic extérieur)');
            }
        });
        
        d3.select('body').on('keydown', (event) => {
            if (event.key === 'Escape' && !legendModal.classed('hidden')) {
                legendModal.classed('hidden', true);
                console.log('📖 Légende fermée (Echap)');
            }
        });
        
        console.log('Legend modal setup complete');
    }
    
    filterToTeam(selectedTeam) {
        this.updateFiltersForTeam(selectedTeam);
        
        const foreground = d3.select('.foreground');
        const background = d3.select('.background');
        
        foreground.selectAll('path').style('opacity', 0.1);
        background.selectAll('path').style('opacity', 0.1);
        
        const allTeams = Array.from(this.teamStats.values());
        const teamIndex = allTeams.findIndex(t => t.name === selectedTeam.name);
        
        if (teamIndex !== -1) {
            foreground.select(`path:nth-child(${teamIndex + 1})`)
                .style('opacity', 1)
                .attr('stroke-width', 4);
            background.select(`path:nth-child(${teamIndex + 1})`)
                .style('opacity', 0.8);
        }
        
        d3.select('#selection-indicator').classed('hidden', false);
        d3.select('#selected-team-indicator').text(selectedTeam.name);
        
        d3.select('#clear-selection').on('click', () => {
            this.selectedTeam = null;
            this.showAllTeams();
            this.resetFilters();
        });
        
        console.log(`Filtré sur: ${selectedTeam.name}`);
    }
    
    updateFiltersForTeam(team) {
        d3.select('#country-search').property('value', team.name);
        
        d3.select('#group-filter').property('value', team.group);
        
        d3.select('#phase-filter').property('value', team.finalPhase);
        
        d3.select('#country-suggestions').classed('hidden', true);
        
        console.log(`Filtres mis à jour: ${team.name}, ${team.group}, ${team.finalPhase}`);
    }
    
    showAllTeams() {
        const foreground = d3.select('.foreground');
        const background = d3.select('.background');
        
        foreground.selectAll('path')
            .style('opacity', 0.9)
            .attr('stroke-width', 2);
        background.selectAll('path')
            .style('opacity', 0.8);
        
        d3.select('#selection-indicator').classed('hidden', true);
        
        console.log('Toutes les équipes affichées');
    }
    
    positionTooltip(tooltip, event) {
        const tooltipNode = tooltip.node();
        const tooltipWidth = tooltipNode.offsetWidth;
        const tooltipHeight = tooltipNode.offsetHeight;
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = event.pageX + 20;
        let top = event.pageY - 10;
        
        if (left + tooltipWidth > viewportWidth - 20) {
            left = event.pageX - tooltipWidth - 20;
        }
        
        if (top + tooltipHeight > viewportHeight - 20) {
            top = viewportHeight - tooltipHeight - 20;
        }
        
        if (top < 20) {
            top = 20;
        }
        
        if (left < 20) {
            left = 20;
        }
        
        tooltip
            .style('left', left + 'px')
            .style('top', top + 'px');
    }
    
    showTooltipRadar(event, selectedTeam, tooltip) {
        tooltip.selectAll('*').remove();
        
        tooltip.transition()
            .duration(200)
            .style('opacity', 1);
        
        this.positionTooltip(tooltip, event);
        
        tooltip.append('div')
            .style('text-align', 'center')
            .style('font-weight', 'bold')
            .style('font-size', '14px')
            .style('color', '#333')
            .style('margin-bottom', '10px')
            .text(selectedTeam.name);
        
        tooltip.append('div')
            .style('font-size', '11px')
            .style('color', '#666')
            .style('margin-bottom', '10px')
            .style('text-align', 'center')
            .html(`
                Groupe: ${selectedTeam.group} | 
                Phase: ${selectedTeam.finalPhase}
            `);
        
    const radarSize = 280;
    const radarRadius = 100;
        
        const radarSvg = tooltip.append('svg')
            .attr('width', radarSize)
            .attr('height', radarSize)
            .style('display', 'block')
            .style('margin', '0 auto');
        
        const radarG = radarSvg.append('g')
            .attr('transform', `translate(${radarSize/2}, ${radarSize/2})`);
        
        const allTeams = Array.from(this.teamStats.values());
        
        const radarMetrics = [
            { 
                key: 'goalsPerMatch', 
                label: 'Buts', 
                teamValue: selectedTeam.goalsPerMatch, 
                avgValue: this.tournamentAverages.goalsPerMatch,
                min: d3.min(allTeams, d => d.goalsPerMatch),
                max: d3.max(allTeams, d => d.goalsPerMatch)
            },
            { 
                key: 'avgConceded', 
                label: 'Buts concédés', 
                teamValue: selectedTeam.avgConceded, 
                avgValue: this.tournamentAverages.conceded,
                min: d3.min(allTeams, d => d.avgConceded),
                max: d3.max(allTeams, d => d.avgConceded),
                inverted: true
            },
            { 
                key: 'avgAttempts', 
                label: 'Tirs', 
                teamValue: selectedTeam.avgAttempts, 
                avgValue: this.tournamentAverages.attempts,
                min: d3.min(allTeams, d => d.avgAttempts),
                max: d3.max(allTeams, d => d.avgAttempts)
            },
            { 
                key: 'avgOnTargetConceded', 
                label: 'Tirs cadrés subis', 
                teamValue: selectedTeam.avgOnTargetConceded, 
                avgValue: this.tournamentAverages.onTargetConceded,
                min: d3.min(allTeams, d => d.avgOnTargetConceded),
                max: d3.max(allTeams, d => d.avgOnTargetConceded),
                inverted: true
            },
            { 
                key: 'avgPasses', 
                label: 'Passes', 
                teamValue: selectedTeam.avgPasses, 
                avgValue: this.tournamentAverages.passes,
                min: d3.min(allTeams, d => d.avgPasses),
                max: d3.max(allTeams, d => d.avgPasses)
            },
            { 
                key: 'avgDefensivePressures', 
                label: 'Pressions', 
                teamValue: selectedTeam.avgDefensivePressures, 
                avgValue: this.tournamentAverages.defensivePressures,
                min: d3.min(allTeams, d => d.avgDefensivePressures),
                max: d3.max(allTeams, d => d.avgDefensivePressures)
            }
        ];
        
        const scales = radarMetrics.map(metric => {
            const min = metric.min || 0;
            const max = metric.max > min ? metric.max : min + 1;
            
            const scale = d3.scaleLinear()
                .domain([min, max])
                .range([0, radarRadius])
                .clamp(true);
            
            if (metric.inverted) {
                return (value) => {
                    const normalizedValue = (value - min) / (max - min);
                    return (1 - normalizedValue) * radarRadius;
                };
            }
            return scale;
        });
        
        const angleScale = d3.scaleLinear()
            .domain([0, radarMetrics.length])
            .range([0, 2 * Math.PI]);
        
        for (let i = 1; i <= 3; i++) {
            radarG.append('circle')
                .attr('r', (radarRadius / 3) * i)
                .style('fill', 'none')
                .style('stroke', '#ddd')
                .style('stroke-width', 1);
        }
        
        radarMetrics.forEach((metric, i) => {
            const angle = angleScale(i) - Math.PI / 2;
            const x = Math.cos(angle) * radarRadius;
            const y = Math.sin(angle) * radarRadius;
            
            radarG.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', x)
                .attr('y2', y)
                .style('stroke', '#ccc')
                .style('stroke-width', 1);
            
            const labelDistance = radarRadius + 28;
            const labelX = Math.cos(angle) * labelDistance;
            const labelY = Math.sin(angle) * labelDistance;
            
            radarG.append('text')
                .attr('x', labelX)
                .attr('y', labelY)
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('font-size', '9px')
                .style('font-weight', 'bold')
                .style('fill', '#333')
                .text(metric.label);
        });
        
        const radarLine = d3.lineRadial()
            .angle((d, i) => angleScale(i))
            .radius((d, i) => scales[i](d))
            .curve(d3.curveLinearClosed);
        
        const avgValues = radarMetrics.map(d => d.avgValue);
        radarG.append('path')
            .datum(avgValues)
            .attr('d', radarLine)
            .style('fill', '#B4975A')
            .style('fill-opacity', 0.2)
            .style('stroke', '#B4975A')
            .style('stroke-width', 1.5);
        
        const teamValues = radarMetrics.map(d => d.teamValue);
        radarG.append('path')
            .datum(teamValues)
            .attr('d', radarLine)
            .style('fill', '#8A1538')
            .style('fill-opacity', 0.3)
            .style('stroke', '#8A1538')
            .style('stroke-width', 2);
        
        radarMetrics.forEach((metric, i) => {
            const angle = angleScale(i) - Math.PI / 2;
            const r = scales[i](metric.teamValue);
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            
            radarG.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 2.5)
                .style('fill', 'white')
                .style('stroke', '#8A1538')
                .style('stroke-width', 2);
            
            const offset = 12;
            const lx = Math.cos(angle) * (r + offset);
            const ly = Math.sin(angle) * (r + offset);
            
            const formatValue = (key, value) => {
                const f0 = d3.format('.0f');
                const f1 = d3.format('.1f');
                const f2 = d3.format('.2f');
                switch (key) {
                    case 'goalsPerMatch':
                    case 'avgConceded':
                        return f2(value);
                    case 'avgAttempts':
                    case 'avgOnTargetConceded':
                        return f1(value);
                    case 'avgPasses':
                    case 'avgDefensivePressures':
                        return f0(value);
                    default:
                        return f1(value);
                }
            };
            
            radarG.append('text')
                .attr('x', lx)
                .attr('y', ly)
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('font-size', '10px')
                .style('font-weight', '600')
                .style('fill', '#333')
                .text(formatValue(metric.key, metric.teamValue));
        });
        
        tooltip.append('div')
            .style('font-size', '10px')
            .style('text-align', 'center')
            .style('margin-top', '5px')
            .style('color', '#666')
            .html(`
                <span style="color: #8A1538">● ${selectedTeam.name}</span> | 
                <span style="color: #B4975A">● Moyenne tournoi</span>
            `);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting FIFA World Cup 2022 Tactical Analysis...');
    new TacticalScatterPlot();
});