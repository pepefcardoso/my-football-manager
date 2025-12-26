import { useCallback, useEffect, useState } from "react";
import type { GameSaveMetadata } from "../../../domain/GameSaveTypes";
import { SaveSlotCard } from "./SaveSlotCard";
import { Logger } from "../../../lib/Logger";
import { LoadingSpinner } from "../../common/Loading";
import { Modal } from "../../common/Modal";

const logger = new Logger("LoadGameModal");

interface LoadGameModalProps {
    onClose: () => void;
    onLoad: (filename: string) => Promise<void>;
}

export function LoadGameModal({ onClose, onLoad }: LoadGameModalProps) {
    const [saves, setSaves] = useState<GameSaveMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSaves = useCallback(async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.game.listSaves();
            setSaves(data);
            setSelectedFilename((current) => current && data.find(s => s.filename === current) ? current : null);
        } catch (err) {
            logger.error("Erro ao listar saves", err);
            setError("Não foi possível ler o diretório de saves.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSaves(); }, [fetchSaves]);

    const handleConfirmLoad = async () => {
        if (!selectedFilename || processing) return;
        setProcessing(true);
        setError(null);
        try {
            await onLoad(selectedFilename);
        } catch (err) {
            logger.error("Erro ao carregar:", err);
            setError("Falha ao carregar o arquivo selecionado.");
            setProcessing(false);
        }
    };

    const handleDelete = async (filename: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Tem certeza que deseja EXCLUIR "${filename}"?`)) return;
        try {
            const result = await window.electronAPI.game.deleteSave(filename);
            if (result.success) await fetchSaves();
            else alert(`Erro: ${result.message}`);
        } catch (error) {
            logger.error("Erro ao deletar:", error);
        }
    };

    const footer = (
        <>
            <div className="flex-1 text-xs text-slate-500 self-center">
                {selectedFilename ? `Selecionado: ${selectedFilename}.json` : 'Nenhum arquivo selecionado'}
            </div>
            <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                disabled={processing}
            >
                Cancelar
            </button>
            <button
                onClick={handleConfirmLoad}
                disabled={!selectedFilename || processing || saves.length === 0}
                className="px-8 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {processing ? (
                    <>
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Carregando...
                    </>
                ) : "Carregar Jogo"}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Carregar Jogo"
            subtitle="Gerencie seus arquivos de carreira"
            size="xl"
            footer={footer}
            className="h-[80vh]"
        >
            {loading ? (
                <LoadingSpinner size="md" centered={true} text="Buscando arquivos de save..." />
            ) : error ? (
                <div className="h-full flex flex-col items-center justify-center text-red-400 gap-2 min-h-[300px]">
                    <span className="text-4xl">⚠️</span>
                    <p>{error}</p>
                </div>
            ) : saves.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 min-h-[300px]">
                    <span className="text-4xl opacity-50">📂</span>
                    <p>Nenhum jogo salvo encontrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {saves.map((save) => (
                        <div key={save.id} className="relative group">
                            <SaveSlotCard
                                metadata={save}
                                selected={selectedFilename === save.filename}
                                onClick={() => setSelectedFilename(save.filename)}
                            />
                            <button
                                onClick={(e) => handleDelete(save.filename, e)}
                                className="absolute top-2 right-2 p-2 bg-red-900/80 hover:bg-red-600 text-red-200 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg backdrop-blur-sm z-10"
                                title="Excluir Save"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}