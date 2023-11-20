const scaleFactor = 8;
const halfWindowSize = 30;

function determineXValue(xScale3, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX) {
    const barX = xScale3(d.start_time);
    const barWidth = xScale3(d.end_time || d.start_time) - barX;

    // Check if the bar is within the mouse window
    if (barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize) {
        return adaptedXBeforeWindow + (xScale3(d.start_time) - firstScaledNodeX) * scaleFactor;
    } else {
        if (barX < mouseX - halfWindowSize) {
            return barX * antiScaleFactor;
        } else {
            return adaptedXAfterWindow + (barX - lastScaledNodeX) * antiScaleFactor
        }
    }
}

function createSlidingTimeline(graphData) {

    console.log(graphData)
    let nodes = graphData.nodes;
    let links = graphData.links;

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

    let timeParser = d3.utcParse('%Y-%m-%dT%H:%M:%S');
    nodes.forEach(function (d) {
        d.start_time = timeParser(d.start_time);
        d.end_time = timeParser(d.end_time);
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
                return d.start_time;
            }),
            d3.max(nodes, function (d) {
                return d.end_time || d.start_time;
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
    d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(20))
        .force('charge', d3.forceManyBody().strength(-50))
        .force('center', d3.forceCenter(width / 2, height / 2));

    let curve = d3.line()
        .curve(d3.curveBasis);

    // Draw nodes (rectangles)
    let node = svg.selectAll('.node')
        .data(nodes)
        .enter().append('rect')
        .attr('class', 'node')
        .attr('x', d => xScale(d.start_time))
        .attr('y', d => yScale(d.speaker))
        .attr('width', d => xScale(d.end_time || d.start_time) - xScale(d.start_time))
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
            let xMid = (xScale(d.source.start_time) + xScale(d.target.start_time)) / 2;
            let yMid1 = yScale(d.source.speaker) - yScale.bandwidth() / 2;
            let yMid2 = yScale(d.target.speaker) - yScale.bandwidth() / 3;

            let pathData = [
                [xScale(d.source.start_time) + (xScale(d.source.end_time || d.source.start_time) - xScale(d.source.start_time)) / 2, yScale(d.source.speaker)],
                [xMid, yMid1],
                [xMid, yMid2],
                [xScale(d.target.start_time) + (xScale(d.target.end_time || d.target.start_time) - xScale(d.target.start_time)) / 2, yScale(d.target.speaker)]
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
        .attr('fill', 'white');

    let nodes2 = graphData.nodes;
    let timeFormat2 = d3.timeFormat('%H:%M:%S');

    let margin2 = {top: 20, right: 20, bottom: 40, left: 60};
    let width2 = 1200 - margin2.left - margin2.right;
    let height2 = 300 - margin2.top - margin2.bottom;

    let svg2 = d3
        .select('#slider')
        .attr('width', width2 + margin2.left + margin2.right)
        .attr('height', height2 + margin2.top + margin2.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin2.left + ',' + margin2.top + ')');

    let speakers2 = Array.from(new Set(nodes2.map(function (d) {
        return d.speaker;
    })));

    let yScale2 = d3.scaleBand()
        .domain(speakers2)
        .range([height2, 0])
        .padding(0.1);

    let xScale2 = d3.scaleTime()
        .domain([
            d3.min(nodes2, function (d) {
                return d.start_time;
            }),
            d3.max(nodes2, function (d) {
                return d.end_time || d.start_time;
            }),
        ])
        .range([0, width2]);

    let xAxis2 = d3.axisBottom(xScale2).tickFormat(timeFormat2);
    svg2.append('g')
        .attr('transform', 'translate(0,' + height2 + ')')
        .call(xAxis2);

    let yAxis2 = d3.axisLeft(yScale2);
    svg2.append('g')
        .call(yAxis2);

    let colorScale2 = d3.scaleOrdinal()
        .domain(speakers2)
        .range(d3.schemeCategory10);

    let node2 = svg2.selectAll('.node')
        .data(nodes2)
        .enter().append('rect')
        .attr('class', 'node')
        .attr('x', d => xScale2(d.start_time))
        .attr('y', d => yScale2(d.speaker))
        .attr('width', d => xScale2(d.end_time || d.start_time) - xScale(d.start_time))
        .attr('height', yScale2.bandwidth())
        .style('fill', d => colorScale2(d.speaker))

    let mouseRectangle = svg2.append('rect')
        .attr('class', 'mouse-rectangle')
        .attr('width', 2 * halfWindowSize)
        .attr('height', height2)
        .attr('fill', 'transparent')
        .attr('opacity', 1)
        .attr('x', -halfWindowSize)
        .attr('stroke', 'black')
        .attr('stroke-width', 2);

// Handle mousemove event
    svg2.on('mousemove', function (event) {
        // Get the current mouse position
        const mouseX = d3.pointer(event)[0];
        // Update the position and width of the mouse rectangle
        mouseRectangle
            .attr('x', mouseX - halfWindowSize) // Adjust the x position for the center
            .attr('opacity', 0.5); // Adjust the opacity as needed

        const nodesInWindow = nodes2.filter(function (d) {
            const barX = xScale2(d.start_time);
            const barWidth = xScale2(d.end_time || d.start_time) - barX;

            return barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize;
        });
        const windowStartValue = d3.min(nodesInWindow, function (d) {
            return d.start_time;
        });

        const windowEndValue = d3.max(nodesInWindow, function (d) {
            return d.end_time;
        });

        // Update the opacity of the bars based on their positions relative to the mouse
        node2.attr('opacity', function (d) {
            const barX = xScale2(d.start_time);
            const barWidth = xScale2(d.end_time || d.start_time) - barX;

            // Check if the bar is within the mouse window
            if (barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize) {
                return 1.0; // Full color within the window
            } else {
                return 0.2; // Adjust the opacity for bars outside the window
            }
        });
        //xScale3.domain([windowStartValue, windowEndValue]);
        //node3.attr('x', d => xScale3(d.start_time))
        //    .attr('width', d => xScale3(d.end_time || d.start_time) - xScale3(d.start_time));
        /*const nodesInWindow = nodes3.filter(function (d) {
            const barX = xScale3(d.start_time);
            const barWidth = xScale3(d.end_time || d.start_time) - barX;
            return barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize;
        });*/
        const lastScaledNodeX = xScale3(d3.max(nodesInWindow, d => d.end_time));
        const firstScaledNodeX = xScale3(d3.min(nodesInWindow, d => d.start_time));
        const diagramLength = xScale3(d3.max(nodes3, d => d.end_time))
        const scaledAreaLength = ((lastScaledNodeX - firstScaledNodeX) * scaleFactor)
        const unscaledAreaLength = diagramLength - (lastScaledNodeX - firstScaledNodeX)
        const antiScaledAreaLength = diagramLength - scaledAreaLength
        const antiScaleFactor = (antiScaledAreaLength) / unscaledAreaLength
        const beforeAreaLength = firstScaledNodeX * antiScaleFactor
        const adaptedXBeforeWindow = firstScaledNodeX - (firstScaledNodeX - beforeAreaLength)
        const adaptedXAfterWindow = firstScaledNodeX * antiScaleFactor + scaledAreaLength

        svg3.selectAll('.bar-text').attr('x', d => {
            return determineXValue(xScale3, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);

        }).attr('y', (d, i) => {
            return nodesToShowText[i] ? 255 : -1000;
        })
        svg3.selectAll('.line-connector')
            .attr('x1', d => {
                return determineXValue(xScale3, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);
            })
            .attr('x2', d => {
                return determineXValue(xScale3, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);

            })
            .attr('y1', (d, i) => nodesToShowText[i] ? yScale3(d.speaker) + yScale3.bandwidth() : -1000)
            .attr('y2', (d, i) => nodesToShowText[i] ? 245 : -1000);

        node3
            .attr('x', d => {
                return determineXValue(xScale3, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);

            }).attr('width', d => {
            const barWidth = xScale3(d.end_time || d.start_time) - xScale3(d.start_time);

            // Check if the bar is within the mouse window
            if (xScale3(d.start_time) <= mouseX + halfWindowSize && xScale3(d.start_time) + barWidth >= mouseX - halfWindowSize) {
                return barWidth * scaleFactor;
            } else {
                return barWidth * antiScaleFactor > 0 ? barWidth * antiScaleFactor : 0;
            }
        }).attr('opacity', function (d) {
            const barX = xScale3(d.start_time);
            const barWidth = xScale3(d.end_time || d.start_time) - barX;

            // Check if the bar is within the mouse window
            if (barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize) {
                return 1.0;
            } else {
                return 0.2;
            }
        });
        link3
            .attr('d', d => {
                let xMid1 = (determineXValue(xScale3, d.source, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX) +
                    determineXValue(xScale3, d.source, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX)) / 2;
                let xMid2 = (determineXValue(xScale3, d.target, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX) +
                    determineXValue(xScale3, d.target, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX)) / 2;
                let yMid1 = yScale3(d.source.speaker) - yScale3.bandwidth() / 2;
                let yMid2 = yScale3(d.target.speaker) - yScale3.bandwidth() / 3;
                let pathData = [
                    [xMid1, yScale3(d.source.speaker)],
                    [xMid1, yMid1],
                    [xMid2, yMid2],
                    [xMid2, yScale3(d.target.speaker)]
                ];
                return curve3(pathData);
            })
            .attr('visibility', d => {
                const sourceX = determineXValue(xScale3, d.source, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);
                const targetX = determineXValue(xScale3, d.target, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);
                return sourceX >= adaptedXBeforeWindow && targetX <= adaptedXAfterWindow ? 'visible' : 'hidden'
            });

    });

// Handle mouseout event
    svg2.on('mouseout', function () {
        // Reset the mouse rectangle and restore full color for all bars
        //mouseRectangle.attr('opacity', 0);
        //node2.attr('opacity', 1.0);
        //node3.attr('opacity', 1.0);

    });

    //--------------------------------------------------------------------
    let nodes3 = graphData.nodes;
    let links3 = graphData.links;

    let timeFormat3 = d3.timeFormat('%H:%M:%S');
    let barHovered3 = false;
    let textHovered3 = false;

    let margin3 = {top: 20, right: 20, bottom: 40, left: 60};
    let width3 = 1200 - margin3.left - margin3.right;
    let height3 = 600 - margin3.top - margin3.bottom;

    let svg3 = d3
        .select('#time')
        .attr('width', width3 + margin3.left + margin3.right)
        .attr('height', height3 + margin3.top + margin3.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin3.left + ',' + margin3.top + ')');

    let speakers3 = Array.from(new Set(nodes3.map(function (d) {
        return d.speaker;
    })));

    let yScale3 = d3.scaleBand()
        .domain(speakers3)
        .range([height3, 0])
        .padding(0.1);

    let xScale3 = d3.scaleTime()
        .domain([
            d3.min(nodes3, function (d) {
                return d.start_time;
            }),
            d3.max(nodes3, function (d) {
                return d.end_time || d.start_time;
            }),
        ])
        .range([0, width3]);

    let xAxis3 = d3.axisBottom(xScale3).tickFormat(timeFormat3);
    svg3.append('g')
        .attr('transform', 'translate(0,' + height3 + ')')
        .call(xAxis3);

    let yAxis3 = d3.axisLeft(yScale3);
    svg3.append('g')
        .call(yAxis3);

    let colorScale3 = d3.scaleOrdinal()
        .domain(speakers3)
        .range(d3.schemeCategory10);

    d3.forceSimulation(nodes3)
        .force('link', d3.forceLink(links3).id(d => d.id).distance(20))
        .force('charge', d3.forceManyBody().strength(-50))
        .force('center', d3.forceCenter(width3 / 2, height3 / 2));

    let curve3 = d3.line()
        .curve(d3.curveBasis);

    let node3 = svg3.selectAll('.node')
        .data(nodes3)
        .enter().append('rect')
        .attr('class', 'node')
        .attr('x', d => xScale3(d.start_time))
        .attr('y', d => yScale3(d.speaker))
        .attr('width', d => xScale3(d.end_time || d.start_time) - xScale3(d.start_time))
        .attr('height', yScale3.bandwidth())
        .style('fill', d => colorScale3(d.speaker))

    let link3 = svg3.selectAll('.link')
        .data(links3)
        .enter().append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('marker-end', 'url(#arrowhead)')  // Set a default arrowhead
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('d', d => {
            // Calculate midpoints and control points
            let xMid = (xScale3(d.source.start_time) + xScale3(d.target.start_time)) / 2;
            let yMid1 = yScale3(d.source.speaker) - yScale3.bandwidth() / 2;
            let yMid2 = yScale3(d.target.speaker) - yScale3.bandwidth() / 3;

            let pathData = [
                [xScale3(d.source.start_time) + (xScale3(d.source.end_time || d.source.start_time) - xScale3(d.source.start_time)) / 2, yScale3(d.source.speaker)],
                [xMid, yMid1],
                [xMid, yMid2],
                [xScale3(d.target.start_time) + (xScale3(d.target.end_time || d.target.start_time) - xScale3(d.target.start_time)) / 2, yScale3(d.target.speaker)]
            ];
            return curve3(pathData);
        })

    const nodesToShowText = [];
    let lastNodeX = 0; // Declare lastNodeX here

// Precompute whether each node should display text
    nodes3.forEach(function (d, i) {
        const barX = xScale3(d.start_time);

        if (barX >= lastNodeX + halfWindowSize || xScale3(d.end_time) - barX > halfWindowSize) {
            nodesToShowText[i] = true;
            lastNodeX = barX;
        } else {
            nodesToShowText[i] = false;
        }
    });
    node3.on('mouseover', (event, d) => {
        let currentSpeaker = d.speaker;
        let textArray = [];
        textArray.push(d.text);

        // Remove all existing text elements and hover boxes
        svg3.selectAll('.node').attr('stroke', 'none');
        svg3.selectAll('.hover-box').remove();
        link3.attr('stroke', 'black').attr('marker-end', 'url(#arrowhead)');
        link3.attr('stroke-dasharray', null)


        let yPosition = yScale3(currentSpeaker) + yScale3.bandwidth() + 5; // Place the hover box below the bar

        let hoverBox = svg3.append('g')
            .attr('class', 'hover-box');

        textArray.forEach(function (text, index) {
            let textelement = hoverBox.append('text')
                .attr('y', yPosition + 20 + index * 15)
                .style('visibility', 'visible')
                .style('cursor', 'pointer')
                .text(text)
                .on('mouseover', function () {
                    textHovered3 = true;
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
                textHovered3 = true;
            })
            .on('mouseout', function () {
                textHovered3 = false;
                setTimeout(function () {
                    if (!barHovered3 && !textHovered3) {
                        svg3.selectAll('.hover-box').remove();
                        svg3.selectAll('.node').attr('stroke', 'none');
                        link3.attr('stroke', 'black').attr('marker-end', 'url(#arrowhead)');
                        link3.attr('stroke-dasharray', null)
                    }
                }, 300);
            });
        d3.select(event.currentTarget)
            .attr('stroke', 'black')
            .attr('stroke-width', 2);
        barHovered3 = true;

        // Highlight connected links
        link3.filter(l => l.source === d)
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
            barHovered3 = false;
            setTimeout(function () {
                if (!barHovered3 && !textHovered3) {
                    svg3.selectAll('.hover-box').remove();
                    svg3.selectAll('.node').attr('stroke', 'none');
                    link3.attr('stroke', 'black').attr('marker-end', 'url(#arrowhead)');
                    link3.attr('stroke-dasharray', null)
                }
            }, 300);
        });

    svg3.selectAll('.bar-text')
        .data(nodes3)
        .enter()
        .append('text')
        .attr('class', 'bar-text')
        .attr('x', d => xScale3(d.start_time))
        .attr('y', (d, i) => nodesToShowText[i] ? 255 : -1000)
        .text(d => d3.timeFormat('%H:%M:%S')(d.start_time))
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px');
    svg3.selectAll('.line-connector')
        .data(nodes3)
        .enter()
        .append('line')
        .attr('class', 'line-connector')
        .attr('x1', d => xScale3(d.start_time))
        .attr('y1', (d, i) => nodesToShowText[i] ? yScale3(d.speaker) + yScale3.bandwidth() : -1000)
        .attr('x2', d => xScale3(d.start_time))
        .attr('y2', (d, i) => nodesToShowText[i] ? 245 : -1000)
        .attr('stroke', 'black')
        .attr('stroke-dasharray', '5,5');

    svg3.append('defs').append('marker')
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
    svg3.append('defs').append('marker')
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
    svg3.append('defs').append('marker')
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
    svg3.append('defs').append('marker')
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
    svg3.append('defs').append('marker')
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
        .attr('fill', 'white');

    /*    svg3.on('mousemove', function (event) {
            // Get the current mouse position
            const mouseX = d3.pointer(event)[0];

            // Update the position and width of the mouse rectangle
            mouseRectangle3
                .attr('x', mouseX - halfWindowSize)
                .attr('opacity', 0.5);

            const nodesInWindow = nodes3.filter(function (d) {
                const barX = xScale3(d.start_time);
                const barWidth = xScale3(d.end_time || d.start_time) - barX;
                return barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize;
            });
            const lastScaledNodeX = xScale3(d3.max(nodesInWindow, d => d.end_time));
            const firstScaledNodeX = xScale3(d3.min(nodesInWindow, d => d.start_time));
            const diagramLength = xScale3(d3.max(nodes3, d => d.end_time))
            const scaledAreaLength = ((lastScaledNodeX - firstScaledNodeX) * scaleFactor)
            const unscaledAreaLength = diagramLength - (lastScaledNodeX - firstScaledNodeX)
            const antiScaledAreaLength = diagramLength - scaledAreaLength
            const antiScaleFactor = (antiScaledAreaLength) / unscaledAreaLength
            const beforeAreaLength = firstScaledNodeX * antiScaleFactor
            const adaptedXBeforeWindow = firstScaledNodeX - (firstScaledNodeX - beforeAreaLength)
            const adaptedXAfterWindow = firstScaledNodeX * antiScaleFactor + scaledAreaLength

            svg3.selectAll('.bar-text').attr('x', d => {
                return determineXValue(xScale3, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);

            }).attr('y', (d, i) => {
                return nodesToShowText[i] ? 255 : -1000;
            })
            svg3.selectAll('.line-connector')
                .attr('x1', d => {
                    return determineXValue(xScale3, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);
                })
                .attr('x2', d => {
                    return determineXValue(xScale3, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);

                })
                .attr('y1', (d, i) => nodesToShowText[i] ? yScale3(d.speaker) + yScale3.bandwidth() : -1000)
                .attr('y2', (d, i) => nodesToShowText[i] ? 245 : -1000);

            node3.attr('x', d => {
                return determineXValue(xScale3, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);

            }).attr('width', d => {
                const barWidth = xScale3(d.end_time || d.start_time) - xScale3(d.start_time);

                // Check if the bar is within the mouse window
                if (xScale3(d.start_time) <= mouseX + halfWindowSize && xScale3(d.start_time) + barWidth >= mouseX - halfWindowSize) {
                    return barWidth * scaleFactor;
                } else {
                    return barWidth * antiScaleFactor;
                }
            });
            node3.attr('opacity', function (d) {
                const barX = xScale3(d.start_time);
                const barWidth = xScale3(d.end_time || d.start_time) - barX;

                // Check if the bar is within the mouse window
                if (barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize) {
                    return 1.0;
                } else {
                    return 0.2;
                }
            });
        });

    // Handle mouseout event
        svg3.on('mouseout', function () {
            // Reset the mouse rectangle and restore full color for all bars
            mouseRectangle3.attr('opacity', 0);
            node3.attr('opacity', 1.0);
            svg3.selectAll('.vertical-line').remove();

        });*/

}
