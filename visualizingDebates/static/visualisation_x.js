const SCALE_FACTOR = 8;
const SMALLER_SCALE_FACTOR = SCALE_FACTOR / 2;
const SMALLEST_SCALE_FACTOR = SCALE_FACTOR / 4;
let antiScaleFactor
const HALF_WINDOW_SIZE = 30;
const SCREEN_WIDTH = window.screen.width;
const SCREEN_HEIGHT = window.screen.height;
const TEXT_BOX_WIDTH = SCREEN_WIDTH / 2
const TIME_FORMAT = d3.timeFormat('%H:%M:%S')

let currentTime = 0;
let colorScale = null
let prevNodesInWindow = null
let nodesInWindow = null
let nodesFarLeftOfWindow = [];
let nodesLeftOfWindow = [];
let nodesRightOfWindow = [];
let nodesFarRightOfWindow = [];
let xScale = null
let yScale
let radius
let nodeData
let linkData
let nodes
let nodes_slider
let links
let textBox
let ticks

let transcript
let topicBubbles
let timeline
let slider
let videoplayer = document.getElementById('videoPlayer')
let font_size = 16

let timelineMargins = {top: 20, right: 20, bottom: 40, left: 60};
let timelineWidth = SCREEN_WIDTH - timelineMargins.left - timelineMargins.right;
let timelineHeight = SCREEN_HEIGHT / 3 - timelineMargins.top - timelineMargins.bottom;
let sliderMargins = {top: 20, right: 20, bottom: 40, left: 60};
let sliderWidth = SCREEN_WIDTH - sliderMargins.left - sliderMargins.right;
let sliderHeight = SCREEN_HEIGHT / 8 - sliderMargins.top - sliderMargins.bottom;
let transcriptMargins = {top: 20, right: 20, bottom: 40, left: 60};
let transcriptWidth = SCREEN_WIDTH / 2
let transcriptHeight = SCREEN_HEIGHT / 3
let topicBubbleMargins = {top: 20, right: 20, bottom: 40, left: 60};
let topicBubbleWidth = SCREEN_WIDTH / 3
let topicBubbleHeight = SCREEN_HEIGHT / 3

let curve = d3.line()
    .curve(d3.curveBasis);


function createSlidingTimeline(graphData) {

    const topicData = Object.values(graphData["topics"]);
    nodeData = graphData.nodes;
    linkData = graphData.links;

    parseTimeData();
    let speakers = Array.from(new Set(nodeData.map(function (d) {
        return d.speaker;
    })));
    xScale = d3.scaleTime()
        .domain([d3.min(nodeData, function (d) {
            return d.start_time;
        }), d3.max(nodeData, function (d) {
            return d.end_time;
        }),])
        .range([0, sliderWidth]);
    let colorScale = createColorScale(speakers);


    createSlider(speakers, colorScale)
    addVideoPlayerInteraction()
    createTimeline(speakers)
    createTranscript()
    createTopicBubbles(topicData)
}


function createSliderAxis(yScaleSlider) {
    let xAxis2 = d3.axisBottom(xScale).tickFormat(TIME_FORMAT);
    slider.append('g')
        .attr('transform', 'translate(0,' + sliderHeight + ')')
        .call(xAxis2);
    let yAxis2 = d3.axisLeft(yScaleSlider);
    slider.append('g')
        .call(yAxis2);
}

function createSlider(speakers, colorScale) {
    slider = createSVG('#slider', sliderWidth, sliderHeight, sliderMargins);

    let yScaleSlider = d3.scaleBand().domain(speakers).range([sliderHeight, 0]).padding(0.1);
    createSliderAxis(yScaleSlider);
    nodes_slider = createSliderNodes(colorScale, yScaleSlider);
    slider.append('rect')
        .attr('class', 'mouse-rectangle')
        .attr('width', 2 * HALF_WINDOW_SIZE)
        .attr('height', sliderHeight)
        .attr('fill', 'transparent')
        .attr('opacity', 1)
        .attr('x', -2 * HALF_WINDOW_SIZE)
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
    addSliderInteraction()
}

function addSliderInteraction() {
    let isDragging = false;
    slider.on('mousedown', function () {
        isDragging = true;
    });
    d3.select('body').on('mouseup', function () {
        if (isDragging) {
            isDragging = false;
        }
    });
    slider.on('mousemove', function (event) {
        if (isDragging) {
            videoplayer.pause()
            const mouseX = d3.pointer(event)[0];
            moveSlider(mouseX)
        }
    }).on("click", function (event) {
        videoplayer.pause()
        const mouseX = d3.pointer(event)[0];
        moveSlider(mouseX)
    })
}

