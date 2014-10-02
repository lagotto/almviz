var d3,
    w = 300,
    h = 200,
    radius = Math.min(w, h) / 2,
    color = d3.scale.ordinal().range(["#1abc9c","#ecf0f1","#95a5a6"]),
    formatFixed = d3.format(",.0f");

// construct query string
var params = d3.select("h1");
if (!params.empty()) {
  var api_key = params.attr('data-api_key');
  var source_name = params.attr('data-name');
  var query = encodeURI("/api/v5/sources/" + source_name + "?api_key=" + api_key);
}

// load the data from the Lagotto API
if (query) {
  d3.json(query, function(error, json) {
    if (error) { return console.warn(error); }
    var data = json.data;
    var status = d3.entries(data.status);
    var by_day = d3.entries(data.by_day);
    var by_month = d3.entries(data.by_month);

    donutViz(status, "div#chart_status", "Status", "of articles");
    donutViz(by_day, "div#chart_day", "Events", "last 24 hours");
    donutViz(by_month, "div#chart_month", "Events", "last 31 days");
  });
}

// donut chart
function donutViz(data, div, title, subtitle) {
  var chart = d3.select(div).append("svg")
    .data([data])
    .attr("width", w)
    .attr("height", h)
    .attr("class", "chart")
    .append("svg:g")
    .attr("transform", "translate(150,100)");

  var arc = d3.svg.arc()
    .outerRadius(radius - 10)
    .innerRadius(radius - 40);

  var pie = d3.layout.pie()
    .sort(null)
    .value(function(d) { return d.value; });

  var arcs = chart.selectAll("g.slice")
    .data(pie)
    .enter()
    .append("svg:g")
    .attr("class", "slice");

  arcs.append("svg:path")
    .attr("fill", function(d, i) { return color(i); } )
    .attr("d", arc);
  arcs.each(
    function(d){ $(this).tooltip({title: formatFixed(d.data.value) + " articles " + d.data.key.replace("_", " "), container: "body"});
  });

  chart.append("text")
    .attr("dy", 0)
    .attr("text-anchor", "middle")
    .attr("class", "title")
    .text(title);

  chart.append("text")
    .attr("dy", 21)
    .attr("text-anchor", "middle")
    .attr("class", "subtitle")
    .text(subtitle);

  // return chart object
  return chart;
}
