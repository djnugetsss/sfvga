import React from 'react';
import { render } from '@testing-library/react-native';
import { CountdownTimer } from '@/components/events/CountdownTimer';
import { ThemeProvider } from '@/providers/ThemeProvider';

function renderTimer(start: Date, end: Date) {
  return render(
    <ThemeProvider>
      <CountdownTimer startAt={start} endAt={end} />
    </ThemeProvider>,
  );
}

describe('CountdownTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders days-until copy before the event', () => {
    const start = new Date('2026-06-06T12:00:00.000Z');
    const end = new Date('2026-06-06T20:00:00.000Z');
    const { getByText } = renderTimer(start, end);
    expect(getByText('5 days until this event')).toBeTruthy();
  });

  it('renders "Happening now" during the event window', () => {
    const start = new Date('2026-06-01T10:00:00.000Z');
    const end = new Date('2026-06-01T18:00:00.000Z');
    const { getByText } = renderTimer(start, end);
    expect(getByText('Happening now')).toBeTruthy();
  });

  it('hides after the event ends', () => {
    const start = new Date('2026-05-01T10:00:00.000Z');
    const end = new Date('2026-05-01T18:00:00.000Z');
    const { queryByText } = renderTimer(start, end);
    expect(queryByText(/until this event/i)).toBeNull();
    expect(queryByText('Happening now')).toBeNull();
  });
});
