import { formatInTimeZone } from "date-fns-tz";
import { BUSINESS_TIME_ZONE } from "./demo-clock";

export function formatBusinessDate(date: Date, pattern = "yyyy-MM-dd HH:mm"): string {
  return formatInTimeZone(date, BUSINESS_TIME_ZONE, pattern);
}
