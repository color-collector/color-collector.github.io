// Decorative ambient pixels, independent of the collection and its RNG.
export function startAmbientPixels(layer) {
  if (!layer) return;
  const size = 20;
  const duration = 3000;
  const maxCoverage = 0.05;
  const active = new Set();
  const occupied = new Map();
  let next = 0;
  let frame = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function clear() {
    for (const node of active) node.remove();
    active.clear();
    occupied.clear();
  }
  function spawn(now) {
    const area = window.innerWidth * window.innerHeight;
    const maxCount = Math.max(0, Math.floor(area * maxCoverage / (size * size)));
    if (active.size >= maxCount) return;
    const node = document.createElement('span');
    node.className = 'ambient-pixel';
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width < size || height < size) return;
    let position = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const x = Math.random() * (width - size);
      const y = Math.random() * (height - size);
      const overlaps = [...occupied.values()].some(p =>
        x < p.x + size && x + size > p.x &&
        y < p.y + size && y + size > p.y
      );
      if (!overlaps) { position = {x, y}; break; }
    }
    if (!position) return;
    node.style.left = `${position.x}px`;
    node.style.top = `${position.y}px`;
    const color = `rgb(${Math.floor(Math.random()*256)} ${Math.floor(Math.random()*256)} ${Math.floor(Math.random()*256)})`;
    node.style.setProperty('--ambient-color', color);
    node.addEventListener('animationend', () => {active.delete(node);occupied.delete(node);node.remove();}, {once:true});
    layer.append(node);
    active.add(node);
    occupied.set(node, position);
  }
  function tick(now) {
    if (reducedMotion.matches || document.hidden) {
      if (active.size) clear();
    } else if (now >= next) {
      spawn(now);
      const target = Math.floor(window.innerWidth * window.innerHeight * maxCoverage / (size*size));
      // Target occupancy around 5%, without creating a large burst at once.
      next = now + Math.max(35, duration / Math.max(1, target));
    }
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  window.addEventListener('pagehide', () => {cancelAnimationFrame(frame);clear();}, {once:true});
}
