import { useEffect, useRef, useState } from 'preact/hooks';
import { animated, interpolate, useSprings } from 'react-spring';
import { useGesture } from 'react-with-gesture';

function swap<T>(array: T[], from: number, to: number): T[] {
	array = [...array];
	const startIndex = from < 0 ? array.length + from : from;
	if (startIndex >= 0 && startIndex < array.length) {
		const endIndex = to < 0 ? array.length + to : to;
		const [item] = array.splice(from, 1);
		array.splice(endIndex, 0, item);
	}
  return array;
}

function clamp(number: number, lower: number, upper: number) {
  if (number === number) {
    if (upper !== undefined) {
      number = number <= upper ? number : upper;
    }
    if (lower !== undefined) {
      number = number >= lower ? number : lower;
    }
  }
  return number;
}

const ITEM_HEIGHT = 80 + 8;
/* eslint-disable-next-line */
const AnimatedDiv = animated.div as any;

// WHEN dragging, this function will be fed with all arguments.
// OTHERWISE, only the list order is relevant.
interface AnimationTargets { down: boolean; y: number; scale: number; zIndex: string; immediate: (boolean | ((string: string) => boolean)); }
function fn (immediate: boolean, order: number[]): (idx: number) => AnimationTargets;
function fn (immediate: boolean, order: number[], down: boolean, originalIndex: number, curIndex: number, y: number): (idx: number) => AnimationTargets;
function fn(immediate: boolean, order: number[], down?: boolean, originalIndex?: number, curIndex?: number, y?: number): (idx: number) => AnimationTargets {
  return (index: number) =>
    down && index === originalIndex
      ? { down: true, y: (curIndex || 0) * ITEM_HEIGHT + (y || 0), scale: 1.05, zIndex: '1', immediate: (n: string) => n === 'y' || n === 'zIndex' }
      : { down: false, y: order.indexOf(index) * ITEM_HEIGHT, scale: 1, zIndex: '0', immediate };
}

export function DraggableList({ items, onChange }: { items: (JSX.Element | null)[]; onChange?: (order: number[]) => void }) {
  const order = useRef<number[]>(items.map((_: unknown, index: number) => index));
  const [ springs, setSprings ] = useSprings(items.length, fn(false, order.current));
  const [ delta, setDelta ] = useState(0);

  const itemsCache = items.map(item => item?.key).join(',');
  useEffect(() => {
    order.current = items.map((_: unknown, index: number) => index);
    setSprings(fn(true, order.current));
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [itemsCache]);

  const bind = useGesture(({ args: [ originalIndex, onChange ], down, delta: [ , y ] }) => {
    const curIndex = order.current.indexOf(originalIndex);
    const curRow = clamp(Math.round((curIndex * ITEM_HEIGHT + y) / ITEM_HEIGHT), 0, items.length - 1);
    const newOrder = swap(order.current, curIndex, curRow);
    setSprings(fn(false, newOrder, down, originalIndex, curIndex, y));
    if (!down) {
      if (order.current.join(',') !== newOrder.join(',')) onChange?.(newOrder);
      order.current = newOrder;
    }
    window.requestAnimationFrame(() => setDelta(down ? y : 0));
  });

  return (
    <div 
      class="collection__preview-list"
      style={{ height: items.length * ITEM_HEIGHT }} 
      onClickCapture={evt => { if (Math.abs(delta) < 25) return; evt.preventDefault(); evt.stopImmediatePropagation(); }}
    >
      {springs.map(({ down, zIndex, y, scale }, i) => {
        return <AnimatedDiv
          {...bind(i, onChange)}
          key={items[i]?.key || i}
          className={down.goal ? 'collection__row--grab' : ''}
          style={{
            width: 'calc(100% - 0.8rem)',
            position: 'absolute',
            top: 0,
            left: '2rem',
            zIndex,
            transform: interpolate([ y, scale ], (y, s) => `translate3d(0,${y}px,0) scale(${s})`),
          }}
          children={items[i]}
        />;
        })}
    </div>
  );
}