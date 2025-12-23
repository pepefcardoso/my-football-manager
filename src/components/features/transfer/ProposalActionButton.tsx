import { useState } from "react";

interface ProposalActionButtonProps {
    proposalId: number;
    action: "accept" | "reject" | "finalize";
    onAction: (proposalId: number, action: string) => Promise<void>;
    label: string;
    variant?: "success" | "danger" | "primary";
    disabled?: boolean;
}

export function ProposalActionButton({
    proposalId,
    action,
    onAction,
    label,
    variant = "primary",
    disabled = false,
}: ProposalActionButtonProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleClick = async () => {
        if (isProcessing || disabled) return;

        setIsProcessing(true);
        try {
            await onAction(proposalId, action);
        } catch (error) {
            console.error(`Erro ao executar ação ${action}:`, error);
        } finally {
            setIsProcessing(false);
        }
    };

    const variantClasses = {
        success: "bg-emerald-600 hover:bg-emerald-500 text-white",
        danger: "bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-900",
        primary: "bg-blue-600 hover:bg-blue-500 text-white",
    };

    return (
        <button
            onClick={handleClick}
            disabled={isProcessing || disabled}
            className={`
        px-3 py-1.5 text-xs font-bold rounded transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${isProcessing ? "animate-pulse" : ""}
      `}
        >
            {isProcessing ? (
                <span className="flex items-center gap-2">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    Processando...
                </span>
            ) : (
                label
            )}
        </button>
    );
}