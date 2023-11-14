function createTimeline(graphData) {
    let nodes = graphData.nodes;
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

    svg.selectAll('rect')
        .data(nodes)
        .enter()
        .append('rect')
        .attr('x', function (d) {
            return xScale(d.start_time);
        })
        .attr('y', function (d) {
            return yScale(d.speaker);
        })
        .attr('width', function (d) {
            return xScale(d.end_time || d.start_time) - xScale(d.start_time);
        })
        .attr('height', yScale.bandwidth())
        .style('fill', function (d) {
            return colorScale(d.speaker);
        })
        .on('mouseover', (event, d) => {
            let currentSpeaker = d.speaker;
            let textArray = [];
            textArray.push(d.text)

            // Remove all existing text elements and hover boxes
            svg.selectAll('rect').attr('stroke', 'none');
            svg.selectAll(".hover-box").remove();

            let yPosition = yScale(currentSpeaker) + yScale.bandwidth() + 5; // Place the hover box below the bar

            let hoverBox = svg.append("g")
                .attr("class", "hover-box");

            textArray.forEach(function (text, index) {
                let textelement = hoverBox.append("text")
                    .attr("y", yPosition + 20 + index * 15)
                    .style("visibility", "visible")
                    .style("cursor", "pointer")
                    .text(text)
                    .on("mouseover", function () {
                        textHovered = true
                    })
                    .on("click", function () {
                        // Handle click event here, e.g., open a link or perform a specific action
                        console.log("Text clicked: " + text);
                    });
                if (text === d.text) {
                    textelement.style("font-weight", "bold")
                }
            });

            let bbox = hoverBox.node().getBBox();

            hoverBox.insert("rect", "text")
                .attr("y", yPosition) // Place the hover box below the bar
                .attr("width", bbox.width + 10)
                .attr("height", bbox.height + 10)
                .style("fill", "white")
                .style("stroke", "black")
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    textHovered = true
                })
                .on("mouseout", function () {
                    textHovered = false
                    setTimeout(function () {
                        if (!barHovered && !textHovered) {
                            svg.selectAll(".hover-box").remove();
                            svg.selectAll('rect').attr('stroke', 'none');
                        }
                    }, 300)
                });
            d3.select(event.currentTarget)
                .attr('stroke', 'black') // Add a border to the bar
                .attr('stroke-width', 2);

            barHovered = true

        })
        .on('mouseout', function () {
            barHovered = false;
            setTimeout(function () {
                if (!barHovered && !textHovered) {
                    svg.selectAll(".hover-box").remove();
                    svg.selectAll('rect').attr('stroke', 'none');
                }
            }, 300);
        });
}
