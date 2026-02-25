import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// To load live data from Supabase, replace `entries` prop fetch with:
// const { data } = await supabase.from('commonplace_entries').select('*');

const TAG_COLORS = {
  grief: '#8B7355',
  technology: '#4A7C9E',
  'san-francisco': '#6B8C42',
  play: '#9B7BAD',
  identity: '#C49A6C',
  poetry: '#B07070',
  learning: '#5A8C8C',
  philosophy: '#7A7A9E',
  neuroscience: '#6A9E8C',
  attention: '#9E9E4A',
  art: '#B08060',
  community: '#8C6A8C',
  resilience: '#7A9E6A',
  'beginner\'s-mind': '#6A8C9E',
  design: '#9E7A5A',
  media: '#6A7A9E',
  mind: '#8C7A9E',
  paradox: '#9E6A6A',
  creativity: '#C4906A',
  narrative: '#8C7A6A',
  self: '#9E8A6A',
  storytelling: '#8C7060',
  questions: '#7A9E8C',
  agency: '#9E8A7A',
  psychology: '#7A8CA0',
  place: '#6A8C7A',
  presence: '#8A9E7A',
  vision: '#7A8C9E',
  cities: '#8A9E9E',
  zen: '#9E9E8A',
  research: '#6A9E9E',
  emotion: '#B07890',
  craft: '#9E8070',
  communication: '#7890A0',
  ethics: '#9E7070',
  generosity: '#9E9070',
};

function getTagColor(tags) {
  for (const tag of (tags || [])) {
    if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  }
  return '#6A7A8A';
}

// Hardcoded similarity edges for placeholder data (would come from vector similarity in production)
const SIMILARITY_EDGES = [
  { source: 'cp-001', target: 'cp-007', similarity: 0.85 },
  { source: 'cp-001', target: 'cp-014', similarity: 0.88 },
  { source: 'cp-003', target: 'cp-006', similarity: 0.84 },
  { source: 'cp-003', target: 'cp-016', similarity: 0.92 },
  { source: 'cp-004', target: 'cp-009', similarity: 0.83 },
  { source: 'cp-004', target: 'cp-015', similarity: 0.86 },
  { source: 'cp-005', target: 'cp-013', similarity: 0.84 },
  { source: 'cp-007', target: 'cp-014', similarity: 0.91 },
  { source: 'cp-008', target: 'cp-010', similarity: 0.89 },
  { source: 'cp-009', target: 'cp-014', similarity: 0.87 },
  { source: 'cp-010', target: 'cp-016', similarity: 0.83 },
  { source: 'cp-011', target: 'cp-012', similarity: 0.84 },
  { source: 'cp-013', target: 'cp-003', similarity: 0.85 },
  { source: 'cp-015', target: 'cp-012', similarity: 0.83 },
  { source: 'cp-002', target: 'cp-011', similarity: 0.84 },
  { source: 'cp-006', target: 'cp-013', similarity: 0.86 },
];

export default function ConstellationCanvas({ entries = [], onSelectEntry, searchQuery = '' }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const [hoveredEntry, setHoveredEntry] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!entries.length || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Count connections per node
    const connectionCount = {};
    entries.forEach(e => { connectionCount[e.id] = 0; });
    SIMILARITY_EDGES.forEach(edge => {
      if (connectionCount[edge.source] !== undefined) connectionCount[edge.source]++;
      if (connectionCount[edge.target] !== undefined) connectionCount[edge.target]++;
    });

    const nodes = entries.map(e => ({
      ...e,
      r: 4 + (connectionCount[e.id] || 0) * 2,
      color: getTagColor(e.tags),
    }));

    const links = SIMILARITY_EDGES
      .filter(e => e.similarity > 0.82)
      .map(e => ({ ...e }));

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom
    svg.call(
      d3.zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // Links
    const linkSel = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 1);

    // Nodes
    const nodeSel = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => d.r)
      .attr('fill', d => d.color)
      .attr('cursor', 'pointer')
      .attr('class', 'constellation-node')
      .on('mouseover', (event, d) => {
        setHoveredEntry(d);
        const rect = containerRef.current.getBoundingClientRect();
        setTooltipPos({
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top - 12,
        });
        d3.select(event.currentTarget)
          .style('filter', 'drop-shadow(0 0 8px currentColor)')
          .attr('r', d.r * 1.4);
      })
      .on('mousemove', (event) => {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltipPos({
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top - 12,
        });
      })
      .on('mouseout', (event, d) => {
        setHoveredEntry(null);
        d3.select(event.currentTarget)
          .style('filter', null)
          .attr('r', d.r);
      })
      .on('click', (event, d) => {
        onSelectEntry?.(d);
      });

    // Force simulation
    simulationRef.current = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(d => d.r + 6))
      .alpha(0.3)
      .alphaDecay(0.02)
      .on('tick', () => {
        linkSel
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        nodeSel
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);
      });

    return () => {
      simulationRef.current?.stop();
    };
  }, [entries]);

  // Search filter effect
  useEffect(() => {
    if (!svgRef.current) return;

    const allNodes = d3.select(svgRef.current).selectAll('.constellation-node');

    if (!searchQuery) {
      allNodes.attr('opacity', 1);
      return;
    }

    const q = searchQuery.toLowerCase();
    allNodes.attr('opacity', (d) => {
      const matches =
        d.quote?.toLowerCase().includes(q) ||
        d.sourceAuthor?.toLowerCase().includes(q) ||
        d.tags?.some(t => t.toLowerCase().includes(q));
      return matches ? 1 : 0.05;
    });
  }, [searchQuery]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />

      {/* Tooltip */}
      {hoveredEntry && (
        <div
          className="absolute pointer-events-none z-10 max-w-[220px] bg-[#1A1A17]/90 border border-white/10 p-3 backdrop-blur-sm"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <p className="font-display italic text-[0.75rem] text-white/90 leading-[1.4] mb-1.5 line-clamp-3">
            "{hoveredEntry.quote}"
          </p>
          <p className="font-mono text-[0.6rem] tracking-wider uppercase text-[#E85D75]">
            {hoveredEntry.sourceAuthor}
          </p>
        </div>
      )}
    </div>
  );
}
