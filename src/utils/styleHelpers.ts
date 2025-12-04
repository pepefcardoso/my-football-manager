import type { BadgeVariant } from "../domain/types";

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
      return "bg-emerald-500/20 border-emerald-500/50 text-emerald-100";
    case "yellow_card":
      return "bg-yellow-500/20 border-yellow-500/50 text-yellow-100";
    case "red_card":
      return "bg-red-500/20 border-red-500/50 text-red-100";
    case "injury":
      return "bg-orange-500/20 border-orange-500/50 text-orange-100";
    case "save":
      return "bg-blue-500/20 border-blue-500/50 text-blue-100";
    default:
      return "bg-slate-800 border-slate-700 text-slate-300";
  }
};

export const getPositionColor = (pos: string) => {
  switch (pos) {
    case "GK":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "DF":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "MF":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "FW":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
};