function addVideoPlayerInteraction() {
    videoplayer.addEventListener('timeupdate', function () {
        const currentTimeVid = xScale(new Date(nodeData[0].start_time.getTime() + videoplayer.currentTime * 1000))
        moveSlider(currentTimeVid)
    });
}

function moveSlider(xValue) {
    let mouseRectangle = slider.select(".mouse-rectangle")
    mouseRectangle
        .attr('x', xValue - HALF_WINDOW_SIZE)
        .attr('opacity', 0.5);
    groupNodes(xValue)
    if (!(prevNodesInWindow && (nodesInWindow[0] === prevNodesInWindow[0] && nodesInWindow[nodesInWindow.length - 1] === prevNodesInWindow[prevNodesInWindow.length - 1]))) {
        updateDiagram(xValue, curve);
        prevNodesInWindow = nodesInWindow
    }
    currentTime = xScale(new Date(nodeData[0].start_time.getTime() + videoplayer.currentTime * 1000))
}

function createAxis(yScaleTimeline) {
    let xAxis3 = d3.axisBottom(xScale).ticks(0);
    timeline.append('g')
        .attr('transform', 'translate(0,' + timelineHeight + ')')
        .call(xAxis3);

    let yAxis3 = d3.axisLeft(yScaleTimeline);
    timeline.append('g')
        .call(yAxis3);
}

function createTimeline(speakers) {
    timeline = createSVG('#time', timelineWidth, timelineHeight, timelineMargins);
    yScale = d3.scaleBand()
        .domain(speakers)
        .range([timelineHeight, 0])
        .padding(0.1);

    createAxis(yScale)
    d3.forceSimulation(nodeData).force('link', d3.forceLink(linkData).id(d => d.id).distance(30))
    let curve = d3.line()
        .curve(d3.curveBasis);
    createArrowheadMarker();
    nodes = createNodeGroup(colorScale);
    links = createLinks(curve);
    ticks = createTicks()

    addTimelineInteraction()
}

function addTimelineInteraction() {
    nodes.on('mouseover', (event, d) => {
        hoverAction(event, d)
    }).on('mouseout', (event, d) => {
        unHoverAction(event, d);
    }).on('click', (event, d) => {
        let videoplayer = document.getElementById('videoPlayer')
        groupNodes(d.start_time)
        currentTime = (d.start_time.getTime() - nodeData[0].start_time.getTime()) / 1000
        videoplayer.currentTime = currentTime
    })
}

function createTranscript() {
    transcript = createSVG('#transcript', transcriptWidth, transcriptHeight, transcriptMargins);
    transcript.append("rect", "box")
        .attr('y', -20)
        .attr('x', 0)
        .attr('width', SCREEN_WIDTH / 2 + 20)
        .attr('height', 1 / 3 * SCREEN_HEIGHT + 60)
        .style('overflow-y', 'auto')
        .style('fill', '#282c34')
        .style('stroke', 'white')
        .style('cursor', 'pointer')
        .on("wheel", scrollText)
    addTranscriptText()
}


function groupNodes(mouseX) {
    nodesInWindow = []
    nodesFarLeftOfWindow = [];
    nodesLeftOfWindow = [];
    nodesRightOfWindow = [];
    nodesFarRightOfWindow = [];
    nodeData.forEach(function (d) {
        const barX = xScale(d.start_time);
        const barWidth = xScale(d.end_time) - barX
        if (barX <= mouseX + HALF_WINDOW_SIZE && barX + barWidth >= mouseX - HALF_WINDOW_SIZE) {
            nodesInWindow.push(d)
        } else if (barX + barWidth >= mouseX - 3 * HALF_WINDOW_SIZE && barX < mouseX - 2 * HALF_WINDOW_SIZE) {
            nodesFarLeftOfWindow.push(d)
        } else if (barX + barWidth >= mouseX - 2 * HALF_WINDOW_SIZE && barX < mouseX - HALF_WINDOW_SIZE) {
            nodesLeftOfWindow.push(d)
        } else if (barX < mouseX + 2 * HALF_WINDOW_SIZE && barX + barWidth >= mouseX + HALF_WINDOW_SIZE) {
            nodesRightOfWindow.push(d)
        } else if (barX < mouseX + 3 * HALF_WINDOW_SIZE && barX + barWidth >= mouseX + 2 * HALF_WINDOW_SIZE) {
            nodesFarRightOfWindow.push(d)
        }
    })
}

