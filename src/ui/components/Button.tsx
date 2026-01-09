import React from "react";
import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    icon?: React.ElementType;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = "primary",
    size = "md",
    icon: Icon,
    className,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20",
        secondary: "bg-background-tertiary hover:bg-background-tertiary/80 text-text-primary border border-white/10",
        danger: "bg-status-danger hover:bg-status-danger/90 text-white shadow-lg shadow-status-danger/20",
        ghost: "bg-transparent hover:bg-white/5 text-text-secondary hover:text-text-primary",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    return (
        <button
            className={clsx(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {Icon && <Icon size={size === "sm" ? 14 : 18} className="mr-2" />}
            {children}
        </button>
    );
};