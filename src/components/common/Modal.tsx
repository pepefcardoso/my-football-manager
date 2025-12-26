import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
export type ModalVariant = "default" | "danger" | "success" | "warning" | "info";

interface ModalProps {
    isOpen?: boolean;
    onClose: () => void;
    title: React.ReactNode;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: ModalSize;
    variant?: ModalVariant;
    className?: string;
    noPadding?: boolean;
}

export function Modal({
    isOpen = true,
    onClose,
    title,
    subtitle,
    children,
    footer,
    size = "md",
    variant = "default",
    className = "",
    noPadding = false
}: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-[95vw] h-[90vh]",
    };

    const variantClasses = {
        default: "border-slate-700 shadow-slate-900/20",
        danger: "border-red-500 shadow-red-900/20",
        success: "border-primary-50 shadow-emerald-900/20",
        warning: "border-yellow-500 shadow-yellow-900/20",
        info: "border-blue-500 shadow-blue-900/20",
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className={`
                            bg-slate-900 border rounded-xl w-full shadow-2xl flex flex-col max-h-[90vh] relative z-10
                            ${sizeClasses[size]} 
                            ${variantClasses[variant]}
                            ${className}
                        `}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-start shrink-0 rounded-t-xl">
                            <div>
                                <h2 className="text-xl font-bold text-white leading-tight">{title}</h2>
                                {subtitle && (
                                    <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
                                aria-label="Fechar"
                            >
                                ✕
                            </button>
                        </div>

                        <div className={`overflow-y-auto custom-scrollbar ${noPadding ? '' : 'p-6'}`}>
                            {children}
                        </div>

                        {footer && (
                            <div className="p-5 border-t border-slate-800 bg-slate-950/30 flex justify-end gap-3 shrink-0 rounded-b-xl">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}