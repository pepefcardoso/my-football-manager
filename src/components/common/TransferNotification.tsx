import { useEffect, useState, useCallback } from "react";
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
    timeout?: NodeJS.Timeout;
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

/**
 * @component TransferNotification
 * @description Componente global para exibir notificações em formato Toast
 * sobre eventos de transferência (propostas recebidas, transferências finalizadas).
 * Ele se inscreve em um canal IPC específico (`transfer:notification`) para receber eventos do main process.
 */
export function TransferNotification() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const userTeam = useGameStore((state) => state.userTeam);

    /**
     * @function removeNotification
     * @description Remove uma notificação da lista e limpa o timeout associado.
     * @param id ID da notificação a ser removida.
     */
    const removeNotification = useCallback((id: number) => {
        setNotifications((prev) => {
            const target = prev.find(n => n.id === id);
            if (target?.timeout) clearTimeout(target.timeout);
            return prev.filter((n) => n.id !== id);
        });
    }, []);

    /**
     * @function addNotification
     * @description Adiciona uma nova notificação e define um timeout para remoção automática.
     * @param data Dados da notificação recebida pelo IPC.
     */
    const addNotification = useCallback(
        (data: TransferNotificationPayload) => {
            if (!userTeam) return;

            const newId = Date.now() + Math.random();

            const timeout = setTimeout(() => {
                removeNotification(newId);
            }, 8000);

            const newNotification: Notification = {
                id: newId,
                type: data.type,
                message: data.message,
                isNew: true,
                timeout: timeout,
            };

            logger.info(`Nova notificação: ${data.message}`, data);

            setNotifications((prev) => [newNotification, ...prev].slice(0, 5));
        },
        [userTeam, removeNotification]
    );

    useEffect(() => {
        if (!userTeam) return;

        window.electronAPI.transfer.onNotification(addNotification);

        return () => {
            notifications.forEach(n => n.timeout && clearTimeout(n.timeout));
        };
    }, [userTeam, addNotification, notifications]);

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
            ${notif.isNew ? 'animate-in fade-in slide-in-from-right-10' : ''}
          `}
                >
                    <div className="flex items-start gap-3">
                        <span className="text-xl pt-0.5" aria-hidden="true">
                            {notif.type === "PROPOSAL_RECEIVED" ? "📥" : "✅"}
                        </span>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm leading-snug">{notif.message}</p>
                            <Badge variant="neutral" className="mt-1 text-xs">
                                Transferências
                            </Badge>
                        </div>
                        <button
                            onClick={() => removeNotification(notif.id)}
                            className="pointer-events-auto text-slate-400 hover:text-white transition-colors p-1 -mt-1 -mr-1 rounded-full hover:bg-black/10"
                            title="Fechar notificação"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}