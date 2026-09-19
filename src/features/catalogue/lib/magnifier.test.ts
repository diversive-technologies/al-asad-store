import { describe, expect, it } from 'vitest';

import { magnifierOrigin } from './magnifier';

const FRAME = { left: 100, top: 50, width: 400, height: 500 };

describe('where the magnifier points', () => {
  it('puts the origin under the pointer, as a percentage of the frame', () => {
    expect(magnifierOrigin({ clientX: 200, clientY: 175 }, FRAME)).toEqual({ x: 25, y: 25 });
    expect(magnifierOrigin({ clientX: 500, clientY: 550 }, FRAME)).toEqual({ x: 100, y: 100 });
  });

  it('measures from the physical left edge, because transform-origin does', () => {
    expect(magnifierOrigin({ clientX: 100, clientY: 50 }, FRAME)).toEqual({ x: 0, y: 0 });
  });

  it('clamps a pointer reported just outside the frame to its edge', () => {
    expect(magnifierOrigin({ clientX: 90, clientY: 560 }, FRAME)).toEqual({ x: 0, y: 100 });
  });

  it('keeps one decimal place of a percent', () => {
    expect(magnifierOrigin({ clientX: 101, clientY: 51 }, FRAME)).toEqual({ x: 0.3, y: 0.2 });
  });

  it('points at the centre of a frame that has no size yet', () => {
    const empty = { left: 0, top: 0, width: 0, height: 0 };
    expect(magnifierOrigin({ clientX: 10, clientY: 10 }, empty)).toEqual({ x: 50, y: 50 });
  });
});
