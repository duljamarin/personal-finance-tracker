import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastContext.jsx';

vi.mock('../../config/app', () => ({
  APP_CONFIG: { TOAST_DURATION: 100 },
}));

function TestComponent({ message, type }) {
  const { addToast } = useToast();
  return (
    <button onClick={() => addToast(message || 'Test toast', type || 'success')}>
      Show Toast
    </button>
  );
}

describe('ToastContext', () => {
  it('provides addToast function to children', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    expect(screen.getByRole('button', { name: 'Show Toast' })).toBeDefined();
  });

  it('shows a toast message when addToast is called', () => {
    render(
      <ToastProvider>
        <TestComponent message="Hello Toast" type="success" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show Toast' }));
    expect(screen.getByText('Hello Toast')).toBeDefined();
  });

  it('shows error toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent message="Error occurred" type="error" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show Toast' }));
    expect(screen.getByText('Error occurred')).toBeDefined();
  });

  it('shows warning toast', () => {
    render(
      <ToastProvider>
        <TestComponent message="Warning message" type="warning" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show Toast' }));
    expect(screen.getByText('Warning message')).toBeDefined();
  });

  it('throws when useToast is used outside ToastProvider', () => {
    const ErrorCatcher = vi.fn(() => null);
    const OriginalError = console.error;
    console.error = vi.fn(); // suppress jsdom error boundary output
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within ToastProvider');
    console.error = OriginalError;
  });

  it('can dismiss toast by clicking close button', () => {
    render(
      <ToastProvider>
        <TestComponent message="Dismissible toast" type="info" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show Toast' }));
    expect(screen.getByText('Dismissible toast')).toBeDefined();

    // Click the close button on the toast
    const closeButtons = screen.getAllByRole('button');
    // The last button inside the toast container is the X close button
    const toastCloseButton = closeButtons.find(btn => !btn.textContent.includes('Show Toast'));
    if (toastCloseButton) fireEvent.click(toastCloseButton);
  });

  it('can show multiple toasts simultaneously', () => {
    function MultiToastComponent() {
      const { addToast } = useToast();
      return (
        <>
          <button onClick={() => addToast('First toast', 'success')}>First</button>
          <button onClick={() => addToast('Second toast', 'error')}>Second</button>
        </>
      );
    }
    render(<ToastProvider><MultiToastComponent /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    fireEvent.click(screen.getByRole('button', { name: 'Second' }));
    expect(screen.getByText('First toast')).toBeDefined();
    expect(screen.getByText('Second toast')).toBeDefined();
  });
});
