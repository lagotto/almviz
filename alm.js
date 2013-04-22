// var doi = d3.select("dd#doi").attr('data-doi');

// var dataUrl = "/api/v3/articles/info:doi/" + doi + "?info=history";

var baseUrl = 'http://alm.publicknowledgeproject.org';
var baseUrl = '';

var doi = '10.3402/meo.v15i0.4846';
var dataUrl = baseUrl + 'alm.json'

var hasSVG = document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");

/**
 * Extract the date from the source
 * @param level (day|month|year)
 * @param d the datum
 * @return {Date}
 */
function get_date(level, d) {
    switch (level) {
        case 'year':
            return  new Date(d.year, 0, 1);
        case 'month':
            // js Date indexes months at 0
            return new Date(d.year, d.month - 1, 1);
        case 'day':
            // js Date indexes months at 0
            return new Date(d.year, d.month - 1, d.day);
    }
}

/**
 * Format the date for display
 * @param level (day|month|year)
 * @param d the datum
 * @return {String}
 */
function get_formatted_date(level, d) {
    switch (level) {
        case 'year':
            return d3.time.format("%Y")(get_date(level, d));
        case 'month':
            return d3.time.format("%b %y")(get_date(level, d));
        case 'day':
            return d3.time.format("%d %b %y")(get_date(level, d));
    }
}

/**
 *
 * @param level (day|month|year)
 * @param source (from Json response)
 * @return Array of metrics
 */
function get_data(level, source) {
    switch (level) {
        case 'year':
            return source.by_year;
        case 'month':
            return source.by_month;
        case 'day':
            return source.by_day;
    }
}

/**
 * Returns a d3 timeInterval for date operations
 * @param level (day|month|year
 * @return d3 ime Interval
 */
function get_time_interval(level) {
    switch (level) {
        case 'year':
            return d3.time.year.utc;
        case 'month':
            return d3.time.month.utc;
        case 'day':
            return d3.time.day.utc;
    }
}

// map of category keys to labels for display
var categories = [{ name: "html", display_name: "HTML Views" },
                { name: "pdf", display_name: "PDF Downloads" },
                { name: "likes", display_name: "Likes" },
                { name: "shares", display_name: "Shares" },
                { name: "comments", display_name: "Comments" },
                { name: "citations", display_name: "Citations" }];

var metricsFound = false;   // flag
var format_number = d3.format(",d"); // for formatting numbers for display
var charts = new Array();   // keep track of AlmViz objects

/* Graph visualization
 * The basic general set up of the graph itself
 * @param chartDiv The div where the chart should go
 * @param data The raw data
 * @param category The category for 86 chart
 */
function AlmViz(chartDiv, pub_date, source, category) {
    // size parameters
    this.margin = {top: 10, right: 40, bottom: 0, left: 40};
    this.width = 600 - this.margin.left - this.margin.right;
    this.height = 300 - this.margin.top - this.margin.bottom;

    // div where everything goes
    this.chartDiv = chartDiv;

    // publication date
    this.pub_date = pub_date;

    // source data and which category
    this.category = category;
    this.source = source;

    // just for record keeping
    this.name = source.name + '-' + category.name;

    this.x = d3.time.scale();
    this.x.range([0, this.width]);

    this.y = d3.scale.linear();
    this.y.range([this.height, 0]);

    this.z = d3.scale.ordinal();
    this.z.range(['main', 'alt']);

    // the chart
    this.svg = this.chartDiv.append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    // draw the bars g first so it ends up underneath the axes
    this.bars = this.svg.append("g");

    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (this.height - 1) + ")")
    this.svg.append("g")
        .attr("class", "y axis")

}

/**
 * Takes in the basic set up of a graph and loads the data itself
 * @param viz AlmViz object
 * @param level string (day|month|year)
 */
