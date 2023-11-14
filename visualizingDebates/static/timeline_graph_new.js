function determineEnd(graphNodes) {
    for (let i = 0; i < graphNodes.length; i++) {
        if (i < graphNodes.length - 1) {
            graphNodes[i].end = graphNodes[i + 1].start;
        } else {
            let date = new Date(graphNodes[i].start);
            date.setTime(date.getTime() + 15000); // 15 seconds in milliseconds
            graphNodes[i].end = date;
        }
    }
    return graphNodes;
}

function createTimeline(graphData) {
    let nodes = graphData.nodes;
    let links = graphData.links;
    determineEnd(nodes);

    let barHovered = false;
    let textHovered = false;
    let timeFormat = d3.timeFormat('%H:%M:%S');

    let margin = {top: 20, right: 20, bottom: 40, left: 60};
    let width = 1200 - margin.left - margin.right;
    let height = 600 - margin.top - margin.bottom;

    let svg = d3
        .select('#timeline')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    let timeParser = d3.utcParse('%Y-%m-%d %H:%M:%S');
    nodes.forEach(function (d) {
        d.start = timeParser(d.start);
        d.end = timeParser(d.end);
    });

    let speakers = Array.from(new Set(nodes.map(function (d) {
        return d.speaker;
    })));

    let yScale = d3.scaleBand()
        .domain(speakers)
        .range([height, 0])
        .padding(0.1);

    let xScale = d3.scaleTime()
        .domain([
            d3.min(nodes, function (d) {
                return d.start;
            }),
            d3.max(nodes, function (d) {
                return d.end || d.start;
            }),
        ])
        .range([0, width]);

    let xAxis = d3.axisBottom(xScale).tickFormat(timeFormat);
    svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    let yAxis = d3.axisLeft(yScale);
    svg.append('g')
        .call(yAxis);

    let colorScale = d3.scaleOrdinal()
        .domain(speakers)
        .range(d3.schemeCategory10);

    // Create a force simulation
    let simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(20))
        .force('charge', d3.forceManyBody().strength(-50))
        .force('center', d3.forceCenter(width / 2, height / 2));

    let curve = d3.line()
        .curve(d3.curveBasis);

    // Draw links with curved lines


    // Draw nodes (rectangles)
    let node = svg.selectAll('.node')
        .data(nodes)
        .enter().append('rect')
        .attr('class', 'node')
        .attr('x', d => xScale(d.start))
        .attr('y', d => yScale(d.speaker))
        .attr('width', d => xScale(d.end || d.start) - xScale(d.start))
        .attr('height', yScale.bandwidth())
        .style('fill', d => colorScale(d.speaker))


    let link = svg.selectAll('.link')
        .data(links)
        .enter().append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('marker-end', 'url(#arrowhead)')  // Set a default arrowhead
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('d', d => {
            // Calculate midpoints and control points
            let xMid = (xScale(d.source.start) + xScale(d.target.start)) / 2;
            let yMid1 = yScale(d.source.speaker) - yScale.bandwidth() / 2;
            let yMid2 = yScale(d.target.speaker) - yScale.bandwidth() / 3;

            let pathData = [
                [xScale(d.source.start) + (xScale(d.source.end || d.source.start) - xScale(d.source.start)) / 2, yScale(d.source.speaker)],
                [xMid, yMid1],
                [xMid, yMid2],
                [xScale(d.target.start) + (xScale(d.target.end || d.target.start) - xScale(d.target.start)) / 2, yScale(d.target.speaker)]
            ];
            return curve(pathData);
        })

    // Handle mouseover and mouseout events
    node.on('mouseover', (event, d) => {
        let currentSpeaker = d.speaker;
        let textArray = [];
        textArray.push(d.text);

        // Remove all existing text elements and hover boxes
        svg.selectAll('.node').attr('stroke', 'none');
        svg.selectAll('.hover-box').remove();
        link.attr('stroke', 'black').attr('marker-end', 'url(#arrowhead)');
        link.attr('stroke-dasharray', null)


        let yPosition = yScale(currentSpeaker) + yScale.bandwidth() + 5; // Place the hover box below the bar

        let hoverBox = svg.append('g')
            .attr('class', 'hover-box');

        textArray.forEach(function (text, index) {
            let textelement = hoverBox.append('text')
                .attr('y', yPosition + 20 + index * 15)
                .style('visibility', 'visible')
                .style('cursor', 'pointer')
                .text(text)
                .on('mouseover', function () {
                    textHovered = true;
                })
                .on('click', function () {
                    // Handle click event here, e.g., open a link or perform a specific action
                    console.log('Text clicked: ' + text);
                });
            if (text === d.text) {
                textelement.style('font-weight', 'bold');
            }
        });

        let bbox = hoverBox.node().getBBox();

        hoverBox.insert('rect', 'text')
            .attr('y', yPosition) // Place the hover box below the bar
            .attr('width', bbox.width + 10)
            .attr('height', bbox.height + 10)
            .style('fill', 'white')
            .style('stroke', 'black')
            .style('cursor', 'pointer')
            .on('mouseover', function () {
                textHovered = true;
            })
            .on('mouseout', function () {
                textHovered = false;
                setTimeout(function () {
                    if (!barHovered && !textHovered) {
                        svg.selectAll('.hover-box').remove();
                        svg.selectAll('.node').attr('stroke', 'none');
                        link.attr('stroke', 'black').attr('marker-end', 'url(#arrowhead)');
                        link.attr('stroke-dasharray', null)
                    }
                }, 300);
            });
        d3.select(event.currentTarget)
            .attr('stroke', 'black')
            .attr('stroke-width', 2);
        barHovered = true;

        // Highlight connected links
        link.filter(l => l.source === d)
            .attr('stroke', d => {
                if (d.text_additional === 'Default Transition') {
                    return 'white';
                } else if (d.text_additional === 'Default Inference') {
                    return 'violet';
                } else if (d.text_additional === 'Default Rephrase') {
                    return 'green';
                } else if (d.text_additional === 'Default Conflict') {
                    return 'red';
                } else {
                    return 'black';
                }
            })
            .attr('stroke-dasharray', d => {
                if (d.text_additional === 'Default Transition') {
                    return '5,5';
                }
            })
            .attr('marker-end', d => {
                if (d.text_additional === 'Default Transition') {
                    return 'url(#arrowhead-white)'
                } else if (d.text_additional === 'Default Inference') {
                    return 'url(#arrowhead-violet)';
                } else if (d.text_additional === 'Default Rephrase') {
                    return 'url(#arrowhead-green)';
                } else if (d.text_additional === 'Default Conflict') {
                    return 'url(#arrowhead-red)';
                } else {
                    return 'url(#arrowhead)';
                }
            });
    })
        .on('mouseout', function () {
            barHovered = false;
            setTimeout(function () {
                if (!barHovered && !textHovered) {
                    svg.selectAll('.hover-box').remove();
                    svg.selectAll('.node').attr('stroke', 'none');
                    link.attr('stroke', 'black').attr('marker-end', 'url(#arrowhead)');
                    link.attr('stroke-dasharray', null)
                }
            }, 300);
        });

    // Add arrowheads
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 0)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'black');
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead-red')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 0)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'red');
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead-violet')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 0)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'violet');
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead-green')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 0)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'green');
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead-white')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 0)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'wite');
}

