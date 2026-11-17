import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { OtpInput } from '@/components/auth/OtpInput';
import { ThemeProvider } from '@/providers/ThemeProvider';

function TestInput({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  return (
    <ThemeProvider>
      <OtpInput digits={digits} onChange={setDigits} onComplete={onComplete} />
    </ThemeProvider>
  );
}

it('shows six labeled boxes and completes after the last digit', () => {
  const onComplete = jest.fn();
  const screen = render(<TestInput onComplete={onComplete} />);
  for (let index = 1; index <= 6; index++) {
    fireEvent.changeText(
      screen.getByLabelText(`Verification code digit ${index} of 6`),
      String(index),
    );
  }
  expect(onComplete).toHaveBeenCalledTimes(1);
  expect(onComplete).toHaveBeenCalledWith('123456');
});

it('accepts a pasted or autofilled code in one box', () => {
  const onComplete = jest.fn();
  const screen = render(<TestInput onComplete={onComplete} />);
  fireEvent.changeText(screen.getByLabelText('Verification code digit 1 of 6'), '64 3210');
  expect(onComplete).toHaveBeenCalledWith('643210');
  expect(screen.getByLabelText('Verification code digit 6 of 6').props.value).toBe('0');
});
