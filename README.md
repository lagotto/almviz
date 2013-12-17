# ALM Viz #
A series of d3.js sparklines for PLOS Article-Level Metrics (ALM) API JSON results at the article level. 

An example can be found on the [github page](http://jalperin.github.io/almviz/)

These visualizations were inspired by conversations at the Alt-Viz hackathon group hosted by PLOS in November 2012. [More info](http://article-level-metrics.plos.org/alm-workshop-2012/hackathon/#altviz)

license
        -            -

almviz is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

almviz is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

See <http://www.gnu.org/licenses/>.

# How to use #
- import alm.js
- import almviz.css and jqueryUi.css (if not already using jqueryUI)
- declare options object
    - almStatsJson: The JSON response from the ALM app
    - additionalStatsJson (optional): an additional source (for appending to ALM app response)
    - baseUrl: URL of ALM installation for pointing users back
    - minItemsToShowGraph*: assoc array with the following keys, declaring conditions for when to show graph
        - minEventsForYearly 
        - minEventsForMonthly
        - minEventsForDaily
        - minYearsForYearly
        - minMonthsForMonthly
        - minDaysForDaily
    - hasIcon: array of sources that have icons on the ALM server
    - showTitle: boolean to display the title of the article at the top of the visualization
    - categories: array of objects with the following keys: name, display_name, tooltip_text
        - i.e., [{ name: "html", display_name: "HTML Views", tooltip_text: "Total number of HTML page views for this article. "}, { name ... }]
    - vizDiv (optional): a selector where to place the whole thing (defaults to #alm)
- declare AlmViz object: var almviz = new AlmViz(options);
- initialize the Viz: almviz.initViz();

## Example ##
	options = {
			baseUrl: 'http://pkp-alm.lib.sfu.ca',
			minItemsToShowGraph: {
					minEventsForYearly: 6,
					minEventsForMonthly: 6,
					minEventsForDaily: 6,
					minYearsForYearly: 6,
					minMonthsForMonthly: 6,
					minDaysForDaily: 6
					}, 
			hasIcon: ['wikipedia', 'scienceseeker', 'researchblogging', 'pubmed', 'nature', 'mendeley', 'facebook', 'crossref', 'citeulike'],
			showTitle: true,
			categories: [{ name: "html", display_name: "HTML Views", tooltip_text: 'Total number of HTML page views for this article. These views are recorded directly within the system itself. Overall monthly view counts may also be available.' },
					{ name: "pdf", display_name: "PDF Downloads", tooltip_text: 'Total number of PDF views and downloads for this article. These views are recorded directly within the system itself. Overall monthly view counts may also be available.' },
					{ name: "likes", display_name: "Likes", tooltip_text: 'Likes found in social networks such as Facebook.' },
					{ name: "shares", display_name: "Shares", tooltip_text: 'Shares or bookmarks in social networks such as Facebook, CiteULike and Mendeley. In most cases, clicking on the number of shares will take you to a listing in the network itself.' },
					{ name: "comments", display_name: "Comments", tooltip_text: 'Comments are .' },
					{ name: "citations", display_name: "Citations", tooltip_text: 'Citations of this article found in CrossRef, PubMed and Wikipedia. In most cases, clicking on the citation count will take you to a listing in the referencing service itself.' }],
		}

	d3.json('alm.json', function(data) {
		options.almStatsJson = data

		var almviz = new AlmViz(options);
		almviz.initViz();
	});

