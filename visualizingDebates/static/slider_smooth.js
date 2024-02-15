const scaleFactor = 8;
const smallerScaleFactor = scaleFactor / 2;
const smallestScaleFactor = scaleFactor / 4;
const halfWindowSize = 30;
let currentTime = 0;
let textBoxWidth = 1000
let colorScale = null

let prevNodesInWindow = null
let nodesInWindow = null
let nodesFarLeftOfWindow = [];
let nodesLeftOfWindow = [];
let nodesRightOfWindow = [];
let nodesFarRightOfWindow = [];

function groupNodes(nodes, xScale, mouseX) {
    nodesInWindow = []
    nodesFarLeftOfWindow = [];
    nodesLeftOfWindow = [];
    nodesRightOfWindow = [];
    nodesFarRightOfWindow = [];
    nodes.forEach(function (d) {
        const barX = xScale(d.start_time);
        const barWidth = xScale(d.end_time) - barX
        if (barX <= mouseX + halfWindowSize && barX + barWidth >= mouseX - halfWindowSize) {
            nodesInWindow.push(d)
        } else if (barX + barWidth >= mouseX - 3 * halfWindowSize && barX < mouseX - 2 * halfWindowSize) {
            nodesFarLeftOfWindow.push(d)
        } else if (barX + barWidth >= mouseX - 2 * halfWindowSize && barX < mouseX - halfWindowSize) {
            nodesLeftOfWindow.push(d)
        } else if (barX < mouseX + 2 * halfWindowSize && barX + barWidth >= mouseX + halfWindowSize) {
            nodesRightOfWindow.push(d)
        } else if (barX < mouseX + 3 * halfWindowSize && barX + barWidth >= mouseX + 2 * halfWindowSize) {
            nodesFarRightOfWindow.push(d)
        }
    })
}

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
        .attr('x', -2 * halfWindowSize)
        .attr('stroke', 'white')
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
            if (isDragging) {
                videoplayer.pause()
                const mouseX = d3.pointer(event)[0];
                mouseRectangle
                    .attr('x', mouseX - halfWindowSize)
                    .attr('opacity', 0.5);

                groupNodes(nodes, xScale, mouseX);

                if (!(prevNodesInWindow && (nodesInWindow[0] === prevNodesInWindow[0] && nodesInWindow[nodesInWindow.length - 1] === prevNodesInWindow[prevNodesInWindow.length - 1]))) {
                    updateDiagram(mouseX, xScale, node2, nodes, svg3, height3, yScale3, node3, link, curve, scaleFactor, width3, links);
                }
                prevNodesInWindow = nodesInWindow
            }
        }
    )
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
    videoplayer.addEventListener('timeupdate', function () {
        const currentTimeVid = xScale(new Date(nodes[0].start_time.getTime() + videoplayer.currentTime * 1000))

        groupNodes(nodes, xScale, currentTimeVid)
        mouseRectangle
            .attr('x', currentTimeVid - halfWindowSize)
            .attr('opacity', 0.5);
        if (!(prevNodesInWindow && (nodesInWindow[0] === prevNodesInWindow[0] && nodesInWindow[nodesInWindow.length - 1] === prevNodesInWindow[prevNodesInWindow.length - 1]))) {
            updateDiagram(currentTimeVid, xScale, node2, nodes, svg3, height3, yScale3, node3, link, curve, scaleFactor, width3, links);
            prevNodesInWindow = nodesInWindow
        }
        currentTime = xScale(new Date(nodes[0].start_time.getTime() + videoplayer.currentTime * 1000))
    });

