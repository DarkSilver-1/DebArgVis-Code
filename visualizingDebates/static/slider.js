const scaleFactor = 8;
const halfWindowSize = 30;
let currentTime = 0;

let prevNodesInWindow = null
let nodesInWindow = null

function createSlidingTimeline(graphData) {
    console.log(graphData)

    let nodes = graphData.nodes;
    let links = graphData.links;

    let timeFormat2 = d3.timeFormat('%H:%M:%S');

    let margin2 = {top: 20, right: 20, bottom: 40, left: 60};
    let width2 = 1200 - margin2.left - margin2.right;
    let height2 = 150 - margin2.top - margin2.bottom;

    parseTimeData(nodes);

    let svg2 = createSVG('#slider', width2, height2, margin2);

    let speakers2 = Array.from(new Set(nodes.map(function (d) {
        return d.speaker;
    })));

    let yScale2 = d3.scaleBand()
        .domain(speakers2)
        .range([height2, 0])
        .padding(0.1);

    let xScale = d3.scaleTime()
        .domain([d3.min(nodes, function (d) {
            return d.start_time;
        }), d3.max(nodes, function (d) {
            return d.end_time;
        }),])
        .range([0, width2]);

    let xAxis2 = d3.axisBottom(xScale).tickFormat(timeFormat2);
    svg2.append('g')
        .attr('transform', 'translate(0,' + height2 + ')')
        .call(xAxis2);

    let yAxis2 = d3.axisLeft(yScale2);
    svg2.append('g')
        .call(yAxis2);

    let colorScale2 = createColorScale(speakers2);


    let node2 = createNodes(svg2, nodes, xScale, yScale2, colorScale2);


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
            nodesInWindow = nodes.filter(function (d) {
                const barX = xScale(d.start_time);
                const barWidth = xScale(d.end_time) - barX;
                return isBarWithinMouseWindow(barX, barWidth, mouseX, halfWindowSize);
            });
            if (!(prevNodesInWindow && (nodesInWindow[0] === prevNodesInWindow[0] && nodesInWindow[nodesInWindow.length - 1] === prevNodesInWindow[prevNodesInWindow.length - 1]))) {
                updateDiagram(mouseX, xScale, node2, nodes, svg3, height3, yScale3, node3, link, curve, scaleFactor);
            }
            prevNodesInWindow = nodesInWindow
        }
    }).on('mouseout', function () {
        // Reset the mouse rectangle and restore full color for all bars
        //mouseRectangle.attr('opacity', 0);
        //node2.attr('opacity', 1.0);
        //node3.attr('opacity', 1.0);
    });
    svg2.selectAll('.question-line')
        .data(nodes)
        .enter().append('line')
        .attr('class', 'new-question-line')
        .attr('x1', d => xScale(d.start_time))
        .attr('x2', d => xScale(d.start_time))
        .attr('y1', d => d.newQuestion ? 0 : -1000)
        .attr('y2', d => d.newQuestion ? height2 : -1000)
        .style('stroke', 'red');
    let videoplayer = document.getElementById('videoPlayer')
    videoplayer.currentTime = currentTime
    videoplayer.addEventListener('timeupdate', function () {
        const currentTimeVid = currentTime;
        nodesInWindow = nodes.filter(function (d) {
            const updatedTime = new Date(d.start_time.getTime());
            const barX = xScale(updatedTime);
            const barWidth = xScale(d.end_time) - barX;
            return isBarWithinMouseWindow(barX, barWidth, currentTimeVid, halfWindowSize);
        });
        mouseRectangle
            .attr('x', currentTimeVid - halfWindowSize)
            .attr('opacity', 0.5);
        updateDiagram(currentTimeVid, xScale, node2, nodes, svg3, height3, yScale3, node3, link, curve, scaleFactor);
        currentTime = videoplayer.currentTime
    });

    //--------------------------------------------------------------------

    let barHovered3 = false;
    let textHovered3 = false;

    let margin3 = {top: 20, right: 20, bottom: 40, left: 60};
    let width3 = 1200 - margin3.left - margin3.right;
    let height3 = 500 - margin3.top - margin3.bottom;

    let svg3 = createSVG('#time', 2500 + margin3.left + margin3.right, height3, margin3);

    let speakers3 = Array.from(new Set(nodes.map(function (d) {
        return d.speaker;
    })));

    let yScale3 = d3.scaleBand()
        .domain(speakers3)
        .range([height3, 0])
        .padding(0.1);

    let xAxis3 = d3.axisBottom(xScale).ticks(0);
    svg3.append('g')
        .attr('transform', 'translate(0,' + height3 + ')')
        .call(xAxis3);

    let yAxis3 = d3.axisLeft(yScale3);
    svg3.append('g')
        .call(yAxis3);

    let colorScale3 = d3.scaleOrdinal()
        .domain(speakers3)
        .range(d3.schemeCategory10);

    d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(20))
        .force('charge', d3.forceManyBody().strength(-50))
        .force('center', d3.forceCenter(width3 / 2, height3 / 2));

    let curve = d3.line()
        .curve(d3.curveBasis);

    let nodesToShowText = findNodesToShowText(nodes, xScale)

    let node3 = svg3.selectAll('.node-group')
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node-group")
        .attr('transform', d => `translate(${xScale(d.start_time)}, ${yScale3(d.speaker)})`);
    node3.append('line')
        .attr('class', 'line-connector')
        .attr('x1', d => (xScale(d.end_time) - xScale(d.start_time)) / 2)
        .attr('y1', -10)
        .attr('x2', d => (xScale(d.end_time) - xScale(d.start_time)) / 2)
        .attr('y2', yScale3.bandwidth() + 10)
        .attr('stroke', 'green');
    node3.append('rect')
        .attr('class', 'node')
        .attr('width', d => xScale(d.end_time) - xScale(d.start_time))
        .attr('height', yScale3.bandwidth())
        .style('fill', d => colorScale3(d.speaker));
    node3.append('line')
        .attr('class', 'additional-line')
        .attr('x1', 0)
        .attr('y1', yScale3.bandwidth())
        .attr('x2', 0)
        .attr('y2', d => height3 - yScale3(d.speaker) + 5)
        .attr('stroke', 'black')
        .attr('stroke-dasharray', '5,5')
        .attr('visibility', (d, i) => nodesToShowText[i] ? 'visible' : 'hidden');
    node3.append('text')
        .attr('class', 'bar-text')
        .attr('x', 0)
        .attr('y', d => height3 - yScale3(d.speaker) + 10)
        .text(d => d3.timeFormat('%H:%M:%S')(d.start_time))
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('visibility', (d, i) => nodesToShowText[i] ? 'visible' : 'hidden');

    let link = svg3.selectAll('.link')
        .data(links.filter(d => ['Default Inference', 'Default Rephrase', 'Default Conflict'].includes(d.text_additional)))
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
            let xMid = (xScale(d.source.start_time) + xScale(d.target.start_time)) / 2;
            let yMid1 = yScale3(d.source.speaker) + adapt_y;
            let yMid2 = yScale3(d.target.speaker) + adapt_y;
            pathData = [
                [(xScale(d.source.start_time) + (xScale(d.source.end_time) - xScale(d.source.start_time)) / 2), yScale3(d.source.speaker) + adapt_start_y],
                [xMid, yMid1],
                [xMid, yMid2],
                [(xScale(d.target.start_time) + (xScale(d.target.end_time) - xScale(d.target.start_time)) / 2), yScale3(d.target.speaker) + adapt_y]
            ]
            return curve(pathData);
        })
    addTextBox(width3, svg3, nodes, textHovered3, links, link);

    node3.on('mouseover', (event, d) => {
        let textArray = nodesInWindow ? nodesInWindow.map(d => d.text) : []

        svg3.selectAll('.node').attr('stroke', 'none');

        barHovered3 = true;

        let associatedLinks = links.filter(link => link.source.text === d.text);
        associatedLinks = associatedLinks.filter(d => ['Default Inference', 'Default Rephrase', 'Default Conflict'].includes(d.text_additional))

        textArray.forEach((t) => {
            link.attr('opacity', 0.2);
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
        link.filter(l => l.source === d)
            .attr('stroke', d => {
                return getLinkColor(d.text_additional)
            })
            .attr('marker-end', d => {
                return getArrowHeadColor(d.text_additional)
            }).attr('opacity', 1.0);
    }).on('mouseout', function () {
        barHovered3 = false;
    });

    node3.on('click', (event, d) => {
        document.getElementById('videoPlayerContainer').style.display = 'block';
        let videoplayer = document.getElementById('videoPlayer')
        const currentTime = xScale(d.start_time);
        nodesInWindow = nodes.filter(function (d) {
            const updatedTime = d.start_time;
            const barX = xScale(updatedTime);
            const barWidth = xScale(d.end_time) - barX;
            return isBarWithinMouseWindow(barX, barWidth, currentTime, halfWindowSize);
        });
        videoplayer.currentTime = currentTime;
        videoplayer.play();
    })

    svg3.append('defs').append('marker')
        .attr('class', 'arrowhead')
        .attr('id', 'arrowhead-red')
        .append('svg:path')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 9)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 3)
        .attr('markerHeight', 4)
        .attr('xoverflow', 'visible')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'red');
    svg3.append('defs').append('marker')
        .attr('class', 'arrowhead')
        .attr('id', 'arrowhead-violet')
        .append('svg:path')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 9)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 3)
        .attr('markerHeight', 4)
        .attr('xoverflow', 'visible')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'violet');
    svg3.append('defs').append('marker')
        .attr('class', 'arrowhead')
        .attr('id', 'arrowhead-green')
        .append('svg:path')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 9)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 3)
        .attr('markerHeight', 4)
        .attr('xoverflow', 'visible')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'green');
}

