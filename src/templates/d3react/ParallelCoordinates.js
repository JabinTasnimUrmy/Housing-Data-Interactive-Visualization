import React, { useRef, useEffect } from 'react';
import ParallelCoordinatesD3 from './ParallelCoordinatesD3';

function ParallelCoordinates({ data, selectedIdSet, onBrushUpdate }) {
  const svgRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;
    if (!chartRef.current) {
      chartRef.current = new ParallelCoordinatesD3(svgRef.current, onBrushUpdate);
    }
    chartRef.current.update(data, selectedIdSet);
  }, [data, selectedIdSet, onBrushUpdate]);

  return (
    <div className="chart-container">
      <svg ref={svgRef} width={1400} height={900}></svg>
    </div>
  );
}

export default ParallelCoordinates;
