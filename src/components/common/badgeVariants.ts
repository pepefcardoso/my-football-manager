import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center justify-center rounded font-bold border transition-colors select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-slate-800 border-slate-700 text-slate-300",
        success: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
        warning: "bg-yellow-500/20 border-yellow-500/30 text-yellow-400",
        danger: "bg-red-500/20 border-red-500/30 text-red-400",
        info: "bg-blue-500/20 border-blue-500/30 text-blue-400",
        neutral: "bg-slate-500/10 border-slate-500/20 text-slate-400",
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
