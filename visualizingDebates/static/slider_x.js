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

let nodesInWindow = null

function getLinkColor(textAdditional) {
    switch (textAdditional) {
        case 'Default Transition':
            return 'blue';
        case 'Default Inference':
            return 'violet';
        case 'Default Rephrase':
            return 'green';
        case 'Default Conflict':
            return 'red';
        default:
            return 'black';
    }
}

function getArrowHeadColor(textAdditional) {
    if (textAdditional === 'Default Transition') {
        return 'url(#arrowhead-blue)'
    } else if (textAdditional === 'Default Inference') {
        return 'url(#arrowhead-violet)';
    } else if (textAdditional === 'Default Rephrase') {
        return 'url(#arrowhead-green)';
    } else if (textAdditional === 'Default Conflict') {
        return 'url(#arrowhead-red)';
    } else {
        return 'url(#arrowhead)';
    }
}

function parseTimeData(nodes) {
    const timeParser = d3.utcParse('%Y-%m-%dT%H:%M:%S');
    nodes.forEach(function (d) {
        d.start_time = timeParser(d.start_time);
        d.end_time = timeParser(d.end_time);
    });
}

function createSVG(selector, width, height, margin) {
    return d3.select(selector)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
}

function createColorScale(domain) {
    return d3.scaleOrdinal().domain(domain).range(d3.schemeCategory10);
}

function createNodes(svg, nodes, xScale, yScale, colorScale) {
    return svg.selectAll('.node')
        .data(nodes)
        .enter().append('rect')
        .attr('class', 'node')
        .attr('x', d => xScale(d.start_time))
        .attr('y', d => yScale(d.speaker))
        .attr('width', d => xScale(d.end_time) - xScale(d.start_time))
        .attr('height', yScale.bandwidth())
        .style('fill', d => colorScale(d.speaker));
}

function computeBarWidth(xScale3, d, mouseX, antiScaleFactor) {
    const barWidth = xScale3(d.end_time) - xScale3(d.start_time);

    // Check if the bar is within the mouse window
    if (xScale3(d.start_time) <= mouseX + halfWindowSize && xScale3(d.start_time) + barWidth >= mouseX - halfWindowSize) {
        return barWidth * scaleFactor;
    } else {
        return barWidth * antiScaleFactor > 0 ? barWidth * antiScaleFactor : 0;
    }
}

function isBarWithinMouseWindow(barX, barWidth, mouseX, halfWindowSize) {
    return barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize;
}

