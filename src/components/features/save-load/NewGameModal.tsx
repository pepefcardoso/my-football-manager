import { useState } from "react";
import { Logger } from "../../../lib/Logger";
import { Modal } from "../../common/Modal";

const logger = new Logger("NewGameModal");

interface NewGameModalProps {
    onClose: () => void;
    onConfirm: (saveName: string, managerName: string) => void;
}

export function NewGameModal({ onClose, onConfirm }: NewGameModalProps) {
    const [saveName, setSaveName] = useState("");
    const [managerName, setManagerName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!saveName.trim()) {
            setError("O nome do save é obrigatório.");
            return;
        }
        if (!managerName.trim()) {
            setError("O nome do treinador é obrigatório.");
            return;
        }

        const invalidChars = /[^a-zA-Z0-9 _-]/;
        if (invalidChars.test(saveName)) {
            setError("O nome do save contém caracteres inválidos.");
            return;
        }

        logger.info(`Configuração confirmada: Save=${saveName}, Manager=${managerName}`);
        onConfirm(saveName, managerName);
    };

    const footerContent = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
                Cancelar
            </button>
            <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-emerald-900/20"
            >
                Continuar ➤
            </button>
        </>
    );

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Novo Jogo"
            subtitle="Configure sua carreira antes de escolher o time."
            size="md"
            footer={footerContent}
        >
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-xs">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Save (Arquivo)</label>
                    <input
                        type="text"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="Ex: Carreira 2025"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors select-text"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Treinador</label>
                    <input
                        type="text"
                        value={managerName}
                        onChange={(e) => setManagerName(e.target.value)}
                        placeholder="Ex: Seu Nome"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors select-text"
                    />
                </div>
            </form>
        </Modal>
    );
}