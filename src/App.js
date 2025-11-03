import React, { useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import ScatterPlot from './components/scatterplot/ScatterPlotContainer';
import ParallelCoordinates from './templates/d3react/ParallelCoordinates';
function App() {
  const [data, setData] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    d3.csv('/Housing.csv').then((raw) => {
      const processed = raw.map((d, i) => ({
        id: Number(i),
        price: +d.price,
        area: +d.area,
        bedrooms: +d.bedrooms,
        bathrooms: +d.bathrooms,
        stories: +d.stories,
        parking: +d.parking,
        mainroad: d.mainroad === 'yes' ? 1 : 0,
        guestroom: d.guestroom === 'yes' ? 1 : 0,
        basement: d.basement === 'yes' ? 1 : 0,
        hotwaterheating: d.hotwaterheating === 'yes' ? 1 : 0,
        airconditioning: d.airconditioning === 'yes' ? 1 : 0,
        prefarea: d.prefarea === 'yes' ? 1 : 0,
        furnishingstatus: d.furnishingstatus
      }));
      setData(processed);
      setSelectedIds([]);
    });
  }, []);

  // A Set for quick lookups
  const selectedIdSet = useMemo(
    () => new Set(selectedIds.map(Number)),
    [selectedIds]
  );

  // Normalize payload to array of IDs 
  const handleBrushUpdate = (payload) => {
    if (!Array.isArray(payload)) {
      setSelectedIds([]);
      return;
    }
    const ids = payload.map((v) =>
      typeof v === 'object' && v !== null ? Number(v.id) : Number(v)
    );
    setSelectedIds(ids.filter((n) => Number.isFinite(n)));
  };

  const selectedData = useMemo(
    () => data.filter((d) => selectedIdSet.has(d.id)),
    [data, selectedIdSet]
  );
  const visible = selectedData.length ? selectedData : data;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Housing Data Interactive Visualization</h1>
        <p className="subtitle">
          Linked brushing between Scatterplot and Parallel Coordinates
        </p>
      </header>

      <div className="visualization-container">
        <div className="vis-section">
          <h2>Scatterplot: Price vs Area</h2>
          <ScatterPlot
            data={data}
            selectedIdSet={selectedIdSet}
            onBrushUpdate={handleBrushUpdate}
          />
        </div>

        <div className="vis-section">
          <h2>Parallel Coordinates: Multi-dimensional View</h2>
          <ParallelCoordinates
            data={data}
            selectedIdSet={selectedIdSet}
            onBrushUpdate={handleBrushUpdate}
          />
        </div>
      </div>

      <div className="info-panel">
        <h3>
          Selected Houses: {selectedData.length} of {data.length}
        </h3>
        {data.length > 0 && (
          <div className="stats">
            <div className="stat-item">
              <strong>Avg Price:</strong> 
              {(d3.mean(visible, (d) => d.price) / 1_000_000).toFixed(2)}M
            </div>
            <div className="stat-item">
              <strong>Avg Area:</strong>{' '}
              {d3.mean(visible, (d) => d.area)?.toFixed(0) ?? 0} sq ft
            </div>
            <div className="stat-item">
              <strong>Price Range:</strong> 
              {(d3.min(visible, (d) => d.price) / 1_000_000).toFixed(2)}M – 
              {(d3.max(visible, (d) => d.price) / 1_000_000).toFixed(2)}M
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
