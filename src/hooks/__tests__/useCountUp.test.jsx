import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '../useCountUp';

function mockReducedMotion(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('reduce') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('useCountUp', () => {
  let now = 0;
  let queue = [];
  const flush = (ms) => {
    now += ms;
    const run = queue;
    queue = [];
    run.forEach((cb) => cb(now));
  };

  beforeEach(() => {
    now = 0;
    queue = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { queue.push(cb); return queue.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the final value on the first frame under reduced motion', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useCountUp(1234));
    expect(result.current).toBe(1234);
  });

  it('tweens from the displayed value when the target changes, not from 0', () => {
    mockReducedMotion(false);
    const { result, rerender } = renderHook(({ v }) => useCountUp(v, { duration: 100 }), { initialProps: { v: 100 } });
    expect(result.current).toBe(0);
    act(() => { flush(0); flush(200); });
    expect(result.current).toBe(100);

    rerender({ v: 200 });
    act(() => { flush(0); flush(10); });
    // mid-tween: strictly between the old displayed value and the new target
    expect(result.current).toBeGreaterThan(100);
    expect(result.current).toBeLessThan(200);
    act(() => { flush(200); });
    expect(result.current).toBe(200);
  });
});
