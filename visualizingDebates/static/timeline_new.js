function createTimeline(graphNodes) {
    console.log(graphNodes)

    let barHovered = false;
    let textHovered = false;
    let timeFormat = d3.timeFormat('%H:%M:%S');


    let margin = {top: 20, right: 20, bottom: 40, left: 60};
    let width = 1200 - margin.left - margin.right;
    let height = 600 - margin.top - margin.bottom;

    let svg = d3.select('#timeline')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

// Parse the datetime strings into JavaScript Date objects
    let timeParser = d3.utcParse('%Y-%m-%dT%H:%M:%S');
    graphNodes.forEach(function (d) {
        d[0] = timeParser(d[0]);
        d[6] = timeParser(d[6]); // Parse endtime
    });

    let speakers = Array.from(new Set(graphNodes.map(function (d) {
        return d[3];
    })));

    let yScale = d3.scaleBand()
        .domain(speakers)
        .range([height, 0])
        .padding(0.1);

    let xScale = d3.scaleTime()
        .domain([d3.min(graphNodes, function (d) {
            return d[0];
        }), d3.max(graphNodes, function (d) {
            return d[6]; // Use end time for x-axis domain
        })])
        .range([0, width]);

    let xAxis = d3.axisBottom(xScale).tickFormat(timeFormat);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    let yAxis = d3.axisLeft(yScale);
    svg.append('g')
        .call(yAxis);

    let colorScale = d3.scaleOrdinal()
        .domain(speakers) // Assuming you already have an array of unique speaker names
        .range(d3.schemeCategory10);

    svg.selectAll('rect')
        .data(graphNodes)
        .enter()
        .append('rect')
        .attr('x', function (d) {
            return xScale(d[0]);
        })
        .attr('y', function (d) {
            return yScale(d[3]);
        })
        .attr('width', function (d) {
            return xScale(d[6]) - xScale(d[0]); // Calculate width based on endtime
        })
        .attr('height', yScale.bandwidth())
        .style('fill', function (d) {
            return colorScale(d[3]);
        })
        .on("mouseover", function (d) {
            var currentSpeaker = d[3];
            var textArray = d[5];

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
                if (text === d[4]) {
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
            d3.select(this)
                .attr("stroke", "black") // Add a border to the bar
                .attr("stroke-width", 2);

            barHovered = true
        })
        .on("mouseout", function () {
            barHovered = false
            setTimeout(function () {
                if (!barHovered && !textHovered) {
                    svg.selectAll(".hover-box").remove();
                    svg.selectAll('rect').attr('stroke', 'none');
                }
            }, 300);
        });
}
