import React from "react";

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className = ""
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-4 animate-in fade-in duration-500 ${className}`}>
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800 shadow-inner">
                {icon || <span className="text-4xl opacity-50 grayscale">📂</span>}
            </div>

            <h3 className="text-xl font-bold text-white mb-2 text-center">
                {title}
            </h3>

            {description && (
                <p className="text-sm text-slate-400 text-center max-w-sm mb-8 leading-relaxed">
                    {description}
                </p>
            )}

            {action && (
                <button
                    onClick={action.onClick}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}