var textElements = []; // Create an array to store references to text elements
var textHovered = false;
var barHovered = false;


var timelineData = [
    {
        datetime: '28.05.2002 17:34:12',
        endtime: '28.05.2002 17:34:18',
        personId: "1234",
        event: 'Event 1',
        text: "here is my text 1"
    },
    {
        datetime: '28.05.2002 17:34:18',
        endtime: '28.05.2002 17:34:30',
        personId: "1234",
        event: 'Event 4',
        text: "Here is another text 2"
    },
    {
        datetime: '28.05.2002 17:34:30',
        endtime: '28.05.2002 17:35:15',
        personId: "2222",
        event: 'Event 2',
        text: "I love chicken"
    },
    {
        datetime: '28.05.2002 17:35:15',
        endtime: '28.05.2002 17:35:40',
        personId: "1234",
        event: 'Event 3',
        text: "not here to stay"
    },
];

var margin = {top: 20, right: 20, bottom: 40, left: 60};
var width = 800 - margin.left - margin.right;
var height = 400 - margin.top - margin.bottom;

var svg = d3.select('#timeline')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

// Parse the datetime strings into JavaScript Date objects
var timeParser = d3.timeParse('%d.%m.%Y %H:%M:%S');
timelineData.forEach(function (d) {
    d.datetime = timeParser(d.datetime);
    d.endtime = timeParser(d.endtime);
});

var persons = Array.from(new Set(timelineData.map(function (d) {
    return d.personId;
})))

var xScale = d3.scaleTime()
    .domain(d3.extent(timelineData, function (d) {
        return d.datetime;
    }))
    .range([0, width]);

var yScale = d3.scaleBand()
    .domain(persons)
    .range([height, 0])
    .padding(0.1);

// Create the x-axis scale
var xScale = d3.scaleTime()
    .domain([d3.min(timelineData, function (d) {
        return d.datetime;
    }), d3.max(timelineData, function (d) {
        return d.endtime;
    })])
    .range([0, width]);

// Add the x-axis to the SVG
var xAxis = d3.axisBottom(xScale);
svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add y-axis
var yAxis = d3.axisLeft(yScale);
svg.append('g')
    .call(yAxis);

svg.selectAll('rect')
    .data(timelineData)
    .enter()
    .append('rect')
    .attr('x', function (d) {
        return xScale(d.datetime);
    })
    .attr('y', function (d) {
        return yScale(d.personId);
    })
    .attr('width', function (d) {
        return xScale(d.endtime) - xScale(d.datetime);
    })
    .attr('height', yScale.bandwidth())
    .style('fill', 'steelblue')
    .on("mouseover", function (d) {
        var textElement = svg.append("text")
            .attr("x", xScale(d.datetime) + 5) // Adjust as needed
            .attr("y", yScale(d.personId) - 10) // Adjust as needed
            .style("visibility", "visible")
            .text(d.text)
            .style("cursor", "pointer")
            .on("click", function () {
                // Handle click event here, e.g., open a link
            });
        textElements.push(textElement);
        textElement.on("mouseover", function () {
            textHovered = true;
        }).on("mouseout", function () {
            textHovered = false;
            setTimeout(function () {
                if (!barHovered && !textHovered) {
                    textElement.style("visibility", "hidden");
                }
            }, 200);
        });
        d3.select(this)
            .attr("stroke", "black") // Add a border to the bar
            .attr("stroke-width", 2);

        barHovered = true;
    })
    .on("mouseout", function () {
        barHovered = false;
        setTimeout(function () {
            if (!barHovered && !textHovered) {
                textElements.forEach(function (textElement) {
                    textElement.style("visibility", "hidden");
                });
            }
        }, 200); // Adjust the delay as needed

        d3.select(this).attr("stroke", "none");
    });