function determineXValue(xScale, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX) {
    const barX = xScale(d.start_time);
    const barWidth = xScale(d.end_time || d.start_time) - barX;

    // Check if the bar is within the mouse window
    if (barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize) {
        return adaptedXBeforeWindow + (xScale(d.start_time) - firstScaledNodeX) * scaleFactor;
    } else {
        if (barX < mouseX - halfWindowSize) {
            return barX * antiScaleFactor;
        } else {
            return adaptedXAfterWindow + (barX - lastScaledNodeX) * antiScaleFactor
        }
    }
}

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
    nodes.forEach(function (d) {
        const isoStartTime = new Date(d.start_time).toISOString();
        const isoEndTime = new Date(d.end_time).toISOString();
        d.start_time = d3.isoParse(isoStartTime);
        d.end_time = d3.isoParse(isoEndTime)
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

function computeBarWidth(xScale, d, mouseX, antiScaleFactor) {
    const barWidth = xScale(d.end_time) - xScale(d.start_time);

    // Check if the bar is within the mouse window
    if (xScale(d.start_time) <= mouseX + halfWindowSize && xScale(d.start_time) + barWidth >= mouseX - halfWindowSize) {
        return barWidth * scaleFactor;
    } else {
        return barWidth * antiScaleFactor > 0 ? barWidth * antiScaleFactor : 0;
    }
}

function isBarWithinMouseWindow(barX, barWidth, mouseX, halfWindowSize) {
    return barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize;
}

function updateDiagram(mouseX, xScale, node2, nodes, svg3, height3, yScale3, node3, link, curve, scaleFactor) {

    node2.attr('opacity', function (d) {
        const barX = xScale(d.start_time);
        const barWidth = xScale(d.end_time) - barX;
        return isBarWithinMouseWindow(barX, barWidth, mouseX, halfWindowSize) ? 1.0 : 0.2;
    });

    const lastScaledNodeX = nodesInWindow.length !== 0 ? xScale(d3.max(nodesInWindow, d => d.end_time)) : 0;
    const firstScaledNodeX = nodesInWindow.length !== 0 ? xScale(d3.min(nodesInWindow, d => d.start_time)) : 0;
    const diagramLength = xScale(d3.max(nodes, d => d.end_time))
    const scaledAreaLength = ((lastScaledNodeX - firstScaledNodeX) * scaleFactor)
    const unscaledAreaLength = diagramLength - (lastScaledNodeX - firstScaledNodeX)
    const antiScaledAreaLength = diagramLength - scaledAreaLength
    const antiScaleFactor = (antiScaledAreaLength) / unscaledAreaLength
    const beforeAreaLength = firstScaledNodeX * antiScaleFactor
    const adaptedXBeforeWindow = firstScaledNodeX - (firstScaledNodeX - beforeAreaLength)
    const adaptedXAfterWindow = firstScaledNodeX * antiScaleFactor + scaledAreaLength

    node3
        .attr('transform', d => `translate(${determineXValue(xScale, d, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX)}, ${yScale3(d.speaker)})`)
        .attr('opacity', function (d) {
            const barX = xScale(d.start_time);
            const barWidth = xScale(d.end_time) - barX;
            return isBarWithinMouseWindow(barX, barWidth, mouseX, halfWindowSize) ? 1.0 : 0.2;
        });
    node3.select('.line-connector')
        .attr('x1', d => computeBarWidth(xScale, d, mouseX, antiScaleFactor) / 2)
        .attr('x2', d => computeBarWidth(xScale, d, mouseX, antiScaleFactor) / 2);
    node3.select('.node')
        .attr('width', d => computeBarWidth(xScale, d, mouseX, antiScaleFactor))


    link
        .attr('d', d => {
            let pathData
            let adapt_y = d.text_additional === "Default Conflict" ? yScale3.bandwidth() + 10 : -10
            let adapt_start_y = d.text_additional === "Default Conflict" ? yScale3.bandwidth() : 0
            let barWidth1 = computeBarWidth(xScale, d.source, mouseX, antiScaleFactor)
            let barWidth2 = computeBarWidth(xScale, d.target, mouseX, antiScaleFactor)
            let xMid1 = (determineXValue(xScale, d.source, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX)) + barWidth1 / 2
            let xMid2 = (determineXValue(xScale, d.target, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX)) + barWidth2 / 2
            let yMid1 = yScale3(d.source.speaker) + adapt_y;
            let yMid2 = yScale3(d.target.speaker) + adapt_y;
            pathData = [
                [xMid1, yScale3(d.source.speaker) + adapt_start_y],
                [xMid1, yMid1],
                [xMid2, yMid2],
                [xMid2, yScale3(d.target.speaker) + adapt_y]
            ];
            return curve(pathData);
        })
        .attr('visibility', d => {
            const sourceX = determineXValue(xScale, d.source, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);
            const targetX = determineXValue(xScale, d.target, mouseX, adaptedXBeforeWindow, firstScaledNodeX, antiScaleFactor, adaptedXAfterWindow, lastScaledNodeX);
            return sourceX >= adaptedXBeforeWindow && targetX <= adaptedXAfterWindow ? 'visible' : 'hidden'
        })

    svg3.selectAll('.node').attr('stroke', 'none');

    let yPosition = 0;
    let textArray = nodesInWindow ? nodesInWindow.map(d => d.text) : [];

    svg3.selectAll('.hover-box text')
        .style('visibility', function () {
            return textArray.includes(this.textContent) ? 'visible' : 'hidden';
        })
        .filter(function () {
            return d3.select(this).style('visibility') !== 'hidden';
        })
        .attr('y', (d, index) => yPosition + 20 + index * 15);
    if (nodesInWindow.length === 0) {
        node2.attr('opacity', 1.0)
        node3.attr('opacity', 1.0)
        link.attr('opacity', 1.0)
        link.attr('visibility', 'visible')
        svg3.selectAll('.hover-box text').style('visibility', 'visible')
    }
}

function addTextBox(width3, svg3, nodes, textHovered3, links, link) {
    let yPosition = 0
    let xPosition = width3 + 10;
    let hoverBox = svg3.append('g').attr('class', 'hover-box');
    let textArray = nodes.map(d => d.text)
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
                let associatedLinks = links.filter(link => link.source.text === text);
                associatedLinks = associatedLinks.filter(d => ['Default Inference', 'Default Rephrase', 'Default Conflict'].includes(d.text_additional))
                textArray.forEach((t, i) => {
                    link.attr('opacity', 0.2);
                    svg3.selectAll('.node').attr('stroke', 'none');
                    const linkColor = associatedLinks.find(link => link.target.text === t)?.text_additional;
                    const color = getLinkColor(linkColor)
                    svg3.select(`#hovered-text-${i}`).style('fill', color);
                });
                link.filter(l => l.source.text === text)
                    .attr('stroke', d => getLinkColor(d.text_additional))
                    .attr('marker-start', d => {
                        return getArrowHeadColor(d.text_additional)
                    }).attr('opacity', 1.0);
                const hoveredNode = svg3.selectAll('.node').filter(node => node.text === text);
                hoveredNode.attr('stroke', 'black')
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
    hoverBox.insert('rect', 'text')
        .attr('class', ".hover-box")
        .attr('y', yPosition)
        .attr('x', xPosition)
        .attr('width', Math.min(bbox.width + 10, 1200))
        .attr('height', Math.min(bbox.height + 10, 478))
        .style('overflow-y', 'auto')
        .style('fill', 'whitesmoke')
        .style('stroke', 'black')
        .style('cursor', 'pointer')
        .on('mouseover', function () {
            textHovered3 = true;
        })
    return textHovered3;
}

function findNodesToShowText(nodes, xScale) {
    const nodesToShowText = [];
    let lastNodeX = 0; // Declare lastNodeX here

    nodes.forEach(function (d, i) {
        const barX = xScale(d.start_time);

        if (barX >= lastNodeX + halfWindowSize || xScale(d.end_time) - barX > halfWindowSize) {
            nodesToShowText[i] = true;
            lastNodeX = barX;
        } else {
            nodesToShowText[i] = false;
        }
    });
    return nodesToShowText;
}

