const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

function loadScript(src) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(options) {
  const loaded = await loadScript(RAZORPAY_SCRIPT_URL);

  if (!loaded || !window.Razorpay) {
    throw new Error('Failed to load Razorpay checkout.');
  }

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      ...options,
      handler: (response) => {
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          reject(new Error('Payment was cancelled.'));
        },
      },
    });

    checkout.open();
  });
}
