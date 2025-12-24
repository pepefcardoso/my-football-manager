import { useEffect, useState, useCallback, useRef } from "react";
import { Logger } from "../../lib/Logger";
import { useGameStore } from "../../store/useGameStore";
import Badge from "./Badge";

const logger = new Logger("TransferNotification");

interface TransferNotificationPayload {
    type: "PROPOSAL_RECEIVED" | "TRANSFER_COMPLETED";
    message: string;
    details: any;
}

interface Notification {
    id: number;
    type: "PROPOSAL_RECEIVED" | "TRANSFER_COMPLETED";
    message: string;
    isNew: boolean;
}

const getNotificationStyle = (type: Notification["type"]) => {
    switch (type) {
        case "PROPOSAL_RECEIVED":
            return "bg-blue-900 border-blue-500/50 text-blue-100";
        case "TRANSFER_COMPLETED":
            return "bg-emerald-900 border-emerald-500/50 text-emerald-100";
        default:
            return "bg-slate-800 border-slate-700 text-slate-300";
    }
};

export function TransferNotification() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const userTeam = useGameStore((state) => state.userTeam);
    const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

    const removeNotification = useCallback((id: number) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));

        const timeout = timeoutsRef.current.get(id);
        if (timeout) {
            clearTimeout(timeout);
            timeoutsRef.current.delete(id);
        }
    }, []);

    const addNotification = useCallback((data: TransferNotificationPayload) => {
        const newId = Date.now() + Math.random();

        const timeout = setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== newId));
            timeoutsRef.current.delete(newId);
        }, 8000);

        timeoutsRef.current.set(newId, timeout);

        const newNotification: Notification = {
            id: newId,
            type: data.type,
            message: data.message,
            isNew: true,
        };

        logger.info(`Nova notificação recebida: ${data.message}`);

        setNotifications((prev) => [newNotification, ...prev].slice(0, 5));
    }, []);

    useEffect(() => {
        if (!userTeam) return;

        const activeTimeouts = timeoutsRef.current;

        const removeListener = window.electronAPI.transfer.onNotification(
            (data: TransferNotificationPayload) => {
                addNotification(data);
            }
        );

        return () => {
            if (typeof removeListener === "function") {
                removeListener();
            }

            activeTimeouts.forEach((timeout) => clearTimeout(timeout));
            activeTimeouts.clear();
        };
    }, [userTeam, addNotification]);

    useEffect(() => {
        if (!userTeam) return;

        const cleanup = window.electronAPI.team.onBudgetUpdate(
            (data: { teamId: number; newBudget: number }) => {
                if (data.teamId === userTeam.id) {
                    const currentTeam = useGameStore.getState().userTeam;
                    if (currentTeam) {
                        useGameStore.getState().updateUserTeam({
                            ...currentTeam,
                            budget: data.newBudget,
                        });
                    }

                    logger.info(`Orçamento atualizado: €${data.newBudget.toLocaleString()}`);
                }
            }
        );

        return cleanup;
    }, [userTeam]);

    if (notifications.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
            {notifications.map((notif) => (
                <div
                    key={notif.id}
                    className={`
            w-80 p-4 rounded-lg shadow-2xl border 
            transition-all duration-500 ease-in-out
            transform translate-x-0 opacity-100
            ${getNotificationStyle(notif.type)}
            ${notif.isNew ? "animate-in fade-in slide-in-from-right-10" : ""}
          `}
                >
                    <div className="flex items-start gap-3">
                        <span className="text-xl pt-0.5" aria-hidden="true">
                            {notif.type === "PROPOSAL_RECEIVED" ? "📥" : "✅"}
                        </span>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm leading-snug">
                                {notif.message}
                            </p>
                            <Badge variant="neutral" className="mt-1 text-xs">
                                Transferências
                            </Badge>
                        </div>
                        <button
                            onClick={() => removeNotification(notif.id)}
                            className="pointer-events-auto text-slate-400 hover:text-white transition-colors p-1 -mt-1 -mr-1 rounded-full hover:bg-black/10"
                            title="Fechar notificação"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}