//--------------------------------------------------------------------

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
    /*node3.append('line')
        .attr('class', 'line-connector')
        .attr('x1', d => (xScale(d.end_time) - xScale(d.start_time)) / 2)
        .attr('y1', -10)
        .attr('x2', d => (xScale(d.end_time) - xScale(d.start_time)) / 2)
        .attr('y2', yScale3.bandwidth() + 10)
        .attr('stroke', d => colorScale3(d.speaker));*/
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
        .attr('stroke', 'gray')
        .attr('stroke-dasharray', '5,5')
        .attr('visibility', (d, i) => nodesToShowText[i] ? 'visible' : 'hidden');
    node3.append('text')
        .attr('class', 'bar-text')
        .attr('x', 0)
        .attr('y', d => height3 - yScale3(d.speaker) + 10)
        .text(d => d3.timeFormat('%H:%M:%S')(d.start_time))
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('visibility', (d, i) => nodesToShowText[i] ? 'visible' : 'hidden')
        .attr('fill', 'white');

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
            let adapt_y = d.text_additional === "Default Conflict" ? yScale3.bandwidth() + 15 : -10
            let adapt_start_y = d.text_additional === "Default Conflict" ? yScale3.bandwidth() : 0
            let xMid = (xScale(d.source.start_time) + xScale(d.target.start_time)) / 2;
            let yMid1 = yScale3(d.source.speaker) + adapt_y;
            let yMid2 = yScale3(d.target.speaker) + adapt_y;
            pathData = [
                [(xScale(d.source.start_time) + (xScale(d.source.end_time) - xScale(d.source.start_time)) / 2), yScale3(d.source.speaker) + adapt_start_y],
                [xMid, yMid1],
                [xMid, yMid2],
                [(xScale(d.target.start_time) + (xScale(d.target.end_time) - xScale(d.target.start_time)) / 2), yScale3(d.target.speaker) + adapt_start_y]
            ]
            return curve(pathData);
        })
    addTextBox(width3, svg3, nodes, links, link);

    node3.on('mouseover', (event, d) => {
        let textArray = nodesInWindow ? nodesInWindow.map(d => d.transcript_text) : []

        svg3.selectAll('.node').attr('stroke', 'none');

        let associatedLinks = links.filter(link => link.source.transcript_text === d.transcript_text);
        associatedLinks = associatedLinks.filter(d => ['Default Inference', 'Default Rephrase', 'Default Conflict'].includes(d.text_additional))

        textArray.forEach((t) => {
            link.attr('opacity', 0.2);
            svg3.selectAll('.node').attr('stroke', 'none');
            const isConnected = associatedLinks.some(link => link.target.transcript_text === t);
            const linkColor = associatedLinks.find(link => link.target.transcript_text === t)?.text_additional;
            const color = isConnected ? getLinkColor(linkColor) : 'white';
            const hoveredTextElement = svg3.selectAll('.hover-box text').filter(function () {
                return this.textContent === t;
            });
            hoveredTextElement
                .style('fill', color)
                .style('font-weight', 'normal');
        });
        const hoveredTextElement = svg3.selectAll('.hover-box text').filter(function () {
            return this.textContent === d.transcript_text;
        });
        hoveredTextElement.style('font-weight', 'bold');

        d3.select(event.currentTarget)
            .selectAll('.node')
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
    })

    node3.on('click', (event, d) => {
        let videoplayer = document.getElementById('videoPlayer')
        groupNodes(nodes, xScale, d.start_time)
        currentTime = (d.start_time.getTime() - nodes[0].start_time.getTime()) / 1000
        videoplayer.currentTime = currentTime
        //videoplayer.play();
    })

    svg3.append('defs').append('marker')
        .attr('class', 'arrowhead')
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
        .attr('class', 'arrowhead')
        .attr('id', 'arrowhead-violet')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 9)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 3)
        .attr('markerHeight', 4)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'violet');
    svg3.append('defs').append('marker')
        .attr('class', 'arrowhead')
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
}

