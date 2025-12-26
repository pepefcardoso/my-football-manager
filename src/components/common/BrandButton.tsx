import React from "react";

interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "solid" | "outline" | "ghost";
    children: React.ReactNode;
}

export function BrandButton({ variant = "solid", className = "", children, ...props }: BrandButtonProps) {
    const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
    const dynamicStyles: React.CSSProperties = {};

    if (variant === "solid") {
        dynamicStyles.backgroundColor = "var(--team-primary)";
        dynamicStyles.color = "white";
        dynamicStyles.boxShadow = "0 4px 14px 0 var(--team-primary-50)";
    } else if (variant === "outline") {
        dynamicStyles.border = "2px solid var(--team-primary)";
        dynamicStyles.color = "var(--team-primary)";
        dynamicStyles.backgroundColor = "transparent";
    } else {
        dynamicStyles.color = "var(--team-primary)";
    }

    return (
        <button
            className={`${baseStyles} hover:brightness-110 ${className}`}
            style={dynamicStyles}
            {...props}
        >
            {children}
        </button>
    );
}