function appendNodeText(outsideNodes, above) {
    outsideNodes.each(node => {
        let n = timeline.select("#node-" + node.id)
        let x = parseFloat(n.attr("x")) + parseFloat(n.attr("width")) / 2
        let y = above ? yScale(node.speaker) - 5 : yScale(node.speaker) + yScale.bandwidth() + 20
        timeline.append("text")
            .attr("class", 'node-text')
            .attr("x", x)
            .attr("y", y)
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .text(node.text)
    })
}

function appendLinkText(links, sourceNode) {
    links.each(link => {
        let targetNode = timeline.select('#node-' + link.target.id)
        let sourceNodeMidX = parseFloat(sourceNode.attr("x")) + 0.5 * parseFloat(sourceNode.attr("width"))
        let targetNodeMidX = parseFloat(targetNode.attr("x")) + 0.5 * parseFloat(targetNode.attr("width"))
        let midX = sourceNodeMidX + (targetNodeMidX - sourceNodeMidX) / 2
        let sourceNodeY = yScale(sourceNode.data()[0].speaker)
        let targetNodeY = yScale(targetNode.data()[0].speaker)
        let adaptY = link.text_additional === "Default Conflict" ? yScale.bandwidth() + 20 : -15
        let midY = sourceNodeY + (targetNodeY - sourceNodeY) / 2 + adaptY
        //let midY = (yScale(sourceNode.speaker) + yScale(targetNode.speaker)) / 2
        timeline.append("text")
            .attr("class", "link-text")
            .attr("x", midX)
            .attr("y", midY)
            .attr("text-anchor", "middle")
            .attr("font-size", "small")
            .text(link.conn_type)
            .attr("fill", getLinkColor(link.text_additional))
    })
}

function createNodeGroup(colorScale) {
    return timeline.selectAll('.node-group')
        .data(nodeData)
        .enter()
        .append('rect')
        .attr('class', 'node')
        .attr('width', d => xScale(d.end_time) - xScale(d.start_time))
        .attr('height', yScale.bandwidth())
        .attr("x", d => xScale(d.start_time))
        .attr("y", d => yScale(d.speaker))
        .style('fill', d => colorScale(d.speaker))
        .attr("class", "node-group")
        .attr('id', d => 'node-' + d.id);
}

function createTicks() {
    let nodesToShowText = findNodesToShowText()
    let ticks = timeline.selectAll('.ticks')
        .data(nodeData.filter((d, i) => nodesToShowText[i]))
        .enter()
        .append("g")
        .attr("class", "ticks")
        .attr('transform', d => `translate(${xScale(d.start_time)}, ${yScale(d.speaker)})`)
    ticks.append('line')
        .attr('class', 'additional-line')
        .attr('x1', 0)
        .attr('y1', yScale.bandwidth())
        .attr('x2', 0)
        .attr('y2', d => timelineHeight - yScale(d.speaker) + 5)
        .attr('stroke', 'gray')
        .attr('stroke-dasharray', '5,5')
    ticks.append('text')
        .attr('class', 'bar-text')
        .attr('x', 0)
        .attr('y', d => timelineHeight - yScale(d.speaker) + 10)
        .text(d => d3.timeFormat(TIME_FORMAT)(d.start_time))
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', 'white');
    return ticks
}

function createLinks(curve) {
    return timeline.selectAll('.link')
        .data(linkData.filter(d => ['Default Inference', 'Default Rephrase', 'Default Conflict'].includes(d.text_additional)))
        .enter().append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('marker-end', d => getArrowHeadColor(d.text_additional))
        .attr('stroke', d => getLinkColor(d.text_additional))
        .attr('stroke-width', 2)
        .attr('d', d => {
            let pathData
            let adapt_y = d.text_additional === "Default Conflict" ? yScale.bandwidth() + 15 : -10
            let adapt_start_y = d.text_additional === "Default Conflict" ? yScale.bandwidth() : 0
            let xMid = (xScale(d.source.start_time) + xScale(d.target.start_time)) / 2;
            let yMid1 = yScale(d.source.speaker) + adapt_y;
            let yMid2 = yScale(d.target.speaker) + adapt_y;
            pathData = [
                [(xScale(d.source.start_time) + (xScale(d.source.end_time) - xScale(d.source.start_time)) / 2), yScale(d.source.speaker) + adapt_start_y],
                [xMid, yMid1],
                [xMid, yMid2],
                [(xScale(d.target.start_time) + (xScale(d.target.end_time) - xScale(d.target.start_time)) / 2), yScale(d.target.speaker) + adapt_start_y]
            ]
            return curve(pathData);
        })
}

