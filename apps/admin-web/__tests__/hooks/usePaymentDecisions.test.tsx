import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Registration } from '@sfvga/shared-types';
import { usePaymentDecisions } from '@/hooks/usePaymentDecisions';
import { functionsClient } from '@/services/functionsClient';

jest.mock('@/services/functionsClient', () => ({ functionsClient: { call: jest.fn() } }));
const call = functionsClient.call as jest.Mock;
const reg = { id: 'r', reviewRevision: 2, reviewStatus: 'pending' } as Registration;
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => usePaymentDecisions('event'), {
    wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}
describe('admin payment drafts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: jest.fn(() => 'stable-test-request') });
  });
  it('saves nothing until confirmation and submits only changed rows', async () => {
    const { result } = setup();
    act(() => result.current.select(reg, true));
    expect(call).not.toHaveBeenCalled();
    expect(result.current.count).toBe(1);
    call.mockResolvedValue({ results: [{ registrationId: 'r', ok: true }] });
    await act(async () => result.current.confirm());
    expect(call).toHaveBeenCalledWith('registrations_confirmPayments', {
      eventId: 'event', requestId: 'stable-test-request', decisions: [{ registrationId: 'r', approved: true, expectedRevision: 2 }],
    });
    expect(result.current.count).toBe(0);
    expect(result.current.results.r).toBe('Saved');
  });
  it('treats selecting an already-saved decision as unchanged', () => {
    const { result } = setup();
    act(() => result.current.select({ ...reg, reviewStatus: 'approved' }, true));
    expect(result.current.count).toBe(0);
    expect(call).not.toHaveBeenCalled();
  });
  it('keeps failed rows with the same request ID for safe retry', async () => {
    const { result } = setup();
    act(() => result.current.select(reg, false));
    call.mockRejectedValueOnce(new Error('Network unavailable'));
    await act(async () => result.current.confirm());
    expect(result.current.count).toBe(1);
    call.mockResolvedValueOnce({ results: [{ registrationId: 'r', ok: true }] });
    await act(async () => result.current.confirm());
    expect(call.mock.calls[0][1]).toEqual(call.mock.calls[1][1]);
    expect(result.current.count).toBe(0);
  });
  it('retains the original revision after a concurrent update until the draft is discarded', () => {
    const { result } = setup();
    act(() => result.current.select(reg, true));
    act(() => result.current.select({ ...reg, reviewRevision: 3 }, false));
    expect(result.current.drafts.r.expectedRevision).toBe(2);
    act(() => result.current.discard('r'));
    expect(result.current.count).toBe(0);
  });
});
