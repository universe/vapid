// const marker = document.getElementById('editor-marker') || document.createElement('div');
// marker.id = 'editor-marker';
// marker.classList.add('editor-marker');

// const style = document.getElementById('editor-marker') || document.createElement('style');
// style.id = 'editor-marker';
// style.innerHTML = `
//   [data-neutrino="content"] { display: contents; }
//   [data-neutrino="content"]:empty { display: block; height: 0; width: 100%; }
//   .editor-marker {
//     --color: 43, 113, 178;
//     position: fixed;
//     top: 0;
//     left: 0;
//     transform-origin: 50% 50%;
//     opacity: 0;
//     transform: translate(0px, 0px);
//     width: 18px;
//     height: 18px;
//     background: transparent;
//     pointer-events: none;
//     cursor: pointer;
//     box-sizing: border-box;
//     border: 3px solid rgb(var(--color));
//     border-radius: 0.6rem;
//     transition: all .24s ease-in-out;
//     z-index: 999999999999;
//   }
//   .editor-marker::after {
//     content: "Press Enter to Edit ↵";
//     font-weight: bold;
//     background: rgb(var(--color));
//     color: white;
//     padding: 6px 12px;
//     font-size: 1.4rem;
//     position: absolute;
//     top: 100%;
//     right: -3px;
//     border-radius: 0 0 8px 8px;
//   }
//   .editor-marker::before {
//     content: "";
//     position: absolute;
//     right: -3px;
//     bottom: 0px;
//     background: rgb(var(--color));
//     width: 3px;
//     height: 3px;
//   }
//   @keyframes pulse {
//     0% { box-shadow: 0 0 0 0 rgba(var(--color), 0.4); }
//     70% { box-shadow: 0 0 0 12px rgba(var(--color), 0); }
//     100% { box-shadow: 0 0 0 0 rgba(var(--color), 0); }
//   }
// `;

// let timeout: NodeJS.Timeout | null = null;

// const INITIAL_BOUNDS = { x: Infinity, y: Infinity, xMin: Infinity, xMax: -Infinity, yMin: Infinity, yMax: -Infinity };
// let bounds = { x: 0, y: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
// let selector: string | null = null;
// let scrolledElement: HTMLElement | null = null;
// function elementArr(container: HTMLElement): HTMLElement[] {
//   const type = container.getAttribute(`data-neutrino`);
//   return (type === 'attribute' ? [container] : Array.from(container.childElementCount ? container.children : (container.hasChildNodes() ? [container.parentElement] : [container]))) as HTMLElement[];
// }

// let scrollPosition = document.scrollingElement ? document.scrollingElement.scrollTop : 0;
// function positionMarker() {
//   const PAD = 6;
//   if (!document.documentElement) { window.requestAnimationFrame(positionMarker); return; }
//   if (!document.documentElement.contains(marker)) {
//     document.documentElement.appendChild(marker);
//     document.documentElement.appendChild(style);
//   }

//   const container: HTMLElement | null = selector ? document.body.querySelector(selector) as HTMLElement : null;
//   if (!container || !selector) {
//     marker.setAttribute('style', `
//       opacity: 0;
//       transition: opacity .24s ease-in-out;
//       transform: translate(${bounds.x - PAD}px, ${bounds.y - PAD}px);
//       width: ${(bounds.xMax - bounds.xMin) + PAD + PAD}px;
//       height: ${(bounds.yMax - bounds.yMin) + PAD + PAD};
//     `);
//     window.requestAnimationFrame(positionMarker);
//     return;
//   }
//   bounds = elementArr(container)
//     .map((e: HTMLElement) => e.getBoundingClientRect())
//     .reduce((prev, rect) => ({
//       x: Math.min(prev.x, rect.left),
//       y: Math.min(prev.y, rect.top),
//       xMin: Math.min(prev.xMin, rect.left),
//       xMax: Math.max(prev.xMax, rect.left + rect.width),
//       yMin: Math.min(prev.yMin, rect.top),
//       yMax: Math.max(prev.yMax, rect.top + rect.height),
//     }), { ...INITIAL_BOUNDS });
//   const newScrollPosition = document.scrollingElement ? document.scrollingElement.scrollTop : 0;
//   const animate = (marker as any).computedStyleMap().get('opacity').value > 0.1 && scrollPosition === newScrollPosition;
//   scrollPosition = newScrollPosition;
//   marker.setAttribute('style', `
//     animation: pulse 2s infinite;
//     opacity: 1;
//     transition: ${animate ? 'all .24s ease-in-out' : 'opacity .24s ease-in-out'};
//     transform: translate(${bounds.x - PAD}px, ${bounds.y - PAD}px);
//     width: ${(bounds.xMax - bounds.xMin) + PAD + PAD}px;
//     height: ${(bounds.yMax - bounds.yMin) + PAD + PAD};
//   `);
//   if (scrolledElement !== container) {
//     scrolledElement = container as HTMLElement;
//     setTimeout(() => container && elementArr(container)[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 240);
//   }
//   window.requestAnimationFrame(positionMarker);
// }
// positionMarker();

// let animateMarker = 0;
// let prevSelector: string | null = null;
// window.addEventListener('message', (event: Event) => {
//   const data = (event as any).data;
//   timeout && clearTimeout(timeout);
//   if (selector === `[data-neutrino-${data.target}]`) { return; }
//   if (data.target === null) {
//     prevSelector = null;
//     return timeout = setTimeout(() => {
//       animateMarker = 0;
//       timeout = selector = null;
//     }, 300);
//   }

//   animateMarker = 1;
//   prevSelector = selector = `[data-neutrino-${data.target}]`;
//   return;
// }, false);

// document.addEventListener('mouseover', (evt: Event) => {
//   let el: HTMLElement | null = evt.target as HTMLElement;
//   while (el) {
//     if (el.dataset?.neutrino) { break; }
//     el = el.parentNode as HTMLElement | null;
//   }
//   if (el) {
//     timeout && clearTimeout(timeout);
//     animateMarker = 1;
//     scrolledElement = el;
//     selector = `[data-neutrino-id="${el.dataset.neutrinoId}"]`;
//   }
// });

// document.addEventListener('mouseout', (_evt: Event) => {
//   selector = prevSelector || null;
//   animateMarker = 1;
// });

// document.addEventListener('click', (evt: Event) => {
//   evt.preventDefault();
//   evt.stopImmediatePropagation();
// });
