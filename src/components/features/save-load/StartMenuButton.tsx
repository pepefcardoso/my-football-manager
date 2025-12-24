import React from "react";

interface StartMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    icon?: React.ReactNode;
    label: string;
    subLabel?: string;
}

export function StartMenuButton({
    variant = "primary",
    icon,
    label,
    subLabel,
    className,
    ...props
}: StartMenuButtonProps) {

    const baseStyles = "group relative w-full p-4 flex items-center gap-4 text-left rounded-xl transition-all duration-300 border border-transparent overflow-hidden";

    const variants = {
        primary: "bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 hover:scale-[1.02]",
        secondary: "bg-slate-800/50 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600 hover:translate-x-1",
        danger: "bg-red-900/20 hover:bg-red-900/40 text-red-200 border-red-900/30 hover:border-red-500/50 hover:translate-x-1",
        ghost: "bg-transparent hover:bg-slate-800/30 text-slate-400 hover:text-white"
    };

    return (
        <button className={`${baseStyles} ${variants[variant]} ${className || ''}`} {...props}>
            {variant === 'primary' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
            )}

            <div className={`p-3 rounded-lg ${variant === 'primary' ? 'bg-black/20' : 'bg-slate-950/30'}`}>
                {icon}
            </div>

            <div className="flex flex-col">
                <span className="font-bold text-lg leading-none tracking-tight">{label}</span>
                {subLabel && <span className="text-xs opacity-70 mt-1 font-medium tracking-wide">{subLabel}</span>}
            </div>
        </button>
    );
}