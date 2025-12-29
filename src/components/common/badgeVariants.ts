import { cva } from "class-variance-authority";
import { COLOR_SYSTEM } from "../../utils/designSystem";
import { cn } from "../../utils/cn";

const { status } = COLOR_SYSTEM;

export const badgeVariants = cva(
  "inline-flex items-center justify-center rounded font-bold border transition-colors select-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950",
  {
    variants: {
      variant: {
        default: cn(
          status.neutral.bg,
          status.neutral.border,
          status.neutral.text
        ),

        success: cn(
          status.success.bg,
          status.success.border,
          status.success.text,
          status.success.ring
        ),

        warning: cn(
          status.warning.bg,
          status.warning.border,
          status.warning.text,
          status.warning.ring
        ),

        danger: cn(
          status.danger.bg,
          status.danger.border,
          status.danger.text,
          status.danger.ring
        ),

        info: cn(
          status.info.bg,
          status.info.border,
          status.info.text,
          status.info.ring
        ),

        neutral: cn("bg-slate-500/10 border-slate-500/20 text-slate-400"),

        outline: "bg-transparent border-slate-600 text-slate-400",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px]",
        md: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);
