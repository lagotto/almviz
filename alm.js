// var doi = d3.select("dd#doi").attr('data-doi');

// var dataUrl = "/api/v3/articles/info:doi/" + doi + "?info=history";

var baseUrl = 'http://alm.publicknowledgeproject.org';
var baseUrl = '';

var doi = '10.3402/meo.v15i0.4846';
var dataUrl = baseUrl + 'alm.json'

function get_format_date(level, d) {
    switch (level) {
        case 'year':
            return  new Date(d.year, 0, 0);
        case 'month':
            return new Date(d.year, d.month, 1);
        case 'day':
            return new Date(d.year, d.month, d.day);
    }
}

d3.json(dataUrl, function(data) {
    var margin = {top: 20, right: 20, bottom: 30, left: 40},
        width = 600 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    var colors = ["#304345","#789aa1","#304345","#789aa1","#304345","#789aa1","#304345","#789aa1","#304345","#789aa1"];
    var pub_date = d3.time.format.iso.parse(data[0]["publication_date"]);
    var cur_date = new Date;
    var format_date = d3.time.format("%b %y");
    var format_number = d3.format(",d")

    var canvas = d3.select("#alm").append("div");

    var category = [{ name: "html", display_name: "HTML Views" },
                    { name: "pdf", display_name: "PDF Downloads" },
                    { name: "likes", display_name: "Likes" },
                    { name: "shares", display_name: "Shares" },
                    { name: "comments", display_name: "Comments" },
                    { name: "citations", display_name: "Citations" }];
    var categoryTotal;
    var metricsFound = false;

    d3.select("#alm > #loading").remove();

    category.forEach(function(c) {
        categoryTotal = 0;

        var categoryRow;

        data[0]["sources"].forEach(function(source) {
        var level;
        var level_data = false;
        var time_interval;

        // determine what level we're defaulting to
        if (source.by_day) {
            level = 'day';
            level_data = source.by_day;
            timeInterval = d3.time.day;
        } else if (source.by_month) {
            level = 'month';
            level_data = source.by_month;
            timeInterval = d3.time.month;
        } else if (source.by_year) {
            level = 'year';
            level_data = source.by_year;
            timeInterval = d3.time.year
        }

        if (level_data) {
            // get the total for the source
            var total = level_data.reduce(function(i, d) { return i + d[c.name]; }, 0);

            if (total > 0) {
                console.log(level + ':' + c.name + ':' + total);
                // keep track of the category's total
                categoryTotal += total;

                if (!categoryRow) {
                    categoryRow = canvas.append("div")
                                .attr("class", "alm-category-row")
                                .attr("style", "width: 100%; border: 1px solid #eee; overflow: hidden;")
                                .attr("id", "category-" + c.name);

                    categoryRow.append("h2", "div.alm-category-row-heading" + c.name)
                        .attr("class", "border-bottom")
                        .attr("id", "month-" + c.name)
                        .text(c.display_name);

                    // flag that there is at least one metric
                    metricsFound = true;
                }


                var row = categoryRow.append("div")
                    .attr("class", "alm-row")
                    .attr("style", "width: 100%; overflow: hidden;")
                    .attr("id", "alm-row-" + source.name + "-" + c.name);

                var countLabel = row.append("div")
                    .attr("style", "width: 30%; float:left;")
                    .attr("class", "alm-count-label");


                if (source.events_url) {
                    // if there is an events_url, we can link to it from the count
                    countLabel.append("a")
                      .attr("href", function(d) { return source.events_url; })
                      .append("h1")
                      .attr("class", "signpost")   // TODO: rename to a generic class name
                      .attr("id", "signpost-" + source.name + "-" + c.name)
                      .text(function(d) { return format_number(total); });
                } else {
                    // if no events_url, we just put in the count
                    countLabel.append("h1")
                        .attr("class", "signpost")
                        .attr("id", "month-signpost-" + source.name + "-" + c.name)
                        .text(function(d) { return format_number(total); });
                }

                // link the source name
                countLabel.append("div").append("a")
                    .attr("href", function(d) { return baseUrl + "/sources/" + source.name; })
                    .text(function(d) { return source.display_name; });

                // a container for the chart
                var chartDiv = row.append("div")
                    .attr("style", "width: 70%; float:left;")
                    .attr("class", "alm-chart-area");

                // the chart
                var svg = chartDiv.append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                // a time x axis, between pub_date and cur_date
                // FIXME: why isn't .floor the right thing? .round seems wrong
                var x = d3.time.scale();
                x.domain([timeInterval.round(pub_date), timeInterval.ceil(cur_date)]);
                x.range([0, width]);

                // a linear y axis between 0 and max value found in data
                var y = d3.scale.linear();
                y.domain([0, d3.max(level_data, function(d) { return d[c.name]; })]);
                y.range([height, 0]);

                // set up the axis
                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left")
                    .tickSize(0)
                    .tickValues([d3.max(y.domain())])   // only one tick at max
                    .tickFormat(d3.format(",d"));       // n

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .tickSize(0)
                    .ticks(0);

                // TODO: add colors back in
                // var z = d3.scale.ordinal()
                //     .domain(level_data.map(function(d) { return d.year; }))
                //     .range(colors);

                svg.selectAll(".bar")
                    .data(level_data)
                  .enter().append("rect")
                    .attr("class", "bar")
                    .attr("x", function(d) { return x(get_format_date(level, d)); })
                    .attr("width", width/(timeInterval.range(pub_date, cur_date).length + 1))
                    .attr("y", function(d) { return y(d[c.name]); })
                    .attr("height", function(d) { return height - y(d[c.name]); })
                    .attr("stroke", "white")
                    .attr("fill", "steelblue");

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis);
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);

            // TODO: add tooltips back in
            // chart.selectAll("rect").each(
            //   function(d,i){ $(this).tooltip({title: format_number(d[c.name]) + " in " + format_date(new Date(d.year, d.month - 1)), container: "body"});
            // });
        }
      }
    });
  });

    if (!metricsFound) {
        canvas.append("p")
            .attr("class", "muted")
            .text("No metrics found.");
    }
});
