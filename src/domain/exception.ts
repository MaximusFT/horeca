import { z } from "zod";

export const exceptionTypeSchema = z.enum([
  "EVENT_CHANGED",
  "PRODUCT_UNAVAILABLE",
  "PRICE_SPIKE",
  "EXPIRY_RISK",
  "PACKAGE_SURPLUS",
  "DELIVERY_CONFLICT",
  "EXISTING_INCOMING_SUPPLY",
]);
