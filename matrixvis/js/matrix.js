/*
 * Matrix - Object constructor function
 * @param _parentElement 					-- the HTML element in which to draw the visualization
 * @param _dataFamilyAttributes		-- attributes for the 16 Florentine families
 * @param _dataMarriage						-- marriage data stored in a symmetric adjacency matrix
 * @param _dataBusiness						-- business relations stored in a symmetric adjacency matrix
 */

Matrix = function (_parentElement, _dataFamilyAttributes, _dataMarriages, _dataBusiness) {
    this.parentElement = _parentElement;
    this.dataFamilyAttributes = _dataFamilyAttributes;
    this.dataMarriages = _dataMarriages;
    this.dataBusiness = _dataBusiness;
    this.displayData = [];

    this.initVis();
};


/*
 * Initialize visualization (static content; e.g. SVG area, axes)
 */

Matrix.prototype.initVis = function () {
    var vis = this;


    // Color definitions
    vis.colorMarriage = "#8686bf";
    vis.colorBusiness = "#fbad52";
    vis.colorNoRelation = "#ddd";


    vis.margin = {top: 80, right: 20, bottom: 20, left: 80};

    vis.size = 600;

    vis.width = vis.size - vis.margin.left - vis.margin.right,
        vis.height = vis.size - vis.margin.top - vis.margin.bottom;

    vis.cellPadding = vis.width / vis.dataFamilyAttributes.length / 3;
    vis.cellHeight = vis.cellPadding * 2;
    vis.cellWidth = vis.cellHeight;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");


    // (Filter, aggregate, modify data)
    vis.wrangleData();
};


/*
 * Data wrangling
 */

Matrix.prototype.wrangleData = function () {
    var vis = this;

    vis.dataMarriages.forEach(function (d, index) {
        var marriages = d3.sum(d);
        var businessTies = d3.sum(vis.dataBusiness[index]);
        var allRelations = marriages + businessTies;

        var family = {
            "index": index,
            "name": vis.dataFamilyAttributes[index].Family,
            "wealth": +vis.dataFamilyAttributes[index].Wealth,
            "numberPriorates": +vis.dataFamilyAttributes[index].NumberPriorates,
            "marriages": marriages,
            "businessTies": businessTies,
            "allRelations": allRelations,
            "marriageValues": d,
            "businessValues": vis.dataBusiness[index]
        };

        vis.displayData.push(family);
    });

    // Update the visualization
    vis.updateVis("index");
};


/*
 * The drawing function
 */

Matrix.prototype.updateVis = function (orderingType) {
    var vis = this;


    // Update sorting
    vis.displayData.sort(function (a, b) {
        if (orderingType == "index")
            return a[orderingType] - b[orderingType];
        else
            return b[orderingType] - a[orderingType];
    });

    // Draw matrix rows (and y-axis labels)
    var dataJoin = vis.svg.selectAll(".matrix-row")
        .data(vis.displayData, function (d) {
            return d.name;
        });

    // ENTER
    var rowsGroups = dataJoin.enter()
        .append("g")
        .attr("class", function (d, i) {
            return "matrix-row matrix-row-" + i;
        })
        .attr("matrix-row-index", function (d, i) {		// We add this attribute to access the row index later
            return i;
        });

    // ENTER
    rowsGroups.append("text")
        .attr("class", "matrix-label matrix-row-label")
        .attr("x", -10)
        .attr("y", vis.cellHeight / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(function (d, index) {
            return d.name;
        })
        .merge(dataJoin.select(".matrix-row-label"));   // merge ENTER + UPDATE (row labels)

    rowsGroups.merge(dataJoin)  // merge ENTER + UPDATE groups
        .style('opacity', 0.5)
        .transition()
        .duration(1000)
        .style('opacity', 1)
        .attr("transform", function (d, index) {
            return "translate(0," + (vis.cellHeight + vis.cellPadding) * index + ")";
        });

    // Draw marriage triangles
    var cellMarriage = rowsGroups.selectAll(".matrix-cell-marriage")
        .data(function (d) {
            return d.marriageValues;
        })
        .enter().append("path")
        .attr("class", function (d, i) {
            return "matrix-cell matrix-cell-marriage matrix-col-" + i;
        })
        .attr('d', function (d, index) {
            var x = (vis.cellWidth + vis.cellPadding) * index;
            var y = 0;
            return 'M ' + x + ' ' + y + ' l ' + vis.cellWidth + ' 0 l 0 ' + vis.cellHeight + ' z';
        })
        .attr("fill", function (d) {
            return d == 0 ? "#ddd" : "#8686bf";
        })
        .on("mouseover", function (d, index) {

            var row = +this.parentNode.getAttribute("matrix-row-index");
            vis.mouseoverCol(row, index);
        })
        .on("mouseout", vis.mouseoutCell);


    // Draw business triangles
    var cellBusiness = rowsGroups.selectAll(".matrix-cell-business")
        .data(function (d) {
            return d.businessValues;
        })
        .enter().append("path")
        .attr("class", "matrix-cell matrix-cell-business")
        .attr('d', function (d, index) {
            var j = +this.parentNode.getAttribute("data-index");
            var x = (vis.cellWidth + vis.cellPadding) * index;
            var y = 0;
            return 'M ' + x + ' ' + y + ' l 0 ' + vis.cellHeight + ' l ' + vis.cellWidth + ' 0 z';
        })
        .attr("fill", function (d, index) {
            return d == 0 ? "#ddd" : "#fbad52";
        })
        .on("mouseover", function (d, index) {
            var row = +this.parentNode.getAttribute("matrix-row-index");
            vis.mouseoverCol(row, index);
        })
        .on("mouseout", vis.mouseoutCell);

    // Draw x-axis labels
    var columnLabel = vis.svg.selectAll(".matrix-column-label")
        .data(vis.dataFamilyAttributes);

    columnLabel.enter().append("text")
        .attr("class", "matrix-label matrix-column-label")
        .attr("text-anchor", "start")
        .attr("transform", function (d, index) {
            return "translate(" + (index * (vis.cellWidth + vis.cellPadding) + (vis.cellWidth + vis.cellPadding) / 2) + ",-8) rotate(270)"
        })
        .text(function (d) {
            return d.Family;
        });
};

Matrix.prototype.mouseoverCol = function (row, col) {
    d3.selectAll(".matrix-cell")
        .transition()
        .duration(300)
        .attr("fill-opacity", 0.2);

    d3.selectAll(".matrix-col-" + col)
        .transition()
        .duration(600)
        .attr("fill-opacity", 1)

    d3.selectAll(".matrix-row-" + row + " path")
        .transition()
        .duration(600)
        .attr("fill-opacity", 1);
};

Matrix.prototype.mouseoutCell = function () {
    d3.selectAll(".matrix-cell")
        .transition()
        .duration(300)
        .attr("fill-opacity", 1);
};
