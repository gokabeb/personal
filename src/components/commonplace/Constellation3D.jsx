import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { UMAP } from 'umap-js';

// Copied from ConstellationCanvas.jsx — keep in sync if tags are added
const TAG_COLORS = {
  grief: '#8B7355', technology: '#4A7C9E', 'san-francisco': '#6B8C42',
  play: '#9B7BAD', identity: '#C49A6C', poetry: '#B07070',
  learning: '#5A8C8C', philosophy: '#7A7A9E', neuroscience: '#6A9E8C',
  attention: '#9E9E4A', art: '#B08060', community: '#8C6A8C',
  resilience: '#7A9E6A', "beginner's-mind": '#6A8C9E', design: '#9E7A5A',
  media: '#6A7A9E', mind: '#8C7A9E', paradox: '#9E6A6A',
  creativity: '#C4906A', narrative: '#8C7A6A', self: '#9E8A6A',
  storytelling: '#8C7060', questions: '#7A9E8C', agency: '#9E8A7A',
  psychology: '#7A8CA0', place: '#6A8C7A', presence: '#8A9E7A',
  vision: '#7A8C9E', cities: '#8A9E9E', zen: '#9E9E8A',
  research: '#6A9E9E', emotion: '#B07890', craft: '#9E8070',
  communication: '#7890A0', ethics: '#9E7070', generosity: '#9E9070',
};

function getTagColor(tags) {
  for (const tag of (tags || [])) {
    if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  }
  return '#6A7A8A';
}

// Returns edges with shared tags included
function computeJaccardEdges(entries) {
  const links = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const tagsA = entries[i].tags ?? [];
      const tagsB = entries[j].tags ?? [];
      const shared = tagsA.filter(t => tagsB.includes(t));
      if (shared.length === 0) continue;
      const union = new Set([...tagsA, ...tagsB]).size;
      links.push({ i, j, similarity: shared.length / union, sharedTags: shared });
    }
  }
  return links;
}

function normalizePositions(raw) {
  const xs = raw.map(p => p[0]);
  const ys = raw.map(p => p[1]);
  const zs = raw.map(p => p[2]);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const [minZ, maxZ] = [Math.min(...zs), Math.max(...zs)];
  const scale = 18;
  const norm = (v, lo, hi) => hi === lo ? 0 : ((v - lo) / (hi - lo) - 0.5) * scale;
  return raw.map(p => ({
    x: norm(p[0], minX, maxX),
    y: norm(p[1], minY, maxY),
    z: norm(p[2], minZ, maxZ),
  }));
}

