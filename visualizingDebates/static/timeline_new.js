function createTimeline(graphNodes) {

    console.log(graphNodes)
    var barHovered = false;
    var textHovered = false;
    var textElements = [];


    var margin = {top: 20, right: 20, bottom: 40, left: 60};
    var width = 800 - margin.left - margin.right;
    var height = 400 - margin.top - margin.bottom;

    var svg = d3.select('#timeline')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

// Parse the datetime strings into JavaScript Date objects
    var timeParser = d3.utcParse('%Y-%m-%dT%H:%M:%S');
    graphNodes.forEach(function (d) {
        d[0] = timeParser(d[0]);
        d[6] = timeParser(d[6]); // Parse endtime
    });

    var speakers = Array.from(new Set(graphNodes.map(function (d) {
        return d[3];
    })));

    var yScale = d3.scaleBand()
        .domain(speakers)
        .range([height, 0])
        .padding(0.1);

    var xScale = d3.scaleTime()
        .domain([d3.min(graphNodes, function (d) {
            return d[0];
        }), d3.max(graphNodes, function (d) {
            return d[6]; // Use endtime for x-axis domain
        })])
        .range([0, width]);

    var xAxis = d3.axisBottom(xScale);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    var yAxis = d3.axisLeft(yScale);
    svg.append('g')
        .call(yAxis);

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
        .style('fill', 'steelblue')
        .on("mouseover", function (d) {
            var currentSpeaker = d[3];

            // Remove all existing text elements
            svg.selectAll(".text-element").remove();

            var textElement = svg.append("text")
                .attr("x", xScale(d[0]) + 5)
                .attr("y", yScale(currentSpeaker) - 10)
                .style("visibility", "visible")
                .style("cursor", "pointer")
                .attr("class", "text-element")
                .text(d[4])
                .on("click", function () {
                    // Handle click event here, e.g., open a link
                });

            textElement.on("mouseover", function () {
                textElement.style("visibility", "visible");
            }).on("mouseout", function () {
                textElement.style("visibility", "hidden");

            });

            d3.select(this)
                .attr("stroke", "black")
                .attr("stroke-width", 2);
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke", "none");
        });
}
