import type { ReactNode } from "react";
import type { BadgeVariant } from "../../domain/types";

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
    title?: string;
}

function Badge({ children, variant = "default", className = "", title }: BadgeProps) {
    const baseStyles = "inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold border transition-colors select-none";

    const variants = {
        default: "bg-slate-800 border-slate-700 text-slate-300",
        success: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
        warning: "bg-yellow-500/20 border-yellow-500/30 text-yellow-400",
        danger: "bg-red-500/20 border-red-500/30 text-red-400",
        info: "bg-blue-500/20 border-blue-500/30 text-blue-400",
        neutral: "bg-slate-500/10 border-slate-500/20 text-slate-400",
        outline: "bg-transparent border-slate-600 text-slate-400",
    };

    return (
        <span
            className={`${baseStyles} ${variants[variant]} ${className}`}
            title={title}
        >
            {children}
        </span>
    );
}

export default Badge;