import type { Business } from "@/domain/business";
import { BUSINESS_TIME_ZONE } from "@/lib/demo-clock";

export const demoBusiness: Business = {
  id: "misto-kitchen",
  name: "Misto Kitchen",
  timeZone: BUSINESS_TIME_ZONE,
  locationName: "Misto Kitchen shared kitchen",
  seatCount: 55,
};
