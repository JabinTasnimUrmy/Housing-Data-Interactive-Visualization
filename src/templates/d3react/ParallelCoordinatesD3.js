import * as d3 from 'd3';

// Base (light) and selected (dark) colors and sizes
const BASE_COLOR = '#93c5fd';
const BASE_OPACITY = 0.28;
const UNSELECTED_OPACITY = 0.07;
const SELECTED_COLOR = '#9b2929ff';
const SELECTED_OPACITY = 0.90;
const BASE_WIDTH = 1.15;
const SELECTED_WIDTH = 2.6;
const HOVER_COLOR = '#4c982eff'; // Orange for hover
const HOVER_WIDTH = 3.5;

class ParallelCoordinatesD3 {
  constructor(element, onBrushUpdate) {
    this.svg = d3.select(element);
    this.onBrushUpdate = onBrushUpdate;

    this.margin = { top: 30, right: 30, bottom: 30, left: 30 };
    this.width =
      +this.svg.attr('width') - this.margin.left - this.margin.right;
    this.height =
      +this.svg.attr('height') - this.margin.top - this.margin.bottom;

    this.g = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    this.dimensions = ['price', 'area', 'bedrooms', 'bathrooms', 'stories', 'parking'];

    this.xScale = d3
      .scalePoint()
      .domain(this.dimensions)
      .range([0, this.width])
      .padding(0.5);

    this.y = {};
    this.isNumeric = {};
    this.brushRanges = {};
    
    // Track manually clicked IDs
    this.manuallySelectedIds = new Set();

    this.background = this.g.append('g');
    this.foreground = this.g.append('g');
    this.axesGroup = this.g.append('g');
  }

  update(data, selectedIdSet = new Set()) {
    this.data = data;
    this.selectedIdSet = selectedIdSet;

    // Build y scales
    this.dimensions.forEach((dim) => {
      const values = this.data.map((r) => r[dim]);
      const nums = values.map((v) => (v == null ? NaN : +v));
      const numeric = nums.every((v) => !Number.isNaN(v));
      this.isNumeric[dim] = numeric;
      if (numeric) {
        const min = d3.min(nums);
        const max = d3.max(nums);
        this.y[dim] = d3
          .scaleLinear()
          .domain([min, max])
          .range([this.height, 0])
          .nice();
      } else {
        const domain = Array.from(new Set(values));
        this.y[dim] = d3
          .scalePoint()
          .domain(domain)
          .range([this.height, 0])
          .padding(0.5);
      }
    });

    // Draw background (context) lines
    const line = d3
      .line()
      .x((p) => this.xScale(p.dimension))
      .y((p) => this.y[p.dimension](p.value));

    const bg = this.background.selectAll('path').data(this.data, (d) => d.id);
    bg.exit().remove();
    bg.enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 1)
      .merge(bg)
      .attr('d', (d) => {
        const pts = this.dimensions.map((dim) => ({
          dimension: dim,
          value: this.isNumeric[dim] ? +d[dim] : d[dim],
        }));
        return line(pts);
      });

    // Draw foreground lines
    const fg = this.foreground
      .selectAll('path.polyline')
      .data(this.data, (d) => d.id);
    
    fg.exit().remove();
    
    const fgEnter = fg.enter()
      .append('path')
      .attr('class', 'polyline')
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');

    const fgMerged = fgEnter.merge(fg);
    
    // ========== FIXED: Store selectedIdSet reference before using in callbacks ==========
    const selectedIdSet_ref = this.selectedIdSet;
    
