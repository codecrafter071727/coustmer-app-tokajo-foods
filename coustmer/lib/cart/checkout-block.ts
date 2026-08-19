/** Map cart-service zone / hours codes to Swiggy-style checkout copy. */
export function checkoutBlockCopy(
  code?: string,
  fallback?: string
): { title: string; message: string } {
  switch (code) {
    case 'OUTSIDE_HOURS':
      return {
        title: 'Deliveries are closed',
        message:
          fallback?.trim() ||
          'We deliver from 6:00 AM to 11:30 PM IST. Try again after 6 AM.',
      };
    case 'OUT_OF_ZONE':
      return {
        title: 'Outside delivery area',
        message:
          fallback?.trim() ||
          'We don’t deliver to this pin yet. Move the pin closer, or pick an address inside our zone.',
      };
    case 'ZONE_RAIN':
      return {
        title: 'Rain pause',
        message: fallback?.trim() || 'Deliveries are paused due to rain in this area.',
      };
    case 'ZONE_CLOSED':
      return {
        title: 'Zone temporarily closed',
        message: fallback?.trim() || 'This delivery zone is temporarily closed.',
      };
    default:
      return {
        title: 'Cart needs attention',
        message: fallback?.trim() || 'Cart validation failed',
      };
  }
}