function createSlidingTimeline(graphData) {

    console.log(graphData)

    let nodes2 = graphData.nodes;
    let timeFormat2 = d3.timeFormat('%H:%M:%S');

    let margin2 = {top: 20, right: 20, bottom: 40, left: 60};
    let width2 = 1200 - margin2.left - margin2.right;
    let height2 = 300 - margin2.top - margin2.bottom;

    parseTimeData(nodes2);

    let svg2 = createSVG('#slider', width2, height2, margin2);

    let speakers2 = Array.from(new Set(nodes2.map(function (d) {
        return d.speaker;
    })));

    let yScale2 = d3.scaleBand()
        .domain(speakers2)
        .range([height2, 0])
        .padding(0.1);

    let xScale2 = d3.scaleTime()
        .domain([d3.min(nodes2, function (d) {
            return d.start_time;
        }), d3.max(nodes2, function (d) {
            return d.end_time;
        }),])
        .range([0, width2]);

    let xAxis2 = d3.axisBottom(xScale2).tickFormat(timeFormat2);
    svg2.append('g')
        .attr('transform', 'translate(0,' + height2 + ')')
        .call(xAxis2);

    let yAxis2 = d3.axisLeft(yScale2);
    svg2.append('g')
        .call(yAxis2);

    let colorScale2 = createColorScale(speakers2);


    let node2 = createNodes(svg2, nodes2, xScale2, yScale2, colorScale2);


    let mouseRectangle = svg2.append('rect')
        .attr('class', 'mouse-rectangle')
        .attr('width', 2 * halfWindowSize)
        .attr('height', height2)
        .attr('fill', 'transparent')
        .attr('opacity', 1)
        .attr('x', 0)
        .attr('stroke', 'black')
        .attr('stroke-width', 2);

    let isDragging = false;

    svg2.on('mousedown', function () {
        isDragging = true;
    });
    d3.select('body').on('mouseup', function () {
        if (isDragging) {
            isDragging = false;
        }
    });

    svg2.on('mousemove', function (event) {
        // Get the current mouse position
        if (isDragging) {
            const mouseX = d3.pointer(event)[0];

            mouseRectangle
                .attr('x', mouseX - halfWindowSize)
                .attr('opacity', 0.5);

            nodesInWindow = nodes2.filter(function (d) {
                const barX = xScale2(d.start_time);
                const barWidth = xScale2(d.end_time) - barX;
                return isBarWithinMouseWindow(barX, barWidth, mouseX, halfWindowSize);
            });

            node2.attr('opacity', function (d) {
                const barX = xScale2(d.start_time);
                const barWidth = xScale2(d.end_time || d.start_time) - barX;
                return isBarWithinMouseWindow(barX, barWidth, mouseX, halfWindowSize) ? 1.0 : 0.2;
            });

            let textArray = nodesInWindow ? nodesInWindow.map(d => d.text) : []
            // Remove all existing text elements and hover boxes
            svg3.selectAll('.node').attr('stroke', 'none');
            svg3.selectAll('.hover-box').remove();

            let yPosition = 0
            let xPosition = width3 + 10;
            let hoverBox = svg3.append('g').attr('class', 'hover-box');

            textArray.forEach(function (text, index) {
                let textElement = hoverBox.append('text')
                    .attr('id', `hovered-text-${index}`)  // Add unique id to each text element
                    .attr('y', yPosition + 20 + index * 15)
                    .attr('x', xPosition + 5)
                    .style('visibility', 'visible')
                    .style('cursor', 'pointer')
                    .text(text)
                    .on('mouseover', function () {
                        textHovered3 = true;
                        let associatedLinks = links3.filter(link => link.source.text === text);
                        associatedLinks = associatedLinks.filter(d => ['Default Inference', 'Default Rephrase', 'Default Conflict'].includes(d.text_additional))
                        textArray.forEach((t, i) => {
                            link3.attr('opacity', 0.2);
                            svg3.selectAll('.node').attr('stroke', 'none');
                            const linkColor = associatedLinks.find(link => link.target.text === t)?.text_additional;
                            const color = getLinkColor(linkColor)

                            svg3.select(`#hovered-text-${i}`).style('fill', color);
                        });
                        link3.filter(l => l.source.text === text)
                            .attr('stroke', d => getLinkColor(d.text_additional))
                            .attr('marker-start', d => {
                                return getArrowHeadColor(d.text_additional)
                            }).attr('opacity', 1.0);
                        const hoveredNode = svg3.selectAll('.node').filter(node => node.text === text);
                        hoveredNode.attr('stroke', 'black')  // You can customize the stroke color
                            .attr('stroke-width', 2);
                        textArray.forEach((t, i) => {
                            if (t !== text) {
                                svg3.select(`#hovered-text-${i}`).style('font-weight', 'normal');
                            }
                        });
                        textElement.style('font-weight', 'bold');
                    }).on('mouseout', function () {
                        textArray.forEach((t, i) => {
                            svg3.select(`#hovered-text-${i}`)
                                .style('fill', 'black');
                        });
                        textElement.style('font-weight', 'normal');
                        svg3.selectAll('.node').attr('stroke', 'none');
                    })
            })
            let bbox = hoverBox.node().getBBox();
            if (nodesInWindow) {
                hoverBox.insert('rect', 'text')
                    .attr('y', yPosition)
                    .attr('x', xPosition)
                    .attr('width', bbox.width + 10)
                    .attr('height', bbox.height + 10)
                    .style('fill', 'white')
                    .style('stroke', 'black')
                    .style('cursor', 'pointer')
                    .on('mouseover', function () {
                        textHovered3 = true;
                    })
            }
        }

    })
    svg2.selectAll('.question-line')
        .data(nodes2)
        .enter().append('line')
        .attr('class', 'new-question-line')
        .attr('x1', d => xScale2(d.start_time))
        .attr('x2', d => xScale2(d.start_time))
        .attr('y1', d => d.newQuestion ? 0 : -1000)
        .attr('y2', d => d.newQuestion ? height2 : -1000)
        .style('stroke', 'red');


    //--------------------------------------------------------------------
    let nodes3 = graphData.nodes;
    let links3 = graphData.links;

    let barHovered3 = false;
    let textHovered3 = false;

    let margin3 = {top: 20, right: 20, bottom: 40, left: 60};
    let width3 = 1200 - margin3.left - margin3.right;
    let height3 = 600 - margin3.top - margin3.bottom;

    let svg3 = d3
        .select('#time')
        .attr('width', 2500 + margin3.left + margin3.right)
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
        .domain([d3.min(nodes3, function (d) {
            return d.start_time;
        }), d3.max(nodes3, function (d) {
            return d.end_time || d.start_time;
        }),])
        .range([0, width3]);

    //let xAxis3 = d3.axisBottom(xScale3).tickFormat(timeFormat3);
    let xAxis3 = d3.axisBottom(xScale3).ticks(0);
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

    svg3.selectAll('.link-target-line')
        .data(nodes3)
        .enter()
        .append('line')
        .attr('class', 'line-connector')
        .attr('x1', d => xScale3(d.start_time) + (xScale3(d.end_time) - xScale3(d.start_time)) / 2)
        .attr('y1', d => yScale3(d.speaker) - 10)
        .attr('x2', d => xScale3(d.start_time) + (xScale3(d.end_time) - xScale3(d.start_time)) / 2)
        .attr('y2', d => yScale3(d.speaker) + yScale3.bandwidth() + 10)
        .attr('stroke', 'green')

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
        .data(links3.filter(d => ['Default Inference', 'Default Rephrase', 'Default Conflict'].includes(d.text_additional)))
        .enter().append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('marker-end', d => getArrowHeadColor(d.text_additional))
        .attr('stroke', d => getLinkColor(d.text_additional))
        .attr('stroke-width', 2)
        .attr('d', d => {
            let pathData
            let adapt_y = d.text_additional === "Default Conflict" ? yScale3.bandwidth() + 10 : -10
            let adapt_start_y = d.text_additional === "Default Conflict" ? yScale3.bandwidth() : 0
            let xMid = (xScale3(d.source.start_time) + xScale3(d.target.start_time)) / 2;
            let yMid1 = yScale3(d.source.speaker) + adapt_y;
            let yMid2 = yScale3(d.target.speaker) + adapt_y;
            pathData = [
                [(xScale3(d.source.start_time) + (xScale3(d.source.end_time) - xScale3(d.source.start_time)) / 2), yScale3(d.source.speaker) + adapt_start_y],
                [xMid, yMid1],
                [xMid, yMid2],
                [(xScale3(d.target.start_time) + (xScale3(d.target.end_time) - xScale3(d.target.start_time)) / 2), yScale3(d.target.speaker) + adapt_y]
            ]
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
        //let textArray = d.grouped_texts;
        let textArray = nodesInWindow ? nodesInWindow.map(d => d.text) : []

        // Remove all existing text elements and hover boxes
        svg3.selectAll('.node').attr('stroke', 'none');
        //link3.attr('stroke', 'black').attr('marker-end', 'url(#arrowhead)');
        //link3.attr('stroke-dasharray', null);

        barHovered3 = true;

        let associatedLinks = links3.filter(link => link.source.text === d.text);
        associatedLinks = associatedLinks.filter(d => ['Default Inference', 'Default Rephrase', 'Default Conflict'].includes(d.text_additional))

        textArray.forEach((t) => {
            //link3.attr('stroke', 'black').attr('marker-end', 'url(#arrowhead)');
            //link3.attr('stroke-dasharray', null);
            link3.attr('opacity', 0.2);
            svg3.selectAll('.node').attr('stroke', 'none');
            const isConnected = associatedLinks.some(link => link.target.text === t);
            const linkColor = associatedLinks.find(link => link.target.text === t)?.text_additional;
            const color = isConnected ? getLinkColor(linkColor) : 'black';
            const hoveredTextElement = svg3.selectAll('.hover-box text').filter(function () {
                return this.textContent === t;
            });
            hoveredTextElement
                .style('fill', color)
                .style('font-weight', 'normal'); // Adjust the font-weight as needed
        });
        const hoveredTextElement = svg3.selectAll('.hover-box text').filter(function () {
            return this.textContent === d.text;
        });
        hoveredTextElement.style('font-weight', 'bold');

        d3.select(event.currentTarget)
            .attr('stroke', 'black')
            .attr('stroke-width', 2);


        // Highlight connected links
        link3.filter(l => l.source === d)
            .attr('stroke', d => {
                return getLinkColor(d.text_additional)
            })
            .attr('marker-end', d => {
                return getArrowHeadColor(d.text_additional)
            }).attr('opacity', 1.0);
    }).on('mouseout', function () {
        barHovered3 = false;
        setTimeout(function () {
            if (!barHovered3 && !textHovered3) {
                //svg3.selectAll('.hover-box').remove();
                //svg3.selectAll('.node').attr('stroke', 'none');
                //link3.attr('stroke', 'black').attr('marker-end', 'url(#arrowhead)');
                //link3.attr('stroke-dasharray', null)
            }
        }, 300);
    });

    svg3.selectAll('.bar-text')
        .data(nodes3)
        .enter()
        .append('text')
        .attr('class', 'bar-text')
        .attr('x', d => xScale3(d.start_time))
        .attr('y', (d, i) => nodesToShowText[i] ? height3 + 20 : -1000)
        .text(d => d3.timeFormat('%H:%M:%S')(d.start_time))
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px');
    svg3.selectAll('.line-connector')
        .data(nodes3)
        .enter()
        .append('line')
        .attr('class', 'line-connector')
        .attr('x1', d => xScale3(d.start_time))
        .attr('y1', (d, i) => nodesToShowText[i] ? height3 : -1000)
        .attr('x2', d => xScale3(d.start_time))
        .attr('y2', (d, i) => nodesToShowText[i] ? height3 + 10 : -1000)
        .attr('stroke', 'black')
        .attr('stroke-dasharray', '5,5');
    svg3.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 9)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 3)
        .attr('markerHeight', 4)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'black');
    svg3.append('defs').append('marker')
        .attr('id', 'arrowhead-red')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 9)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 3)
        .attr('markerHeight', 4)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'red');
    svg3.append('defs').append('marker')
        .attr('id', 'arrowhead-violet')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 9)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 3)
        .attr('markerHeight', 4)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('class', 'arrowhead')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'violet');
    svg3.append('defs').append('marker')
        .attr('id', 'arrowhead-green')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 9)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 3)
        .attr('markerHeight', 4)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'green');
    svg3.selectAll('.question-line')
        .data(nodes3)
        .enter().append('line')
        .attr('class', 'new-question-line')
        .attr('x1', d => xScale3(d.start_time))
        .attr('x2', d => xScale3(d.start_time))
        .attr('y1', d => d.newQuestion ? 0 : -1000)
        .attr('y2', d => d.newQuestion ? height3 : -1000)
        .style('stroke', 'red');
}
