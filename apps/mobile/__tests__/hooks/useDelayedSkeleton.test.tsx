import { act, renderHook } from '@testing-library/react-native';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';

describe('useDelayedSkeleton', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('skips the skeleton when loading finishes quickly', () => {
    const hook = renderHook(({ loading }) => useDelayedSkeleton(loading, 450), {
      initialProps: { loading: true },
    });
    expect(hook.result.current).toBe(false);
    act(() => jest.advanceTimersByTime(300));
    hook.rerender({ loading: false });
    act(() => jest.advanceTimersByTime(300));
    expect(hook.result.current).toBe(false);
  });

  it('shows the skeleton only for a continuing load and clears it when done', () => {
    const hook = renderHook(({ loading }) => useDelayedSkeleton(loading, 450), {
      initialProps: { loading: true },
    });
    act(() => jest.advanceTimersByTime(449));
    expect(hook.result.current).toBe(false);
    act(() => jest.advanceTimersByTime(1));
    expect(hook.result.current).toBe(true);
    hook.rerender({ loading: false });
    expect(hook.result.current).toBe(false);
  });
});
