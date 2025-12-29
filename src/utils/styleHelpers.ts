import type { BadgeVariant } from "../domain/types";
import { cn } from "./cn";
import { COLOR_SYSTEM, getStatusClasses } from "./designSystem";

export const getPositionVariant = (pos: string): BadgeVariant => {
  switch (pos) {
    case "GK":
      return "warning";
    case "DF":
      return "info";
    case "MF":
      return "success";
    case "FW":
      return "danger";
    default:
      return "neutral";
  }
};

export const getEventStyle = (eventType: string): string => {
  switch (eventType) {
    case "goal":
      return getStatusClasses("success");
    case "yellow_card":
      return getStatusClasses("warning");
    case "red_card":
      return getStatusClasses("danger");
    case "injury":
      return cn(
        COLOR_SYSTEM.status.warning.bg,
        "border-orange-500/50 text-orange-100"
      );
    case "save":
      return getStatusClasses("info");
    default:
      return getStatusClasses("neutral");
  }
};

export const getPositionColor = (pos: string) => {
  const variant = getPositionVariant(pos);
  const statusKey =
    variant === "default" || variant === "outline" ? "neutral" : variant;
  return getStatusClasses(statusKey);
};

export const getEnergyColorClass = (energy: number): string => {
  if (energy > 80) return COLOR_SYSTEM.energy.high;
  if (energy > 50) return COLOR_SYSTEM.energy.medium;
  return COLOR_SYSTEM.energy.low;
};

export const getMoralColorClass = (moral: number): string => {
  if (moral >= 80) return COLOR_SYSTEM.moral.high;
  if (moral < 50) return COLOR_SYSTEM.moral.low;
  return COLOR_SYSTEM.moral.medium;
};
