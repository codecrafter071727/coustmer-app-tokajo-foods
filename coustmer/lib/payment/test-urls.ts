/**
 * Test payment URL generators for different gateways
 */

export function generateTestPaymentUrl(
  gateway: 'razorpay' | 'stripe' | 'paytm' | 'phonepe' = 'razorpay',
  orderData: {
    orderId: string;
    amount: number;
    currency?: string;
    description?: string;
  }
): string {
  const { orderId, amount, currency = 'INR', description } = orderData;
  
  switch (gateway) {
    case 'razorpay':
      // Mock Razorpay checkout URL
      return `https://checkout.razorpay.com/v1/test?order_id=${orderId}&amount=${amount * 100}&currency=${currency}&description=${encodeURIComponent(description || '')}`;
    
    case 'stripe':
      // Mock Stripe checkout URL
      return `https://checkout.stripe.com/test?order_id=${orderId}&amount=${amount * 100}&currency=${currency.toLowerCase()}`;
    
    case 'paytm':
      // Mock PayTM checkout URL
      return `https://securegw-stage.paytm.in/order/process?ORDER_ID=${orderId}&TXN_AMOUNT=${amount}&CUST_ID=test_customer`;
    
    case 'phonepe':
      // Mock PhonePe checkout URL
      return `https://mercury-uat.phonepe.com/transact?merchantId=test&transactionId=${orderId}&amount=${amount * 100}&currency=${currency}`;
    
    default:
      // Generic test URL that simulates payment success after 3 seconds
      return `https://httpbin.org/delay/3?order_id=${orderId}&amount=${amount}&status=success`;
  }
}

export function isTestPaymentUrl(url: string): boolean {
  return url.includes('test') || 
         url.includes('stage') || 
         url.includes('sandbox') || 
         url.includes('uat') ||
         url.includes('httpbin.org');
}

export function simulatePaymentSuccess(orderId: string, amount: number) {
  // Simulate a successful payment response
  return {
    success: true,
    paymentId: `pay_test_${Date.now()}`,
    orderId,
    amount,
    status: 'success',
    gatewayPaymentId: `gateway_${Date.now()}`,
    gatewayOrderId: `order_${Date.now()}`,
    gatewaySignature: `sig_test_${Date.now()}`,
  };
}

export const TEST_PAYMENT_SCENARIOS = [
  {
    name: 'Razorpay Success',
    url: 'https://httpbin.org/delay/2?status=success&gateway=razorpay',
    expectedResult: 'success'
  },
  {
    name: 'Stripe Success', 
    url: 'https://httpbin.org/delay/3?payment_status=succeeded&gateway=stripe',
    expectedResult: 'success'
  },
  {
    name: 'PayTM Failed',
    url: 'https://httpbin.org/status/400?error=payment_failed&gateway=paytm',
    expectedResult: 'failed'
  },
  {
    name: 'Generic Success',
    url: 'https://httpbin.org/get?result=payment_successful',
    expectedResult: 'success'
  }
];