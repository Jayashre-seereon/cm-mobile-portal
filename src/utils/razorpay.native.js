import RazorpayCheckout from 'react-native-razorpay';

export async function openRazorpayCheckout(options) {
  return RazorpayCheckout.open(options);
}
