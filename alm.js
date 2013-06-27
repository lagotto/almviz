// var doi = d3.select("dd#doi").attr('data-doi');

// var dataUrl = "/api/v3/articles/info:doi/" + doi + "?info=history";

var baseUrl = 'http://pkp-alm.lib.sfu.ca';
// var baseUrl = '';

var doi = '10.3402/meo.v15i0.4846';
var dataUrl = 'alm.json'

var hasSVG = document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");

//
// Configuration for when to show graphs
//
var minEventsForYearly, minEventsForMonthly, minEventsForDaily;
var minYearsForYearly, minMonthsForMonthly, minDaysForDaily;

minEventsForYearly = minEventsForMonthly = minEventsForDaily =  6;
minYearsForYearly = minMonthsForMonthly = minDaysForDaily = 6;

var hasIcon = Array('wikipedia', 'scienceseeker', 'researchblogging', 'pubmed', 'nature', 'mendeley', 'facebook', 'crossref', 'citeulike');

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
    this.width = 400 - this.margin.left - this.margin.right;
    this.height = 100 - this.margin.top - this.margin.bottom;

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
    // close out the year otherwise
    if ( level == 'day' ) {
        end_date = timeInterval.offset(pub_date, 29);
    } else {
        end_date = d3.time.year.utc.ceil(end_date);
    }

    //
    // Domains for x and y
    //
    // a time x axis, between pub_date and end_date
    viz.x.domain([timeInterval.floor(pub_date), end_date]);

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

    // TODO: these transitions could use a little work
    var bars = viz.bars.selectAll(".bar")
        .data(level_data, function(d) { return get_date(level, d); });

    bars
      .enter().append("rect")
        .attr("class", function(d) { return "bar " + viz.z((level == 'day' ? d3.time.weekOfYear(get_date(level, d)) : d.year)); })


        .attr("y", viz.height)
        .attr("height", 0);

    bars
        .attr("x", function(d) { return viz.x(get_date(level, d)) + 2; }) // padding of 2, 1 each side
        .attr("width", (viz.width/(timeInterval.range(pub_date, end_date).length + 1)) - 2);

    bars.transition()
        .duration(1000)
        .attr("width", (viz.width/(timeInterval.range(pub_date, end_date).length + 1)) - 2)
        .attr("y", function(d) { return viz.y(d[category.name]); })
        .attr("height", function(d) { return viz.height - viz.y(d[category.name]); });

    bars
      .exit().transition()
        .attr("y", viz.height)
        .attr("height", 0);

    bars
      .exit().transition().delay(1000)
        .remove();

    viz.svg.select(".y.axis")
        .call(viz.yAxis);

    viz.svg.select(".x.axis")
        .call(viz.xAxis);

    // add in some tool tips
    viz.bars.selectAll("rect").each(
       function(d,i){
           $(this).tooltip('destroy'); // need to destroy so all bars get updated
           $(this).tooltip({title: format_number(d[category.name]) + " in " + get_formatted_date(level, d), container: "body"});
        }
    );
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

                if (hasIcon.indexOf(source.name) >= 0) {
                    countLabel.append("img")
                        .attr("src", baseUrl + '/assets/' + source.name + '.png')
                        .attr("alt", 'a description of the source');
                }

                var count;
                if (source.events_url) {
                    // if there is an events_url, we can link to it from the count
                    count = countLabel.append("a")
                      .attr("href", function(d) { return source.events_url; });
                } else {
                    // if no events_url, we just put in the count
                    count = countLabel.append("span");
                }

                count
                    .attr("class", "alm-count")
                    .attr("id", "alm-count-" + source.name + "-" + category.name)
                    .text(function(d) { return format_number(total); });

                // link the source name
                countLabel.append("div").append("a")
                    .attr("href", function(d) { return baseUrl + "/sources/" + source.name; })
                    .text(function(d) { return source.display_name; });
            }

            // If there is not SVG, do not even try the charts
            if ( hasSVG ) {
                var level = false;

                // check what levels we can show
                var showDaily = false;
                var showMonthly = false;
                var showYearly = false;

                if (source.by_year) {
                    level_data = get_data('year', source);
                    var yearTotal = level_data.reduce(function(i, d) { return i + d[category.name]; }, 0);
                    var numYears = d3.time.year.utc.range(pub_date, new Date()).length

                    if (yearTotal >= minEventsForYearly && numYears >= minYearsForYearly) {
                        showYearly = true;
                        level = 'year';
                    }
                }

                if (source.by_month) {
                    level_data = get_data('month', source);
                    var monthTotal = level_data.reduce(function(i, d) { return i + d[category.name]; }, 0);
                    var numMonths = d3.time.month.utc.range(pub_date, new Date()).length

                    if (monthTotal >= minEventsForMonthly && numMonths >= minMonthsForMonthly) {
                        showMonthly = true;
                        level = 'month';
                    }
                }

                if (source.by_day){
                    level_data = get_data('day', source);
                    var dayTotal = level_data.reduce(function(i, d) { return i + d[category.name]; }, 0);
                    var numMonths = d3.time.month.utc.range(pub_date, new Date()).length

                    if (dayTotal >= minEventsForDaily && numDays >= minMonthsForDaily) {
                        showDaily = true;
                        level = 'day';
                    }
                }
                // The level and level_data should be set to the finest level
                // of granularity that we can show
                timeInterval = get_time_interval(level);

                // check there is data for
                if ( showDaily || showMonthly || showYearly ) {
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

                    if (showDaily) {
                        levelControlsDiv.append("a")
                                .attr("href", "javascript:void(0)")
                                .classed("alm-control", true)
                                .classed("disabled", !showDaily)
                                .classed("active", (level == 'day'))
                                .text("daily (first 30)")
                                .on("click", function() { if (showDaily && !$(this).hasClass('active')) {
                                                                loadData(viz, 'day');
                                                                update_controls($(this));
                                                            } });

                        levelControlsDiv.append("text")
                                .text(" | ");
                    }

                    levelControlsDiv.append("a")
                            .attr("href", "javascript:void(0)")
                            .classed("alm-control", true)
                            .classed("disabled", !showMonthly)
                            .classed("active", (level == 'month'))
                            .text("monthly")
                            .on("click", function() { if (showMonthly && !$(this).hasClass('active')) {
                                                            loadData(viz, 'month');
                                                            update_controls($(this));
                                                        } });

                    if (showYearly) {
                        levelControlsDiv.append("text")
                                .text(" | ");

                        levelControlsDiv.append("a")
                                .attr("href", "javascript:void(0)")
                                .classed("alm-control", true)
                                .classed("disabled", !showYearly)
                                .classed("active", (level == 'year'))
                                .text("yearly")
                                .on("click", function() { if (showYearly && !$(this).hasClass('active')) {
                                                                loadData(viz, 'year');
                                                                update_controls($(this));
                                                            } });
                    }

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
