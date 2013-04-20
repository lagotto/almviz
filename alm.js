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

var categories = [{ name: "html", display_name: "HTML Views" },
                { name: "pdf", display_name: "PDF Downloads" },
                { name: "likes", display_name: "Likes" },
                { name: "shares", display_name: "Shares" },
                { name: "comments", display_name: "Comments" },
                { name: "citations", display_name: "Citations" }];
var categoryTotal;
var metricsFound = false;
var format_number = d3.format(",d")

//var colors = ["#304345","#789aa1","#304345","#789aa1","#304345","#789aa1","#304345","#789aa1","#304345","#789aa1"];

/* Graph visualization
 * @param chartDiv The div where the chart should go
 * @param data The raw data
 * @param category The category for this chart
 */
function AlmViz(chartDiv, data, category) {
    // size parameters
    this.margin = {top: 20, right: 20, bottom: 30, left: 40};
    this.width = 600 - this.margin.left - this.margin.right;
    this.height = 300 - this.margin.top - this.margin.bottom;

    this.chartDiv = chartDiv;
    this.data = data;
    this.category = category;
    this.cur_date = new Date;
    this.pub_date = d3.time.format.iso.parse(data[0]["publication_date"]);

    // the chart
    this.svg = this.chartDiv.append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.x = d3.time.scale();
    this.x.range([0, this.width]);

    this.y = d3.scale.linear();
    this.y.range([this.height, 0]);
}

function changeData(viz, level, level_data, timeInterval) {
    console.log(viz);
}

function loadData(viz, level, level_data, timeInterval) {
    d3.select("#alm > #loading").remove();


    var category = viz.category;
    var maxY = d3.max(level_data, function(d) { return d[category.name]; });

    // a time x axis, between pub_date and cur_date
    // FIXME: why isn't .floor the right thing? .round seems wrong
    viz.x.domain([timeInterval.round(viz.pub_date), timeInterval.ceil(viz.cur_date)]);
    viz.y.domain([0, maxY]);

    // set up the axis

    // a linear axis between publication date and current date
    viz.xAxis = d3.svg.axis()
        .scale(viz.x)
        .tickSize(0)
        .ticks(0);

    // a linear y axis between 0 and max value found in data
    viz.yAxis = d3.svg.axis()
        .orient("left")
        .tickSize(0)
        .tickValues([d3.max(viz.y.domain())])   // only one tick at max
        .tickFormat(d3.format(",d"));

    // TODO: add colors back in
    // var z = d3.scale.ordinal()
    //     .domain(level_data.map(function(d) { return d.year; }))
    //     .range(colors);

    viz.svg.selectAll(".bar")
        .data(level_data)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return viz.x(get_format_date(level, d)); })
        .attr("width", viz.width/(timeInterval.range(viz.pub_date, viz.cur_date).length + 1))
        .attr("y", function(d) { return viz.y(d[category.name]); })
        .attr("height", function(d) { return viz.height - viz.y(d[category.name]); })
        .attr("stroke", "white")
        .attr("fill", "steelblue");

    viz.svg.append("g")
        .attr("class", "y axis")
        .call(viz.yAxis);

    viz.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + viz.height + ")")
        .call(viz.xAxis);
}


d3.json(dataUrl, function(data) {
    categories.forEach(function(category) {
        categoryTotal = 0;

        var canvas = d3.select("#alm").append("div");


        var categoryRow;

        data[0]["sources"].forEach(function(source) {
            var level;
            var level_data = false;

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
                var total = level_data.reduce(function(i, d) { return i + d[category.name]; }, 0);

                if (total > 0) {
                    console.log(level + ':' + category.name + ':' + total);
                    // keep track of the category's total
                    categoryTotal += total;

                    if (!categoryRow) {
                        categoryRow = canvas.append("div")
                                    .attr("class", "alm-category-row")
                                    .attr("style", "width: 100%; border: 1px solid #eee; overflow: hidden;")
                                    .attr("id", "category-" + category.name);

                        categoryRow.append("h2", "div.alm-category-row-heading" + category.name)
                            .attr("class", "border-bottom")
                            .attr("id", "month-" + category.name)
                            .text(category.display_name);

                        // flag that there is at least one metric
                        metricsFound = true;
                    }


                    var row = categoryRow.append("div")
                        .attr("class", "alm-row")
                        .attr("style", "width: 100%; overflow: hidden;")
                        .attr("id", "alm-row-" + source.name + "-" + category.name);

                    var countLabel = row.append("div")
                        .attr("style", "width: 30%; float:left;")
                        .attr("class", "alm-count-label");


                    if (source.events_url) {
                        // if there is an events_url, we can link to it from the count
                        countLabel.append("a")
                          .attr("href", function(d) { return source.events_url; })
                          .append("h1")
                          .attr("class", "signpost")   // TODO: rename to a generic class name
                          .attr("id", "signpost-" + source.name + "-" + category.name)
                          .text(function(d) { return format_number(total); });
                    } else {
                        // if no events_url, we just put in the count
                        countLabel.append("h1")
                            .attr("class", "signpost")
                            .attr("id", "month-signpost-" + source.name + "-" + category.name)
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

                    var viz = new AlmViz(chartDiv, data, category);
                    loadData(viz, level, level_data, timeInterval);

                    chartDiv.append("a")
                            .attr("href", "#")
                            .text("test")
                            .on("click", changeData);

                    // TODO: add tooltips back in
                    // chart.selectAll("rect").each(
                    //   function(d,i){ $(this).tooltip({title: format_number(d[category.name]) + " in " + format_date(new Date(d.year, d.month - 1)), container: "body"});
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
