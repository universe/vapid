export default function highlight() {
  if ((window as any).__HIGHLIGHT__) { return; }
  (window as any).__HIGHLIGHT__ = true;
  console.log('START');
  const marker = document.getElementById('editor-marker') || document.createElement('div');
  marker.id = 'editor-marker';
  marker.classList.add('editor-marker');

  const style = document.getElementById('editor-style') || document.createElement('style');
  style.id = 'editor-marker';
  style.innerHTML = `
    [data-neutrino="content"] { display: contents; }
    [data-neutrino="content"]:empty { height: 0; width: 100%; }
    .editor-marker {
      --color: 43, 113, 178;
      position: fixed;
      top: 0;
      left: 0;
      transform-origin: 50% 50%;
      opacity: 0;
      transform: translate(0px, 0px);
      width: 18px;
      height: 18px;
      background: transparent;
      pointer-events: none;
      cursor: pointer;
      box-sizing: border-box;
      border: 3px solid rgb(var(--color));
      border-radius: 0.6rem;
      transition: all .24s ease-in-out;
      z-index: 999999999999;
    }
    .editor-marker::after {
      content: "Press Enter to Edit ↵";
      font-weight: bold;
      background: rgb(var(--color));
      color: white;
      padding: 6px 12px;
      font-size: 1.4rem;
      position: absolute;
      top: 100%;
      right: -3px;
      border-radius: 0 0 8px 8px;
    }
    .editor-marker::before {
      content: "";
      position: absolute;
      right: -3px;
      bottom: 0px;
      background: rgb(var(--color));
      width: 3px;
      height: 3px;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(var(--color), 0.4); }
      70% { box-shadow: 0 0 0 12px rgba(var(--color), 0); }
      100% { box-shadow: 0 0 0 0 rgba(var(--color), 0); }
    }
  `;
  
  let timeout: NodeJS.Timeout | null = null;
  
  const INITIAL_BOUNDS = { x: Infinity, y: Infinity, xMin: Infinity, xMax: -Infinity, yMin: Infinity, yMax: -Infinity };
  const bounds = { x: 0, y: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
  let selector: string | null = null;
  let scrolledElement: HTMLElement | null = null;
  function elementArr(container: HTMLElement): HTMLElement[] {
    const type = container.getAttribute(`data-neutrino`);
    return (
      type === 'attribute' 
      ? [container] 
      : Array.from(
        container.childElementCount 
        ? container.children 
        : (
          container.hasChildNodes() 
          ? [container.parentElement] 
          : [container]
        ),
      )
    ) as HTMLElement[];
  }
  
  const PAD = 6;
  let container: HTMLElement | null = null;
  const observer = new IntersectionObserver((entries) => {
    observer.disconnect();
    bounds.x = INITIAL_BOUNDS.x;
    bounds.y = INITIAL_BOUNDS.y;
    bounds.xMin = INITIAL_BOUNDS.xMin;
    bounds.xMax = INITIAL_BOUNDS.xMax;
    bounds.yMin = INITIAL_BOUNDS.yMin;
    bounds.yMax = INITIAL_BOUNDS.yMax;
    for (const entry of entries) {
      const rect = entry.boundingClientRect;
      bounds.x = Math.min(bounds.x, rect.left);
      bounds.y = Math.min(bounds.y, rect.top);
      bounds.xMin = Math.min(bounds.xMin, rect.left);
      bounds.xMax = Math.max(bounds.xMax, rect.left + rect.width);
      bounds.yMin = Math.min(bounds.yMin, rect.top);
      bounds.yMax = Math.max(bounds.yMax, rect.top + rect.height);
    }
  
    const newScrollPosition = document.scrollingElement ? document.scrollingElement.scrollTop : 0;
    const animate = (marker as any).computedStyleMap().get('opacity').value > 0.1 && scrollPosition === newScrollPosition;
    scrollPosition = newScrollPosition;
    marker.setAttribute('style', `
      animation: pulse 2s infinite;
      opacity: 1;
      transition: ${animate ? 'all .24s ease-in-out' : 'opacity .24s ease-in-out'};
      transform: translate(${bounds.x - PAD}px, ${bounds.y - PAD}px);
      width: ${(bounds.xMax - bounds.xMin) + PAD + PAD}px;
      height: ${(bounds.yMax - bounds.yMin) + PAD + PAD};
    `);
    if (scrolledElement !== container) {
      scrolledElement = container as HTMLElement;
      setTimeout(() => container && elementArr(container)[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 240);
    }
    window.requestAnimationFrame(positionMarker);
  });
  
  let scrollPosition = document.scrollingElement ? document.scrollingElement.scrollTop : 0;
  function positionMarker() {
    if (!document.documentElement) { window.requestAnimationFrame(positionMarker); return; }
    if (!document.documentElement.contains(marker)) {
      document.documentElement.appendChild(marker);
      document.documentElement.appendChild(style);
    }
  
    container = selector ? document.body.querySelector(selector) as HTMLElement : null;
    if (!container || !selector) {
      marker.setAttribute('style', `
        opacity: 0;
        transition: opacity .24s ease-in-out;
        transform: translate(${bounds.x - PAD}px, ${bounds.y - PAD}px);
        width: ${(bounds.xMax - bounds.xMin) + PAD + PAD}px;
        height: ${(bounds.yMax - bounds.yMin) + PAD + PAD};
      `);
      window.requestAnimationFrame(positionMarker);
      return;
    }
    elementArr(container).map((e: HTMLElement) => observer.observe(e));
  }
  positionMarker();
  
  let prevSelector: string | null = null;
  window.addEventListener('message', (event: Event) => {
    const data = (event as any).data;
    timeout && clearTimeout(timeout);
    if (selector === `[data-neutrino-${data.target}]`) { return; }
    if (data.target === null) {
      prevSelector = null;
      return timeout = setTimeout(() => {
        timeout = selector = null;
      }, 300);
    }
  
    prevSelector = selector = `[data-neutrino-${data.target}]`;
    return;
  }, false);
  
  document.addEventListener('mouseover', (evt: Event) => {
    let el: HTMLElement | null = evt.target as HTMLElement;
    while (el) {
      if (el.dataset?.neutrino) { break; }
      el = el.parentNode as HTMLElement | null;
    }
    if (el) {
      timeout && clearTimeout(timeout);
      scrolledElement = el;
      selector = `[data-neutrino-id="${el.dataset.neutrinoId}"]`;
    }
  });
  
  document.addEventListener('mouseout', (_evt: Event) => {
    selector = prevSelector || null;
  });

  document.addEventListener('click', (evt: Event) => {
    let el: HTMLElement | null = evt.target as HTMLElement;
    while (el) {
      if (el.hasAttribute('data-neutrino-interactive')) {
        return;
      }
      el = el.parentElement;
    }
    evt.preventDefault();
    evt.stopImmediatePropagation();
  });

  const resizeObserver = new ResizeObserver(() => {
    if (document.body.clientWidth < 600) {
      const container = document.getElementById('body');
      container && (container.scrollLeft = document.body.clientWidth);
    }
  });
  resizeObserver.observe(document.body);
}