function loadData(viz, level) {
    d3.select("#alm > #loading").remove();

    var pub_date = viz.pub_date
    var category = viz.category;
    var level_data = get_data(level, viz.source);
    var timeInterval = get_time_interval(level);

    var end_date = new Date();
    // use only first 29 days if using day view
    if ( level == 'day' ) {
        end_date = timeInterval.offset(pub_date, 29);
    }

    //
    // Domains for x and y
    //
    // a time x axis, between pub_date and end_date
    viz.x.domain([timeInterval.floor(pub_date), timeInterval.ceil(end_date)]);

    // a linear axis from 0 to max value found
    viz.y.domain([0, d3.max(level_data, function(d) { return d[category.name]; })]);

    //
    // Axis
    //
    // a linear axis between publication date and current date
    viz.xAxis = d3.svg.axis()
        .scale(viz.x)
        .tickSize(0)
        .ticks(0);

    // a linear y axis between 0 and max value found in data
    viz.yAxis = d3.svg.axis()
        .scale(viz.y)
        .orient("left")
        .tickSize(0)
        .tickValues([d3.max(viz.y.domain())])   // only one tick at max
        .tickFormat(d3.format(",d"));

    //
    // The chart itself
    //
    var transition = viz.svg.transition().duration(1500);

    transition.select(".y.axis")
        .call(viz.yAxis);

    transition.select(".x.axis")
        .call(viz.xAxis);

//    var bars = transition.selectAll(".bar")
//        .attr("y", function(d) { return viz.y(d[category.name]); })
//        .attr("height", function(d) { return viz.height - viz.y(d[category.name]); });


    // cannot use enter() and exit() because different
    // level_data occupy the same index in the data array
//    transition.delay(1000).selectAll(".bar").remove();

    var bars = viz.bars.selectAll(".bar")
        .data(level_data);

    bars
      .enter().append("rect")
        .attr("class", function(d) { return "bar " + viz.z((level == 'day' ? d3.time.weekOfYear(get_date(level, d)) : d.year)); })
        .attr("width", viz.width/(timeInterval.range(pub_date, end_date).length + 1))
        .attr("x", function(d) { return viz.x(get_date(level, d)); })
        .attr("y", viz.height)
        .attr("height", 0);

    bars.transition()
        .duration(1000)
        .delay(1000)
        .attr("y", function(d) { return viz.y(d[category.name]); })
        .attr("height", function(d) { return viz.height - viz.y(d[category.name]); });


    // add in some tool tips
    viz.bars.selectAll("rect").each(
       function(d,i){ $(this).tooltip({title: format_number(d[category.name]) + " in " + get_formatted_date(level, d), container: "body"});
    });


}

d3.json(dataUrl, function(data) {
    // extract publication date
    var pub_date = d3.time.format.iso.parse(data[0]["publication_date"]);

    // loop through categories
    categories.forEach(function(category) {
        var canvas = d3.select("#alm").append("div")
                .attr("class", "alm");
        var categoryRow = false;

        // loop through sources
        data[0]["sources"].forEach(function(source) {
            var total = source.metrics[category.name];

            if (total > 0) {
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
            }

            var level = false;

            // determine what level we're defaulting to
            // set level to lowest level of granularity available
            if (source.by_day) {
                level = 'day';
            } else if (source.by_month) {
                level = 'month';
            } else if (source.by_year) {
                level = 'year';
            }

            // check there is data for
            if (level && hasSVG) {
                level_data = get_data(level, source);
                timeInterval = get_time_interval(level);

                // get the total for the source
                var level_total = level_data.reduce(function(i, d) { return i + d[category.name]; }, 0);

                if (level_total) {
                    var chartDiv = row.append("div")
                        .attr("style", "width: 70%; float:left;")
                        .attr("class", "alm-chart-area");

                    var viz = new AlmViz(chartDiv, pub_date, source, category);
                    loadData(viz, level);

                    var update_controls = function(control) {
                        control.siblings('.alm-control').removeClass('active');
                        control.addClass('active')
                    }

                    var levelControlsDiv = chartDiv.append("div")
                            .attr("style", "width: " + (viz.margin.left + viz.width) + "px;")
                          .append("div")
                            .attr("style", "float:right;");

                    levelControlsDiv.append("a")
                            .attr("href", "javascript:void(0)")
                            .classed("alm-control", true)
                            .classed("disabled", !Boolean(source.by_day))
                            .classed("active", (level == 'day'))
                            .text("daily (first 30)")
                            .on("click", function() { if (source.by_day && !$(this).hasClass('active')) {
                                                            loadData(viz, 'day');
                                                            update_controls($(this));
                                                        } });

                    levelControlsDiv.append("text")
                            .text(" | ");

                    levelControlsDiv.append("a")
                            .attr("href", "javascript:void(0)")
                            .classed("alm-control", true)
                            .classed("disabled", !Boolean(source.by_month))
                            .classed("active", (level == 'month'))
                            .text("monthly")
                            .on("click", function() { if (source.by_month && !$(this).hasClass('active')) {
                                                            loadData(viz, 'month');
                                                            update_controls($(this));
                                                        } });

                    levelControlsDiv.append("text")
                            .text(" | ");

                    levelControlsDiv.append("a")
                            .attr("href", "javascript:void(0)")
                            .classed("alm-control", true)
                            .classed("disabled", !Boolean(source.by_year))
                            .classed("active", (level == 'year'))
                            .text("yearly")
                            .on("click", function() { if (source.by_year && !$(this).hasClass('active')) {
                                                            loadData(viz, 'year');
                                                            update_controls($(this));
                                                        } });


                    // keep track of all instances (mostly for debugging at this point)
                    charts[source.name + '-' + category.name] = viz;
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
