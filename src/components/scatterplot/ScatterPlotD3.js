import * as d3 from 'd3';

class ScatterPlotD3 {
  constructor(element, onBrushUpdate) {
    this.svg = d3.select(element);
    this.onBrushUpdate = onBrushUpdate;

    this.margin = { top: 20, right: 30, bottom: 50, left: 70 };
    this.width  = +this.svg.attr('width')  - this.margin.left - this.margin.right;
    this.height = +this.svg.attr('height') - this.margin.top  - this.margin.bottom;

    this.g = this.svg.append('g').attr(
      'transform',
      `translate(${this.margin.left},${this.margin.top})`
    );

    this.xScale = d3.scaleLinear().range([0, this.width]);
    this.yScale = d3.scaleLinear().range([this.height, 0]);

    this.xAxis = d3.axisBottom(this.xScale);
    this.yAxis = d3.axisLeft(this.yScale);

    this.xAxisGroup = this.g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.height})`);
    this.yAxisGroup = this.g.append('g')
      .attr('class', 'y-axis');

    this.g.append('text')
      .attr('class', 'x-label')
      .attr('x', this.width / 2)
      .attr('y', this.height + 40)
      .attr('text-anchor', 'middle')
      .style('font-weight', 600)
      .text('Area (sq ft)');

    this.g.append('text')
      .attr('class', 'y-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', -55)
      .attr('x', -this.height / 2)
      .attr('text-anchor', 'middle')
      .style('font-weight', 600)
      .text('Price (unit)');

    this.brush = d3.brush()
      .extent([[0, 0], [this.width, this.height]])
      .on('brush end', (event) => this.brushed(event));

    this.brushGroup = this.g.append('g')
      .attr('class', 'brush')
      .call(this.brush);

    this.circles = this.g.append('g').attr('class', 'circles');
  }

  update(data, selectedIdSet = new Set()) {
    this.data = data;
    this.selectedIdSet = selectedIdSet;

    const maxArea = d3.max(data, d => +d.area) || 0;
    const maxPrice = d3.max(data, d => +d.price) || 0;
    const padArea = 0.05 * (maxArea || 1);
    const padPrice = 0.05 * (maxPrice || 1);

    this.xScale.domain([0, maxArea + padArea]);
    this.yScale.domain([0, maxPrice + padPrice]);

    this.xAxisGroup.call(this.xAxis);
    this.yAxisGroup.call(this.yAxis);

    const circles = this.circles.selectAll('circle')
      .data(data, d => d.id);

    circles.exit()
      .transition().duration(200)
      .attr('r', 0)
      .remove();

    const enter = circles.enter().append('circle').attr('r', 0);

    const hasSel = this.selectedIdSet.size > 0;

    enter.merge(circles)
      .attr('cx', d => this.xScale(d.area))
      .attr('cy', d => this.yScale(d.price))
      .attr('r', 5)
      .attr('fill', d =>
        hasSel ? (this.selectedIdSet.has(d.id) ? '#4F46E5' : '#A7F3D0') : '#A7F3D0'
      )
      .attr('opacity', d =>
        hasSel ? (this.selectedIdSet.has(d.id) ? 0.9 : 0.2) : 0.8
      )
      .attr('stroke', d =>
        hasSel && this.selectedIdSet.has(d.id) ? '#6D28D9' : '#999'
      )
      .attr('stroke-width', d =>
        hasSel && this.selectedIdSet.has(d.id) ? 1.5 : 0.5
      );
  }

  brushed(event) {
    if (!event.selection) {
      this.onBrushUpdate([]);
      return;
    }
    const [[x0, y0], [x1, y1]] = event.selection;
    const ids = this.data
      .filter(d => {
        const cx = this.xScale(d.area);
        const cy = this.yScale(d.price);
        return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
      })
      .map(d => d.id);
    this.onBrushUpdate(ids);
  }
}

export default ScatterPlotD3;