    fgMerged
      // Multi-select click handler
      .on('click', (event, d) => {
        event.stopPropagation();
        
        const isMultiSelect = event.ctrlKey || event.metaKey;
        
        if (isMultiSelect) {
          if (this.manuallySelectedIds.has(d.id)) {
            this.manuallySelectedIds.delete(d.id);
          } else {
            this.manuallySelectedIds.add(d.id);
          }
        } else {
          this.manuallySelectedIds.clear();
          this.manuallySelectedIds.add(d.id);
        }
        
        const selectedIds = Array.from(this.manuallySelectedIds);
        this.highlightSelectedByIdSet(new Set(selectedIds));
        
        if (this.onBrushUpdate) {
          this.onBrushUpdate(selectedIds);
        }
      })
      // Hover handler
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke', HOVER_COLOR)
          .attr('stroke-width', HOVER_WIDTH)
          .attr('stroke-opacity', 1)
          .raise();
      })
      // ========== FIXED: Use arrow function to preserve 'this' context ==========
      .on('mouseout', (event, d) => {
        const isSelected = this.selectedIdSet.has(d.id);
        const hasSel = this.selectedIdSet.size > 0;
        
        d3.select(event.currentTarget)
          .attr('stroke', isSelected ? SELECTED_COLOR : BASE_COLOR)
          .attr('stroke-width', isSelected ? SELECTED_WIDTH : BASE_WIDTH)
          .attr('stroke-opacity', hasSel 
            ? (isSelected ? SELECTED_OPACITY : UNSELECTED_OPACITY)
            : BASE_OPACITY
          );
      })
      .style('cursor', 'pointer')
      .attr('d', (d) => {
        const pts = this.dimensions.map((dim) => ({
          dimension: dim,
          value: this.isNumeric[dim] ? +d[dim] : d[dim],
        }));
        return line(pts);
      })
      .attr('stroke', (d) =>
        this.selectedIdSet.has(d.id) ? SELECTED_COLOR : BASE_COLOR
      )
      .attr('stroke-width', (d) =>
        this.selectedIdSet.has(d.id) ? SELECTED_WIDTH : BASE_WIDTH
      )
      .attr('stroke-opacity', (d) => {
        const hasSel = this.selectedIdSet.size > 0;
        return hasSel
          ? this.selectedIdSet.has(d.id)
            ? SELECTED_OPACITY
            : UNSELECTED_OPACITY
          : BASE_OPACITY;
      })
      // ========== FIXED: Use captured reference instead of 'this' ==========
      .each(function(d) {
        if (selectedIdSet_ref.has(d.id)) {
          d3.select(this).raise();
        }
      });

    // Draw axes & brushes
    const axes = this.axesGroup.selectAll('.dimension').data(this.dimensions);
    axes.exit().remove();
    const axesEnter = axes.enter().append('g').attr('class', 'dimension');
    axesEnter.append('g').attr('class', 'axis');
    axesEnter.append('text')
      .attr('class', 'axis-label')
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-weight', 600)
      .style('pointer-events', 'none');
    axesEnter.append('g').attr('class', 'brush');

    axesEnter
      .merge(axes)
      .attr('transform', (dim) => `translate(${this.xScale(dim)},0)`)
      .each((dim, i, nodes) => {
        const g = d3.select(nodes[i]);
        g.select('.axis').call(d3.axisLeft(this.y[dim]).ticks(6));
        g.select('.axis-label').text(dim.charAt(0).toUpperCase() + dim.slice(1));
        const brush = d3
          .brushY()
          .extent([[-12, 0], [12, this.height]])
          .on('brush end', (event) => this.brushEvent(dim, event));
        g.select('.brush').call(brush);
      });

    this.highlightSelectedByIdSet(this.selectedIdSet);
  }

  highlightSelectedByIdSet(idSet) {
    const hasSel = idSet && idSet.size > 0;
    this.foreground.selectAll('path.polyline')
      .attr('stroke', (d) => (hasSel && idSet.has(d.id) ? SELECTED_COLOR : BASE_COLOR))
      .attr('stroke-width', (d) => (hasSel && idSet.has(d.id) ? SELECTED_WIDTH : BASE_WIDTH))
      .attr('stroke-opacity', (d) =>
        hasSel ? (idSet.has(d.id) ? SELECTED_OPACITY : UNSELECTED_OPACITY) : BASE_OPACITY
      )
      .each(function (d) {
        if (hasSel && idSet.has(d.id)) d3.select(this).raise();
      });
  }

  brushEvent(dim, event) {
    // Clear manual selections when brushing
    this.manuallySelectedIds.clear();
    
    if (!event.selection) {
      delete this.brushRanges[dim];
    } else {
      const [y0, y1] = event.selection;
      if (this.isNumeric[dim]) {
        const min = this.y[dim].invert(y1);
        const max = this.y[dim].invert(y0);
        this.brushRanges[dim] = { type: 'numeric', min, max };
      } else {
        const domain = this.y[dim].domain();
        const nearestIndex = (y) => {
          let bestI = 0;
          let bestDist = Infinity;
          domain.forEach((v, i) => {
            const dist = Math.abs(this.y[dim](v) - y);
            if (dist < bestDist) {
              bestDist = dist;
              bestI = i;
            }
          });
          return bestI;
        };
        const iMin = nearestIndex(y1);
        const iMax = nearestIndex(y0);
        this.brushRanges[dim] = {
          type: 'categorical',
          iMin: Math.min(iMin, iMax),
          iMax: Math.max(iMin, iMax)
        };
      }
    }

    const selectedIds = this.data
      .filter((row) => {
        return Object.keys(this.brushRanges).every((dn) => {
          const spec = this.brushRanges[dn];
          if (spec.type === 'numeric') {
            const v = +row[dn];
            return v >= spec.min && v <= spec.max;
          } else {
            const domain = this.y[dn].domain();
            const idx = domain.indexOf(row[dn]);
            return idx >= spec.iMin && idx <= spec.iMax;
          }
        });
      })
      .map((d) => d.id);

    this.highlightSelectedByIdSet(new Set(selectedIds));
    this.onBrushUpdate(selectedIds);
  }
}

export default ParallelCoordinatesD3;