export default function Constellation3D({ entries = [], onSelectEntry, searchQuery = '' }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const nodeObjectsRef = useRef([]);
  const frameRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [noEmbeddings, setNoEmbeddings] = useState(false);
  const [hoveredEntry, setHoveredEntry] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [connectionLabels, setConnectionLabels] = useState([]); // [{ x, y, tags }]

  useEffect(() => {
    const validEntries = entries.filter(e => e.embedding);
    if (!containerRef.current) return;
    if (!validEntries.length) {
      setNoEmbeddings(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function buildScene() {
      let positions;

      // Use pre-computed positions if available (instant) — fall back to client UMAP
      const hasPrecomputed = validEntries.every(e => e.posX != null && e.posY != null && e.posZ != null);
      if (hasPrecomputed) {
        positions = validEntries.map(e => ({ x: e.posX, y: e.posY, z: e.posZ }));
      } else {
        const embeddings = validEntries.map(e =>
          typeof e.embedding === 'string' ? JSON.parse(e.embedding) : e.embedding
        );
        const nNeighbors = Math.min(15, validEntries.length - 1);
        const umap = new UMAP({ nComponents: 3, nNeighbors, minDist: 0.1 });
        const raw3d = await umap.fitAsync(embeddings);
        if (cancelled) return;
        positions = normalizePositions(raw3d);
      }

      const width = containerRef.current.clientWidth || 800;
      const height = containerRef.current.clientHeight || 500;

      // Scene
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.set(0, 0, 25);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(10, 10, 10);
      scene.add(dir);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.addEventListener('start', () => { controls.autoRotate = false; });

      // Edges — individual Line objects so each can be highlighted independently
      const edges = computeJaccardEdges(validEntries);
      const connectionCount = new Array(validEntries.length).fill(0);
      edges.forEach(({ i, j }) => { connectionCount[i]++; connectionCount[j]++; });

      // edgeObjects: { line, i, j, sharedTags, midpoint }
      const edgeObjects = edges.map(({ i, j, sharedTags }) => {
        const a = positions[i], b = positions[j];
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(a.x, a.y, a.z),
          new THREE.Vector3(b.x, b.y, b.z),
        ]);
        const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 });
        const line = new THREE.Line(geo, mat);
        scene.add(line);
        return {
          line,
          i, j,
          sharedTags,
          midpoint: new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2),
        };
      });

      // Nodes
      const nodeObjects = [];
      validEntries.forEach((entry, idx) => {
        const pos = positions[idx];
        const r = Math.min(0.3 + connectionCount[idx] * 0.1, 0.8);
        const geo = new THREE.SphereGeometry(r, 16, 16);
        const col = new THREE.Color(getTagColor(entry.tags));
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.2 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.userData = { entry, baseRadius: r, index: idx };
        scene.add(mesh);
        nodeObjects.push(mesh);
      });
      nodeObjectsRef.current = nodeObjects;

      // Project a 3D point to 2D container-relative screen coords
      function projectToScreen(point3d) {
        const v = point3d.clone().project(camera);
        const rect = containerRef.current?.getBoundingClientRect();
        const w = rect?.width ?? width;
        const h = rect?.height ?? height;
        return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
      }

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const resetEdges = () => {
        edgeObjects.forEach(({ line }) => {
          line.material.opacity = 0.08;
          line.material.color.setHex(0xffffff);
        });
      };

      const onMouseMove = (e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(nodeObjects);

        if (hits.length > 0) {
          const mesh = hits[0].object;
          const idx = mesh.userData.index;

          setHoveredEntry(mesh.userData.entry);
          setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 12 });

          // Pause auto-rotate while hovering
          controls.autoRotate = false;

          // Reset all nodes and edges
          nodeObjects.forEach(n => { n.material.emissive = new THREE.Color(0, 0, 0); });
          resetEdges();

          // Highlight hovered node
          mesh.material.emissive = new THREE.Color(0.15, 0.15, 0.15);

          // Highlight connected edges + build label list
          const labels = [];
          edgeObjects.forEach(({ line, i, j, sharedTags, midpoint }) => {
            if (i === idx || j === idx) {
              line.material.opacity = 0.6;
              line.material.color.setHex(0xffffff);
              // Dim the non-hovered endpoint node slightly
              const otherMesh = nodeObjects[i === idx ? j : i];
              if (otherMesh) otherMesh.material.emissive = new THREE.Color(0.05, 0.05, 0.05);
              const screen = projectToScreen(midpoint);
              labels.push({ x: screen.x, y: screen.y, tags: sharedTags });
            }
          });
          setConnectionLabels(labels);
          containerRef.current.style.cursor = 'pointer';
        } else {
          setHoveredEntry(null);
          setConnectionLabels([]);
          nodeObjects.forEach(n => { n.material.emissive = new THREE.Color(0, 0, 0); });
          resetEdges();
          containerRef.current.style.cursor = 'default';
        }
      };

      const onClick = (e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(nodeObjects);
        if (hits.length > 0) onSelectEntry?.(hits[0].object.userData.entry);
      };

      const onMouseLeave = () => {
        setHoveredEntry(null);
        setConnectionLabels([]);
        nodeObjects.forEach(n => { n.material.emissive = new THREE.Color(0, 0, 0); });
        resetEdges();
      };

      const onResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('click', onClick);
      renderer.domElement.addEventListener('mouseleave', onMouseLeave);
      window.addEventListener('resize', onResize);

      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
      setLoading(false);

      rendererRef.current._cleanup = () => {
        cancelAnimationFrame(frameRef.current);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('click', onClick);
        renderer.domElement.removeEventListener('mouseleave', onMouseLeave);
        window.removeEventListener('resize', onResize);
        controls.dispose();
        scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) obj.material.dispose();
        });
        renderer.dispose();
        if (containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
      };
    }

    buildScene();

    return () => {
      cancelled = true;
      rendererRef.current?._cleanup?.();
    };
  }, [entries]);

  // Search: fade non-matching nodes
  useEffect(() => {
    const nodes = nodeObjectsRef.current;
    if (!nodes.length) return;
    const q = searchQuery.toLowerCase();
    nodes.forEach(mesh => {
      const { entry } = mesh.userData;
      if (!q) {
        mesh.material.opacity = 1;
        mesh.material.transparent = false;
        return;
      }
      const matches =
        entry.quote?.toLowerCase().includes(q) ||
        entry.sourceAuthor?.toLowerCase().includes(q) ||
        entry.tags?.some(t => t.toLowerCase().includes(q));
      mesh.material.opacity = matches ? 1 : 0.05;
      mesh.material.transparent = true;
    });
  }, [searchQuery]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {loading && !noEmbeddings && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="font-mono text-[0.65rem] tracking-widest uppercase text-white/40 animate-pulse">
            Mapping semantic space…
          </p>
        </div>
      )}
      {noEmbeddings && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="font-mono text-[0.65rem] tracking-widest uppercase text-white/30">
            Run seed script to enable 3D view
          </p>
        </div>
      )}

      {/* Node tooltip */}
      {hoveredEntry && (
        <div
          className="absolute pointer-events-none z-20 max-w-[220px] bg-[#1A1A17]/90 border border-white/10 p-3 backdrop-blur-sm"
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

      {/* Connection labels — shared tags at each edge midpoint */}
      {connectionLabels.map((label, i) => (
        <div
          key={i}
          className="absolute pointer-events-none z-10"
          style={{ left: label.x, top: label.y, transform: 'translate(-50%, -50%)' }}
        >
          <div className="flex flex-wrap gap-0.5 justify-center max-w-[100px]">
            {label.tags.map(tag => (
              <span
                key={tag}
                className="font-mono text-[0.5rem] tracking-widest uppercase bg-[#111110]/90 border border-white/20 px-1.5 py-0.5 text-white/60"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
