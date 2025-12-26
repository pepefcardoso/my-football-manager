interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
    text?: string;
    centered?: boolean;
}

export function LoadingSpinner({
    size = "md",
    className = "",
    text,
    centered = true
}: LoadingSpinnerProps) {

    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-b-2",
        lg: "h-12 w-12 border-b-2",
        xl: "h-16 w-16 border-4"
    };

    const spinner = (
        <div className={`flex flex-col items-center gap-3 ${className}`}>
            <div
                className={`
          animate-spin rounded-full 
          border-slate-700 border-t-emerald-500 
          ${sizeClasses[size]}
        `}
                role="status"
                aria-label="A carregar"
            />
            {text && (
                <p className="text-slate-400 text-sm font-medium animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );

    if (centered) {
        return (
            <div className="flex justify-center items-center w-full h-full min-h-[200px] p-8">
                {spinner}
            </div>
        );
    }

    return spinner;
}

interface LoadingOverlayProps {
    message?: string;
}

export function LoadingOverlay({ message = "A processar..." }: LoadingOverlayProps) {
    return (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
            <LoadingSpinner size="lg" text={message} centered={false} />
        </div>
    );
}