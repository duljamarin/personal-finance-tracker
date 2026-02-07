import { useState, useEffect } from 'react';

export function usePaddle() {
  const [paddle, setPaddle] = useState(null);

  useEffect(() => {
    const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';
    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

    if (!token) {
      console.warn('Paddle client token not configured');
      return;
    }

    // Avoid loading twice
    if (window.Paddle) {
      setPaddle(window.Paddle);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        if (environment === 'sandbox') {
          window.Paddle.Environment.set('sandbox');
        }
        window.Paddle.Initialize({
          token,
          eventCallback: (event) => {
            // Dispatch custom event so SubscriptionContext can listen
            window.dispatchEvent(new CustomEvent('paddle-event', { detail: event }));
          },
        });
        setPaddle(window.Paddle);
      }
    };
    document.head.appendChild(script);
  }, []);

  return paddle;
}