function createArrowheadMarker() {
    timeline.append('defs').append('marker')
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
    timeline.append('defs').append('marker')
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
    timeline.append('defs').append('marker')
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

function determineXValue2(d, mouseX, defaultXValues, adaptedXValues) {
    const barX = xScale(d.start_time);
    const barWidth = xScale(d.end_time) - barX;
    if (barX < defaultXValues[0]) {
        return barX * antiScaleFactor
    } else if (barX + barWidth >= defaultXValues[0] && barX < defaultXValues[1]) {
        return adaptedXValues[0] + (barX - defaultXValues[0]) * SMALLEST_SCALE_FACTOR
    } else if (barX + barWidth >= defaultXValues[1] && barX < defaultXValues[2]) {
        return adaptedXValues[1] + (barX - defaultXValues[1]) * SMALLER_SCALE_FACTOR
    } else if (barX <= defaultXValues[3] && barX + barWidth >= defaultXValues[2]) {
        return adaptedXValues[2] + (barX - defaultXValues[2]) * SCALE_FACTOR
    } else if (barX < defaultXValues[4] && barX + barWidth >= defaultXValues[3]) {
        return adaptedXValues[3] + (barX - defaultXValues[3]) * SMALLER_SCALE_FACTOR
    } else if (barX < defaultXValues[5] && barX + barWidth >= defaultXValues[4]) {
        return adaptedXValues[4] + (barX - defaultXValues[4]) * SMALLEST_SCALE_FACTOR
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

function parseTimeData() {
    nodeData.forEach(function (d) {
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
    return colorScale = d3.scaleOrdinal().domain(domain).range(d3.schemeCategory10)
}

function createSliderNodes(colorScale, yScaleSlider) {
    return slider.selectAll('.node')
        .data(nodeData)
        .enter().append('rect')
        .attr('class', 'node')
        .attr('x', d => xScale(d.start_time))
        .attr('y', d => yScaleSlider(d.speaker))
        .attr('width', d => xScale(d.end_time) - xScale(d.start_time))
        .attr('height', yScaleSlider.bandwidth())
        .style('fill', d => colorScale(d.speaker));
}

function computeBarWidth2(d, defaultXValues) {
    const barX = xScale(d.start_time);
    const barWidth = xScale(d.end_time) - barX;
    if (barX < defaultXValues[0]) {
        return barWidth * antiScaleFactor
    } else if (barX + barWidth >= defaultXValues[0] && barX < defaultXValues[1]) {
        return barWidth * SMALLEST_SCALE_FACTOR
    } else if (barX + barWidth >= defaultXValues[1] && barX < defaultXValues[2]) {
        return barWidth * SMALLER_SCALE_FACTOR
    } else if (barX < defaultXValues[3] && barX + barWidth >= defaultXValues[2]) {
        return barWidth * SCALE_FACTOR
    } else if (barX < defaultXValues[4] && barX + barWidth >= defaultXValues[3]) {
        return barWidth * SMALLER_SCALE_FACTOR
    } else if (barX < defaultXValues[5] && barX + barWidth >= defaultXValues[4]) {
        return barWidth * SMALLEST_SCALE_FACTOR
    } else {
        return barWidth * antiScaleFactor
    }
}

function updatePositions(mouseX, curve) {
    const firstScaledNodeX = nodesInWindow.length !== 0 ? xScale(nodesInWindow[0].start_time) : 0;
    const firstScaledNodeXLeft = nodesLeftOfWindow.length !== 0 ? xScale(nodesLeftOfWindow[0].start_time) : 0;
    const firstScaledNodeXFarLeft = nodesFarLeftOfWindow.length !== 0 ? xScale(nodesFarLeftOfWindow[0].start_time) : 0;
    const firstScaledNodeXRight = nodesRightOfWindow.length !== 0 ? xScale(nodesRightOfWindow[0].start_time) : xScale(nodeData[nodeData.length - 1].end_time);
    const firstScaledNodeXFarRight = nodesFarRightOfWindow.length !== 0 ? xScale(nodesFarRightOfWindow[0].start_time) : xScale(nodeData[nodeData.length - 1].end_time);
    const lastScaledNodeXFarRight = nodesFarRightOfWindow.length !== 0 ? xScale(nodesFarRightOfWindow[nodesFarRightOfWindow.length - 1].end_time) : xScale(nodeData[nodeData.length - 1].end_time);

    const farLeftLength = (firstScaledNodeXLeft - firstScaledNodeXFarLeft) * SMALLEST_SCALE_FACTOR
    const leftLength = (firstScaledNodeX - firstScaledNodeXLeft) * SMALLER_SCALE_FACTOR
    const windowLength = (firstScaledNodeXRight - firstScaledNodeX) * SCALE_FACTOR
    const rightLength = (firstScaledNodeXFarRight - firstScaledNodeXRight) * SMALLER_SCALE_FACTOR
    const farRightLength = (lastScaledNodeXFarRight - firstScaledNodeXFarRight) * SMALLEST_SCALE_FACTOR

    const diagramLength = xScale(d3.max(nodeData, d => d.end_time))
    const unscaledAreaLength2 = diagramLength - (lastScaledNodeXFarRight - firstScaledNodeXFarLeft)
    const antiScaledAreaLength2 = diagramLength - (farLeftLength + leftLength + windowLength + rightLength + farRightLength)
    antiScaleFactor = antiScaledAreaLength2 / unscaledAreaLength2

    const adaptedFirstXFarLeft = firstScaledNodeXFarLeft * antiScaleFactor
    const adaptedFirstXLeft = adaptedFirstXFarLeft + farLeftLength
    const adaptedFirstX = adaptedFirstXLeft + leftLength
    const adaptedFirstXRight = adaptedFirstX + windowLength
    const adaptedFirstXFarRight = adaptedFirstXRight + rightLength
    const adaptedFirstXAreaAfter = adaptedFirstXFarRight + farRightLength
    const defaultXValues = [firstScaledNodeXFarLeft, firstScaledNodeXLeft, firstScaledNodeX, firstScaledNodeXRight, firstScaledNodeXFarRight, lastScaledNodeXFarRight]
    const adaptedXValues = [adaptedFirstXFarLeft, adaptedFirstXLeft, adaptedFirstX, adaptedFirstXRight, adaptedFirstXFarRight, adaptedFirstXAreaAfter]

    nodes_slider.attr('opacity', function (d) {
        const barX = xScale(d.start_time);
        return barX < firstScaledNodeXRight && barX >= firstScaledNodeX ? 1.0 : 0.2
    });
    ticks
        .attr('transform', d => `translate(${determineXValue2(d, mouseX, defaultXValues, adaptedXValues)}, ${yScale(d.speaker)})`)
    nodes
        .attr("x", d => determineXValue2(d, mouseX, defaultXValues, adaptedXValues))
        .attr('width', d => computeBarWidth2(d, defaultXValues))
        .attr('opacity', function (d) {
            const barX = xScale(d.start_time);
            return barX < firstScaledNodeXRight && barX >= firstScaledNodeX ? 1.0 : 0.2
        });
    links
        .attr('d', d => {
            let pathData
            let adapt_y = d.text_additional === "Default Conflict" ? yScale.bandwidth() + 15 : -10
            let adapt_start_y = d.text_additional === "Default Conflict" ? yScale.bandwidth() : 0
            let barWidth1 = computeBarWidth2(d.source, defaultXValues)
            let barWidth2 = computeBarWidth2(d.target, defaultXValues)
            let xMid1 = (determineXValue2(d.source, mouseX, defaultXValues, adaptedXValues)) + barWidth1 / 2
            let xMid2 = (determineXValue2(d.target, mouseX, defaultXValues, adaptedXValues)) + barWidth2 / 2
            let yMid1 = yScale(d.source.speaker) + adapt_y;
            let yMid2 = yScale(d.target.speaker) + adapt_y;
            pathData = [
                [xMid1, yScale(d.source.speaker) + adapt_start_y],
                [xMid1, yMid1],
                [xMid2, yMid2],
                [xMid2, yScale(d.target.speaker) + adapt_start_y]
            ];
            return curve(pathData);
        })
        .attr('opacity', d => {
            let xValue = xScale(d.source.start_time)
            if ((xValue >= defaultXValues[0] && xValue < defaultXValues[1]) || (xValue < defaultXValues[5] && xValue >= defaultXValues[4])) {
                return 0.15
            } else if ((xValue >= defaultXValues[1] && xValue < defaultXValues[2]) || (xValue < defaultXValues[4] && xValue >= defaultXValues[3])) {
                return 0.3
            } else if (xValue <= defaultXValues[3] && xValue >= defaultXValues[2]) {
                return 1.0
            } else {
                return 0
            }
        })
}

function computePath(curve, d) {
    let adapt_y = d.text_additional === "Default Conflict" ? yScale.bandwidth() + 15 : -10
    let adapt_start_y = d.text_additional === "Default Conflict" ? yScale.bandwidth() : 0
    let sourceBarWidth = xScale(d.source.end_time) - xScale(d.source.start_time)
    let targetBarWidth = xScale(d.target.end_time) - xScale(d.target.start_time)
    let xMid1 = xScale(d.source.start_time) + sourceBarWidth / 2;
    let xMid2 = xScale(d.target.start_time) + targetBarWidth / 2;
    let yMid1 = yScale(d.source.speaker) + adapt_y;
    let yMid2 = yScale(d.target.speaker) + adapt_y;
    let pathData = [
        [xMid1, yScale(d.source.speaker) + adapt_start_y],
        [xMid1, yMid1],
        [xMid2, yMid2],
        [xMid2, yScale(d.target.speaker) + adapt_start_y]
    ]
    return curve(pathData);
}

function updateDiagram(mouseX, curve) {
    if (nodesInWindow.length > 0) {
        updatePositions(mouseX, curve);
        textBox.remove()
        addTranscriptText()
    } else {
        nodes_slider.attr('opacity', 1.0)
        nodes.attr('opacity', 1.0).attr('x', d => xScale(d.start_time)).attr('width', d => xScale(d.end_time) - xScale(d.start_time))
        links.attr('opacity', 1.0).attr('d', d => computePath(curve, d))
        ticks.attr('transform', d => `translate(${xScale(d.start_time)}, ${yScale(d.speaker)})`)
    }
    textBox.remove()
    addTranscriptText()
}

function hoverAction(event, d) {
    timeline.select('#node-' + d.id).attr('stroke', 'black').attr('stroke-width', 2);
    transcript.select('#hovered-text-' + d.id).attr('font-weight', 'bold');
    nodesInWindow ? links.filter(l => nodesInWindow.includes(l.source)).attr('opacity', 0.3) : links.attr("opacity", 0.3)
    let outgoingLinks = links.filter(l => l.source.id === d.id)
    appendLinkText(outgoingLinks, timeline.select('#node-' + d.id))
    if (nodesInWindow && !nodesInWindow.map(n => n.id).includes(d.id)) {
        appendNodeText(timeline.select('#node-' + d.id), true)
    }
    outgoingLinks.attr("opacity", 1.0).each(l => {
        let linkType = l.text_additional
        if (nodesInWindow && !nodesInWindow.map(n => n.id).includes(l.target.id)) {
            appendNodeText(timeline.select('#node-' + l.target.id), false)
        }
        transcript.select('#hovered-text-' + l.target.id).attr('fill', getLinkColor(linkType))
    })
    const textBubbles = topicBubbles.selectAll(".topic-bubble")
    textBubbles.each(function () {
        const bubble = d3.select(this);
        const bubbleTexts = bubble.selectAll(".word")
        bubbleTexts.each(function () {
            const text = d3.select(this).text()
            if (d.text.includes(text)) {
                bubble.selectAll(".bubble").transition().attr("fill", "#b794f4").attr('r', radius * 1.2)
            }
        })
    })
}

function unHoverAction(event, d) {
    timeline.select('#node-' + d.id).attr('stroke', 'none');
    transcript.select('#hovered-text-' + d.id).attr('font-weight', 'normal');
    if (nodesInWindow && nodesInWindow.length > 0) {
        links.each(function (d) {
            if (nodesInWindow.includes(d.source)) {
                d3.select(this).attr('opacity', 1.0);
            } else if (nodesRightOfWindow.includes(d.source) || nodesLeftOfWindow.includes(d.source)) {
                d3.select(this).attr('opacity', 0.3);
            } else if (nodesFarRightOfWindow.includes(d.source) || nodesFarLeftOfWindow.includes(d.source)) {
                d3.select(this).attr('opacity', 0.15);
            } else {
                d3.select(this).attr('opacity', 0);
            }
        })
        timeline.selectAll('.node-group').filter(n => !nodesInWindow.includes(n)).attr('opacity', 0.2);
    } else {
        links.attr('opacity', 1.0)
    }
    links.filter(l => l.source.id === d.id).each(l => {
        transcript.select('#hovered-text-' + l.target.id).attr('fill', "white")
    })
    timeline.selectAll('.node-text').remove()
    timeline.selectAll('.link-text').remove()
    topicBubbles.selectAll(".bubble").transition().attr("fill", "transparent").attr('r', radius)
}

function addTranscriptText() {
    textBox = transcript.append('g').attr('class', ".hover-box").attr('id', "hover-box").on("wheel", scrollText)
    let currentX = 10, currentY = 1, prevBoxY = 0, previousSpeaker = null, background = null
    let nodesInTextbox = nodesInWindow && nodesInWindow.length > 0 ? nodesInWindow : nodeData
    nodesInTextbox.forEach(function (node) {
        let text = node.text, words = text.split(/\s/), line = [], speaker = node.speaker, previousX = 0
        if (speaker !== previousSpeaker) {
            previousSpeaker !== null ? currentY += 2.4 : currentY += 0
            textBox.append('text').text(speaker).attr('y', currentY + "em").attr('fill', "white").attr('x', 10).style('font-weight', 'bold')
            background?.attr('height', currentY - prevBoxY + "em")
            background = textBox.append('rect').attr('x', 5).attr('y', (currentY + 0.25) + "em").attr('width', TEXT_BOX_WIDTH).style('fill', colorScale(speaker)).attr('opacity', 0.2)
            currentY += 1.2
            currentX = 10
            prevBoxY = currentY + 1.0
        }
        let textElement = textBox.append("text").attr('id', `hovered-text-${node.id}`).attr("fill", "white").attr("x", currentX).attr("y", currentY + "em").attr("dx", currentX === 10 ? 0 : 5)
            .on("mouseover", event => {
                hoverAction(event, node)
            })
            .on('mouseout', (event) => {
                unHoverAction(event, node)
            })
        let tspan = textElement.append("tspan").attr("x", currentX).attr("y", currentY + "em").attr("dx", currentX === 10 ? 0 : 5)
        previousSpeaker = speaker
        previousX = currentX
        words.forEach(word => {
            line.push(word)
            tspan.text(line.join(" "))
            if (previousX + tspan.node().getComputedTextLength() > TEXT_BOX_WIDTH - 5) {
                line.pop()
                tspan.text(line.join(" "))
                line = [word]
                currentX = 10
                currentY += 1.2
                previousX = 10
                tspan = textElement.append("tspan").attr("x", currentX).attr("y", currentY + "em").text(word)
            }
            currentX = previousX + tspan.node().getComputedTextLength()
        })
    })
    background?.attr('height', (currentY - prevBoxY + 2.4) + "em")
}

function findNodesToShowText() {
    const nodesToShowText = [];
    let lastNodeX = 0;

    nodeData.forEach(function (d, i) {
        const barX = xScale(d.start_time);

        if (barX >= lastNodeX + HALF_WINDOW_SIZE * 2.5 || xScale(d.end_time) - barX > HALF_WINDOW_SIZE * 2.5) {
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
    const allTexts = textBox.selectAll('text');
    const allRects = textBox.selectAll('rect');
    const allTSpans = textBox.selectAll('tspan');
    const scroll = event.deltaY > 0 ? -1 : 1;
    const firstTextY = parseFloat(d3.select(allTexts.nodes()[0]).attr("y"));
    const lastTextY = parseFloat(allTexts.filter(':last-child').attr("y"));
    const max_y = (1 / 3 * SCREEN_HEIGHT) / font_size
    if ((lastTextY > max_y || scroll === 1) && (firstTextY < 1 || scroll === -1)) {
        function updateElementY(selection) {
            selection.each(function () {
                if (d3.select(this).attr('id') !== 'hover-box') {
                    const currentY = parseFloat(d3.select(this).attr("y"));
                    const newY = currentY + scroll;
                    d3.select(this).attr('y', newY + "em");
                }
            });
        }

        updateElementY(allTexts)
        updateElementY(allRects)
        updateElementY(allTSpans)
    }
}

function createTopicBubbles(topicData) {
    topicBubbles = createSVG('#topicBubbles', topicBubbleWidth, topicBubbleHeight, topicBubbleMargins);

    const calculateBubblePositions = (numBubbles, rectWidth, rectHeight) => {
        const bubblePositions = [];
        const aspectRatio = rectWidth / rectHeight;
        const cols = Math.ceil(Math.sqrt(numBubbles * aspectRatio));
        const rows = Math.ceil(numBubbles / cols);
        const colWidth = rectWidth / cols;
        const rowHeight = rectHeight / rows;


        const minDimension = Math.min(colWidth, rowHeight);
        const shiftAmount = minDimension / 2;
        radius = minDimension / 2;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols && bubblePositions.length < numBubbles; j++) {
                let x = (j + 0.5) * colWidth;
                const y = (i + 0.5) * rowHeight;
                if (i % 2 === 1) {
                    x += shiftAmount;
                }
                bubblePositions.push({x, y, r: radius});
            }
        }

        return bubblePositions;
    };

    const backgroundWidth = SCREEN_WIDTH / 6;
    const backgroundHeight = 1 / 3 * SCREEN_HEIGHT;
    topicBubbles.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', backgroundWidth)
        .attr('height', backgroundHeight)
        .attr('class', 'background-rectangle')
        .attr('fill', "#282c34");

    const generateBubble = (words, position) => {

        const bubble = topicBubbles.append('g')
            .attr('transform', `translate(${position.x},${position.y})`)
            .attr('class', 'topic-bubble');

        bubble.append('circle')
            .attr('class', 'bubble')
            .attr('r', position.r - 2)
            .attr('fill', 'transparent')
            .attr('stroke', '#b794f4')
            .on('mouseover', function () {
                highlightTopics(words, position.r, d3.select(this))
            })
            .on("mouseout", function () {
                unHighlightTopics(words, position.r, d3.select(this))
            })

        bubble.selectAll('.word')
            .data(words)
            .enter().append('text')
            .attr('class', 'word')
            .attr('x', (d, i) => Math.cos(i / words.length * 2 * Math.PI) * (position.r - 10))
            .attr('y', (d, i) => Math.sin(i / words.length * 2 * Math.PI) * (position.r - 10))
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr("fill", "white")
            .text(d => d)
            .on('mouseover', function () {
                highlightTopic(position.r, d3.select(this))
            })
            .on("mouseout", function () {
                unHighlightTopic(position.r, d3.select(this))
            })
    };

    const numBubbles = topicData.length;
    const bubblePositions = calculateBubblePositions(numBubbles, backgroundWidth, backgroundHeight);

    topicData.forEach((list, i) => {
        generateBubble(list, bubblePositions[i]);
    });
}

function highlightTopics(topicList, radius, hoveredElement) {
    const filteredNodes = nodes.filter(node => {
        return topicList.some(topic => node.text.includes(topic));
    });
    filteredNodes.each(function () {
        d3.select(this).attr("stroke", "#b794f4").attr("stroke-width", "2px");
    });
    let textElements = transcript.selectAll('text').filter(function () {
        return topicList.some(topic => this.textContent.includes(topic));
    });
    textElements.each(function () {
        d3.select(this).style("fill", '#b794f4')
    });
    hoveredElement
        .transition()
        .attr('r', radius * 1.2)
        .attr('fill', '#b794f4');
}

function unHighlightTopics(topicList, radius, hoveredElement) {
    const filteredNodes = nodes.filter(node => {
        return topicList.some(topic => node.text.includes(topic));
    });
    filteredNodes.each(function () {
        d3.select(this).attr("stroke", "none");
    });
    let textElements = transcript.selectAll('text').filter(function () {
        return topicList.some(topic => this.textContent.includes(topic));
    });
    textElements.each(function () {
        d3.select(this).style("fill", 'white')
    });
    hoveredElement
        .transition()
        .attr('r', radius)
        .attr('fill', 'transparent');
}

function highlightTopic(radius, hoveredElement) {
    const filteredNodes = nodes.filter(node => node.text.includes(hoveredElement.text()));
    filteredNodes.each(function () {
        d3.select(this).attr("stroke", "#b794f4").attr("stroke-width", "2px");
    });
    let textElements = transcript.selectAll('text').filter(function () {
        return this.textContent.includes(hoveredElement.text())
    });
    textElements.each(function () {
        d3.select(this).style("fill", '#b794f4')
    });
    hoveredElement
        .attr('fill', '#b794f4');
}

function unHighlightTopic(radius, hoveredElement) {
    const filteredNodes = nodes.filter(node => node.text.includes(hoveredElement.text()));
    filteredNodes.each(function () {
        d3.select(this).attr("stroke", "none");
    });
    let textElements = transcript.selectAll('text').filter(function () {
        return this.textContent.includes(hoveredElement.text())
    });
    textElements.each(function () {
        d3.select(this).style("fill", 'white')
    });
    hoveredElement
        .attr('fill', 'white');
}