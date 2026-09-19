import { describe, expect, it } from 'vitest';

import {
  frameForKey,
  SWIPE_MIN_PX,
  swipeStep,
  wrapIndex,
  type FrameKeyPress,
  type SwipeGesture,
} from './frame-navigation';

/** A plain one-finger, unzoomed, left-to-right-page gesture, overridden per case. */
function gesture(overrides: Partial<SwipeGesture>): SwipeGesture {
  return { dx: 0, dy: 0, isRtl: false, fingers: 1, viewportScale: 1, ...overrides };
}

function press(overrides: Partial<FrameKeyPress>): FrameKeyPress {
  return { key: 'ArrowRight', isRtl: false, hasModifier: false, index: 0, count: 5, ...overrides };
}

describe('wrapping a frame position', () => {
  it('wraps past the last frame to the first, and before the first to the last', () => {
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(-1, 5)).toBe(4);
  });

  it('wraps a step larger than the number of frames', () => {
    expect(wrapIndex(12, 5)).toBe(2);
    expect(wrapIndex(-7, 5)).toBe(3);
  });

  it('answers the first position when there are no frames to wrap through', () => {
    expect(wrapIndex(3, 0)).toBe(0);
  });
});

describe('judging a swipe', () => {
  it('steps forwards when content is dragged towards the reading start', () => {
    expect(swipeStep(gesture({ dx: -60 }))).toBe(1);
    expect(swipeStep(gesture({ dx: 60 }))).toBe(-1);
  });

  it('mirrors under RTL (I18N-05)', () => {
    expect(swipeStep(gesture({ dx: 60, isRtl: true }))).toBe(1);
    expect(swipeStep(gesture({ dx: -60, isRtl: true }))).toBe(-1);
  });

  it('reads a movement shorter than the threshold as a tap', () => {
    expect(swipeStep(gesture({ dx: -(SWIPE_MIN_PX - 1) }))).toBeNull();
    expect(swipeStep(gesture({ dx: -SWIPE_MIN_PX }))).toBe(1);
  });

  it('leaves a mostly vertical movement to the page scroll', () => {
    expect(swipeStep(gesture({ dx: -60, dy: 80 }))).toBeNull();
    expect(swipeStep(gesture({ dx: -60, dy: 60 }))).toBeNull();
  });

  it('never reads a pinch as a swipe, however far a finger travelled (§30.3)', () => {
    expect(swipeStep(gesture({ dx: -200, fingers: 2 }))).toBeNull();
  });

  it('leaves a pan across a zoomed-in photograph alone', () => {
    expect(swipeStep(gesture({ dx: -200, viewportScale: 2.5 }))).toBeNull();
  });

  it('does not mistake a pinch that settled a hair off 1 for a zoom', () => {
    expect(swipeStep(gesture({ dx: -60, viewportScale: 1.004 }))).toBe(1);
  });
});

describe('a key pressed in the full-screen view', () => {
  it('steps with the arrows in reading order, wrapping at the ends', () => {
    expect(frameForKey(press({ key: 'ArrowRight', index: 1 }))).toBe(2);
    expect(frameForKey(press({ key: 'ArrowLeft', index: 1 }))).toBe(0);
    expect(frameForKey(press({ key: 'ArrowRight', index: 4 }))).toBe(0);
    expect(frameForKey(press({ key: 'ArrowLeft', index: 0 }))).toBe(4);
  });

  it('turns the arrows round under RTL, where the next frame lies to the left', () => {
    expect(frameForKey(press({ key: 'ArrowLeft', isRtl: true, index: 1 }))).toBe(2);
    expect(frameForKey(press({ key: 'ArrowRight', isRtl: true, index: 1 }))).toBe(0);
  });

  it('jumps to either end with Home and End, in both directions', () => {
    expect(frameForKey(press({ key: 'Home', index: 3 }))).toBe(0);
    expect(frameForKey(press({ key: 'End', index: 1, isRtl: true }))).toBe(4);
  });

  it('leaves a key held with a modifier to the browser — Alt+← is Back', () => {
    expect(frameForKey(press({ key: 'ArrowLeft', index: 2, hasModifier: true }))).toBeNull();
  });

  it('handles nothing else, and nothing at all with a single frame', () => {
    expect(frameForKey(press({ key: 'Enter' }))).toBeNull();
    expect(frameForKey(press({ key: 'Tab' }))).toBeNull();
    expect(frameForKey(press({ key: 'ArrowRight', count: 1 }))).toBeNull();
  });
});
