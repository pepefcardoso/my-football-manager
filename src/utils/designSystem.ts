import { cn } from "./cn";

export const COLOR_SYSTEM = {
  status: {
    success: {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      solid: "bg-emerald-600",
      hover: "hover:bg-emerald-500",
      shadow: "shadow-emerald-900/20",
      ring: "focus:ring-emerald-500",
    },
    warning: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
      solid: "bg-yellow-600",
      hover: "hover:bg-yellow-500",
      shadow: "shadow-yellow-900/20",
      ring: "focus:ring-yellow-500",
    },
    danger: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/30",
      solid: "bg-red-600",
      hover: "hover:bg-red-500",
      shadow: "shadow-red-900/20",
      ring: "focus:ring-red-500",
    },
    info: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/30",
      solid: "bg-blue-600",
      hover: "hover:bg-blue-500",
      shadow: "shadow-blue-900/20",
      ring: "focus:ring-blue-500",
    },
    neutral: {
      bg: "bg-slate-800",
      text: "text-slate-300",
      border: "border-slate-700",
      solid: "bg-slate-700",
      hover: "hover:bg-slate-600",
      shadow: "shadow-slate-900/20",
      ring: "focus:ring-slate-500",
    },
  },

  energy: {
    high: "bg-emerald-500",
    medium: "bg-yellow-500",
    low: "bg-red-500",
  },

  moral: {
    high: "text-emerald-400",
    medium: "text-yellow-400",
    low: "text-red-400",
  },

  interactive: {
    primary: "bg-[var(--team-primary)]",
    primaryHover: "hover:brightness-110",
    secondary: "bg-[var(--team-secondary)]",
    disabled: "opacity-50 cursor-not-allowed",
    clickable: "cursor-pointer active:scale-95 transition-all duration-200",
  },

  surface: {
    base: "bg-slate-950",
    card: "bg-slate-900 border border-slate-800",
    elevated: "bg-slate-900 shadow-xl border border-slate-700",
    glass: "bg-slate-900/80 backdrop-blur-sm border border-slate-800",
  },
} as const;

export type StatusVariant = keyof typeof COLOR_SYSTEM.status;

export function getStatusClasses(
  variant: StatusVariant,
  solid: boolean = false
) {
  const s = COLOR_SYSTEM.status[variant];
  if (solid) {
    return cn(s.solid, "text-white border-transparent", s.hover);
  }
  return cn(s.bg, s.text, s.border, "border");
}
