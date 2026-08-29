import type { Clock } from "./clock";

export const BUSINESS_TIME_ZONE = "Europe/Kyiv";
export const DEMO_NOW_ISO = "2026-09-01T08:00:00+03:00";

export const DEMO_PERIOD = {
  startsOn: "2026-09-01",
  endsOn: "2026-09-14",
  label: "1–14 September 2026",
} as const;

export class DemoClock implements Clock {
  now(): Date {
    return new Date(DEMO_NOW_ISO);
  }
}