function determineXValue2(xScale, d, mouseX, defaultXValues, adaptedXValues, antiScaleFactor) {
    const barX = xScale(d.start_time);
    const barWidth = xScale(d.end_time) - barX;
    if (barX < defaultXValues[0]) {
        return barX * antiScaleFactor
    } else if (barX + barWidth >= defaultXValues[0] && barX < defaultXValues[1]) {
        return adaptedXValues[0] + (barX - defaultXValues[0]) * smallestScaleFactor
    } else if (barX + barWidth >= defaultXValues[1] && barX < defaultXValues[2]) {
        return adaptedXValues[1] + (barX - defaultXValues[1]) * smallerScaleFactor
    } else if (barX <= defaultXValues[3] && barX + barWidth >= defaultXValues[2]) {
        return adaptedXValues[2] + (barX - defaultXValues[2]) * scaleFactor
    } else if (barX < defaultXValues[4] && barX + barWidth >= defaultXValues[3]) {
        return adaptedXValues[3] + (barX - defaultXValues[3]) * smallerScaleFactor
    } else if (barX < defaultXValues[5] && barX + barWidth >= defaultXValues[4]) {
        return adaptedXValues[4] + (barX - defaultXValues[4]) * smallestScaleFactor
    } else {
        return adaptedXValues[5] + (barX - defaultXValues[5]) * antiScaleFactor
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
            return 'white';
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
        d.start_time = new Date(d.part_time)
        d.end_time = new Date(d.end_part_time)
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
    colorScale = d3.scaleOrdinal().domain(domain).range(d3.schemeCategory10)
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

function computeBarWidth2(xScale, d, defaultXValues, antiScaleFactor) {
    const barX = xScale(d.start_time);
    const barWidth = xScale(d.end_time) - barX;
    if (barX < defaultXValues[0]) {
        return barWidth * antiScaleFactor
    } else if (barX + barWidth >= defaultXValues[0] && barX < defaultXValues[1]) {
        return barWidth * smallestScaleFactor
    } else if (barX + barWidth >= defaultXValues[1] && barX < defaultXValues[2]) {
        return barWidth * smallerScaleFactor
    } else if (barX < defaultXValues[3] && barX + barWidth >= defaultXValues[2]) {
        return barWidth * scaleFactor
    } else if (barX < defaultXValues[4] && barX + barWidth >= defaultXValues[3]) {
        return barWidth * smallerScaleFactor
    } else if (barX < defaultXValues[5] && barX + barWidth >= defaultXValues[4]) {
        return barWidth * smallestScaleFactor
    } else {
        return barWidth * antiScaleFactor
    }
}

function updateDiagram(mouseX, xScale, node2, nodes, svg3, height3, yScale3, node3, link, curve, scaleFactor, width3, links) {

    const firstScaledNodeX = nodesInWindow.length !== 0 ? xScale(nodesInWindow[0].start_time) : 0;
    const firstScaledNodeXLeft = nodesLeftOfWindow.length !== 0 ? xScale(nodesLeftOfWindow[0].start_time) : 0;
    const firstScaledNodeXFarLeft = nodesFarLeftOfWindow.length !== 0 ? xScale(nodesFarLeftOfWindow[0].start_time) : 0;
    const firstScaledNodeXRight = nodesRightOfWindow.length !== 0 ? xScale(nodesRightOfWindow[0].start_time) : 0;
    const firstScaledNodeXFarRight = nodesFarRightOfWindow.length !== 0 ? xScale(nodesFarRightOfWindow[0].start_time) : 0;
    const lastScaledNodeXFarRight = nodesFarRightOfWindow.length !== 0 ? xScale(nodesFarRightOfWindow[nodesFarRightOfWindow.length - 1].end_time) : 0;

    const farLeftLength = (firstScaledNodeXLeft - firstScaledNodeXFarLeft) * smallestScaleFactor
    const leftLength = (firstScaledNodeX - firstScaledNodeXLeft) * smallerScaleFactor
    const windowLength = (firstScaledNodeXRight - firstScaledNodeX) * scaleFactor
    const rightLength = (firstScaledNodeXFarRight - firstScaledNodeXRight) * smallerScaleFactor
    const farRightLength = (lastScaledNodeXFarRight - firstScaledNodeXFarRight) * smallestScaleFactor

    const diagramLength = xScale(d3.max(nodes, d => d.end_time))
    const unscaledAreaLength2 = diagramLength - (lastScaledNodeXFarRight - firstScaledNodeXFarLeft)
    const antiScaledAreaLength2 = diagramLength - (farLeftLength + leftLength + windowLength + rightLength + farRightLength)
    const antiScaleFactor2 = antiScaledAreaLength2 / unscaledAreaLength2
    const antiScaledAreaLengthLeft = firstScaledNodeXFarLeft * antiScaleFactor2

    const adaptedFirstXFarLeft = antiScaledAreaLengthLeft
    const adaptedFirstXLeft = adaptedFirstXFarLeft + farLeftLength
    const adaptedFirstX = adaptedFirstXLeft + leftLength
    const adaptedFirstXRight = adaptedFirstX + windowLength
    const adaptedFirstXFarRight = adaptedFirstXRight + rightLength
    const adaptedFirstXAreaAfter = adaptedFirstXFarRight + farRightLength
    const defaultXValues = [firstScaledNodeXFarLeft, firstScaledNodeXLeft, firstScaledNodeX, firstScaledNodeXRight, firstScaledNodeXFarRight, lastScaledNodeXFarRight]
    const adaptedXValues = [adaptedFirstXFarLeft, adaptedFirstXLeft, adaptedFirstX, adaptedFirstXRight, adaptedFirstXFarRight, adaptedFirstXAreaAfter]

    node2.attr('opacity', function (d) {
        const barX = xScale(d.start_time);
        return barX < firstScaledNodeXRight && barX >= firstScaledNodeX ? 1.0 : 0.2
    });

    node3
        .attr('transform', d => `translate(${determineXValue2(xScale, d, mouseX, defaultXValues, adaptedXValues, antiScaleFactor2)}, ${yScale3(d.speaker)})`)
        .attr('opacity', function (d) {
            const barX = xScale(d.start_time);
            return barX < firstScaledNodeXRight && barX >= firstScaledNodeX ? 1.0 : 0.2
        });
    node3.select('.line-connector')
        .attr('x1', d => computeBarWidth2(xScale, d, defaultXValues, antiScaleFactor2) / 2)
        .attr('x2', d => computeBarWidth2(xScale, d, defaultXValues, antiScaleFactor2) / 2)
    node3.select('.node')
        .attr('width', d => computeBarWidth2(xScale, d, defaultXValues, antiScaleFactor2))

    link
        .attr('d', d => {
            let pathData
            let adapt_y = d.text_additional === "Default Conflict" ? yScale3.bandwidth() + 15 : -10
            let adapt_start_y = d.text_additional === "Default Conflict" ? yScale3.bandwidth() : 0
            let barWidth1 = computeBarWidth2(xScale, d.source, defaultXValues, antiScaleFactor2)
            let barWidth2 = computeBarWidth2(xScale, d.target, defaultXValues, antiScaleFactor2)
            let xMid1 = (determineXValue2(xScale, d.source, mouseX, defaultXValues, adaptedXValues, antiScaleFactor2)) + barWidth1 / 2
            let xMid2 = (determineXValue2(xScale, d.target, mouseX, defaultXValues, adaptedXValues, antiScaleFactor2)) + barWidth2 / 2
            determineXValue2(xScale, d, mouseX, defaultXValues, adaptedXValues, antiScaleFactor2)
            let yMid1 = yScale3(d.source.speaker) + adapt_y;
            let yMid2 = yScale3(d.target.speaker) + adapt_y;
            pathData = [
                [xMid1, yScale3(d.source.speaker) + adapt_start_y],
                [xMid1, yMid1],
                [xMid2, yMid2],
                [xMid2, yScale3(d.target.speaker) + adapt_start_y]
            ];
            return curve(pathData);
        })
        .attr('visibility', d => {
            const sourceX = determineXValue2(xScale, d.source, mouseX, defaultXValues, adaptedXValues, antiScaleFactor2);
            const targetX = determineXValue2(xScale, d.target, mouseX, defaultXValues, adaptedXValues, antiScaleFactor2);
            return sourceX >= adaptedFirstX && targetX <= adaptedFirstXRight ? 'visible' : 'hidden'
        })
    svg3.selectAll('.hover-box').remove()
    addTextBox(width3, svg3, nodes, links, link);

    svg3.selectAll('.node').attr('stroke', 'none');

    if (nodesInWindow.length === 0) {
        node2.attr('opacity', 1.0)
        node3.attr('opacity', 1.0)
        link.attr('opacity', 1.0)
        link.attr('visibility', 'visible')
        svg3.selectAll('.hover-box text').style('visibility', 'visible')
    }
}

function textHoverAction(links, transcript_text, textArray, link, svg3, newText) {
    let associatedLinks = links.filter(link => link.source.transcript_text === transcript_text);
    associatedLinks = associatedLinks.filter(d => ['Default Inference', 'Default Rephrase', 'Default Conflict'].includes(d.text_additional))
    link.attr('opacity', 0.2);
    svg3.selectAll('.node').attr('stroke', 'none');
    textArray.forEach((t, i) => {
        const linkColor = associatedLinks.find(link => link.target.transcript_text === t)?.text_additional;
        const color = getLinkColor(linkColor)
        if (color !== "white") {
            svg3.select(`#hovered-text-${i}`).style('fill', color);
        }
    });
    link.filter(l => l.source.transcript_text === transcript_text)
        .attr('stroke', d => getLinkColor(d.text_additional))
        .attr('marker-start', d => {
            return getArrowHeadColor(d.text_additional)
        }).attr('opacity', 1.0);
    const hoveredNode = svg3.selectAll('.node').filter(node => node.transcript_text === transcript_text);
    hoveredNode.attr('stroke', 'black')
        .attr('stroke-width', 2);
    textArray.forEach((t, i) => {
        if (t !== transcript_text) {
            svg3.select(`#hovered-text-${i}`).style('font-weight', 'normal');
        }
    });
    newText.style('font-weight', 'bold');
}

function addTextBox(width3, svg3, nodes, links, link) {
    let yPosition = 0
    let xPosition = width3 + 10;
    let hoverBox = svg3.append('g').attr('class', 'hover-box');
    let textArray;
    if (nodesInWindow) {
        textArray = nodesInWindow.map(d => d.transcript_text)
    } else {
        textArray = nodes.map(d => d.transcript_text)
    }
    let defaultX = width3 + 25
    let maxNumOfLetters = 100
    let previousX = defaultX;
    let yValue = 1.2
    let numberOfCharsInLine = 0;
    let previousSpeaker = null
    let background = null
    let prevBoxy = 0
    let small_margin = 5
    textArray.filter(x => x !== "").forEach(function (transcript_text, index) {
        let prevCutIndex = 0
        let finished = false
        let node = nodes.find(node => node.transcript_text === transcript_text)
        let speaker = node.speaker
        if (speaker !== previousSpeaker) {
            if (previousSpeaker !== null) {
                yValue += 2.4
            }
            hoverBox.append('text').text(speaker).attr('y', yValue + "em").attr('fill', "white").attr('x', defaultX - 10).style('font-weight', 'bold').on("wheel", scrollText)
            if (background !== null) {
                let backgroundHeight = yValue - prevBoxy;
                background.attr('height', (backgroundHeight - 1.5) + "em")
            }
            background = hoverBox.insert('rect').attr('x', defaultX - 5).attr('y', (yValue + 0.5) + "em").attr('width', textBoxWidth).style('fill', colorScale(speaker)).attr('opacity', 0.2).on("wheel", scrollText);
            prevBoxy = yValue + 1.0
            previousX = defaultX
            yValue += 1.4
            numberOfCharsInLine = 0
            previousSpeaker = speaker

        }

        let newText = hoverBox.append('text');

        if (numberOfCharsInLine + transcript_text.length > maxNumOfLetters) {
            newText.attr('y', yValue + "em").attr('id', `hovered-text-${index}`).attr('fill', "white").attr('x', previousX)
            prevCutIndex = 0
            let firstCut = true
            while (!finished) {
                let lastCutIndex = Math.min(prevCutIndex + maxNumOfLetters - numberOfCharsInLine, transcript_text.length)
                let tspanTextPart = transcript_text.substring(prevCutIndex, lastCutIndex)
                if (transcript_text.length - prevCutIndex > maxNumOfLetters - numberOfCharsInLine) {
                    let lastWhitespace = tspanTextPart.lastIndexOf(' ');
                    if (lastWhitespace !== -1) {
                        tspanTextPart = tspanTextPart.substring(0, lastWhitespace)
                        prevCutIndex += lastWhitespace
                        numberOfCharsInLine = maxNumOfLetters
                    } else {
                        tspanTextPart = ""
                        numberOfCharsInLine = maxNumOfLetters
                    }
                } else {
                    prevCutIndex = lastCutIndex
                    numberOfCharsInLine += tspanTextPart.length
                }
                let tspanPart = newText.append('tspan').text(tspanTextPart)
                if (!firstCut && tspanTextPart !== "") {
                    previousX = defaultX
                    tspanPart.attr('dy', "1.2em")
                    yValue += 1.2
                }
                if (numberOfCharsInLine >= maxNumOfLetters) {
                    numberOfCharsInLine -= maxNumOfLetters
                }
                tspanPart.attr('x', previousX);
                previousX += tspanPart.node().getComputedTextLength() + small_margin
                finished = prevCutIndex === transcript_text.length
                firstCut = false
            }
        } else {
            newText.attr('y', yValue + "em").attr('x', previousX).attr('id', `hovered-text-${index}`).attr('fill', "white").text(transcript_text)
            numberOfCharsInLine += transcript_text.length
            previousX += newText.node().getComputedTextLength() + small_margin

        }
        newText.on("mouseover", function () {
            textHoverAction(links, transcript_text, textArray, link, svg3, newText);
        }).on('mouseout', function () {
            textArray.forEach((t, i) => {
                svg3.select(`#hovered-text-${i}`)
                    .style('fill', 'white');
            });
            newText.style('font-weight', 'normal');
            svg3.selectAll('.node').attr('stroke', 'none');
        }).on("wheel", scrollText)
    })
    if (background !== null) {
        background.attr('height', (yValue - prevBoxy + 1.2) + "em")
    }

    let bbox = hoverBox.node().getBBox();
    hoverBox.insert('rect', 'text')
        .attr('class', ".hover-box")
        .attr('y', yPosition)
        .attr('id', "hover-box")
        .attr('x', xPosition)
        .attr('width', Math.min(bbox.width + 10, 1200))
        .attr('height', Math.min(bbox.height + 10, 478))
        .style('overflow-y', 'auto')
        .style('fill', '#282c34')
        .style('stroke', 'white')
        .style('cursor', 'pointer')
        .on("wheel", scrollText)
}

function findNodesToShowText(nodes, xScale) {
    const nodesToShowText = [];
    let lastNodeX = 0;

    nodes.forEach(function (d, i) {
        const barX = xScale(d.start_time);

        if (barX >= lastNodeX + halfWindowSize * 2.5 || xScale(d.end_time) - barX > halfWindowSize * 2.5) {
            nodesToShowText[i] = true;
            lastNodeX = barX;
        } else {
            nodesToShowText[i] = false;
        }
    });
    return nodesToShowText;
}

function scrollText(event) {
    event.preventDefault()
    const hoverBox = d3.select(".hover-box");
    const allTexts = hoverBox.selectAll('text');
    const allRects = hoverBox.selectAll('rect');
    const scroll = event.deltaY > 0 ? -1 : 1;
    const lastText = allTexts.filter(':last-child');
    const lastTextY = parseFloat(lastText.attr('y'));
    const firstText = d3.select(allTexts.nodes()[0]);
    const firstTextY = parseFloat(firstText.attr('y'));
    if ((lastTextY > 27 || scroll === 1) && (firstTextY < 1 || scroll === -1)) {//TODO hardcoded
        function updateElementY(selection) {
            selection.each(function () {
                if (d3.select(this).attr('id') !== 'hover-box') {
                    const currentY = parseFloat(d3.select(this).attr("y"));
                    const newY = currentY + scroll;
                    d3.select(this).attr('y', newY + "em");
                }
            });
        }
        updateElementY(allTexts);
        updateElementY(allRects);
    }
}
