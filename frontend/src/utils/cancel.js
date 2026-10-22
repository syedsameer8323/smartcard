// Keys must match backend/shop/cancellation.py
export const CUSTOMER_CANCEL_REASONS = [
  ["changed_mind", "I changed my mind"],
  ["ordered_by_mistake", "Ordered by mistake"],
  ["better_price", "Found a better price elsewhere"],
  ["delivery_too_slow", "Delivery is taking too long"],
  ["wrong_details", "Wrong address or product details"],
  ["other", "Other reason"],
];

export const SELLER_CANCEL_REASONS = [
  ["out_of_stock", "Item is out of stock"],
  ["cannot_deliver", "Unable to deliver to this address"],
  ["pricing_error", "Pricing or listing error"],
  ["other", "Other reason"],
];
