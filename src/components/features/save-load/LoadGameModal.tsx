import { useEffect, useState } from "react";
import type { GameSaveMetadata } from "../../../domain/GameSaveTypes";
import { SaveSlotCard } from "./SaveSlotCard";
import { Logger } from "../../../lib/Logger";

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

    useEffect(() => {
        const fetchSaves = async () => {
            try {
                const data = await window.electronAPI.game.listSaves();
                setSaves(data);
                if (data.length > 0) {
                    setSelectedFilename(data[0].filename);
                }
            } catch (err) {
                logger.error("Erro ao listar saves", err);
                setError("Não foi possível ler o diretório de saves.");
            } finally {
                setLoading(false);
            }
        };
        fetchSaves();
    }, []);

    const handleConfirmLoad = async () => {
        if (!selectedFilename || processing) return;

        setProcessing(true);
        setError(null);
        try {
            await onLoad(selectedFilename);
        } catch (err) {
            logger.error("Erro ao carregar o jogo:", err);
            setError("Falha ao carregar o arquivo selecionado.");
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">

                <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-light text-white">Carregar Jogo</h2>
                        <p className="text-slate-400 text-sm">Selecione um arquivo para continuar sua carreira</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors text-2xl"
                    >
                        &times;
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                            <p>Buscando arquivos de save...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center text-red-400 gap-2">
                            <span className="text-4xl">⚠️</span>
                            <p>{error}</p>
                        </div>
                    ) : saves.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                            <span className="text-4xl opacity-50">📂</span>
                            <p>Nenhum jogo salvo encontrado.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {saves.map((save) => (
                                <SaveSlotCard
                                    key={save.id}
                                    metadata={save}
                                    selected={selectedFilename === save.filename}
                                    onClick={() => setSelectedFilename(save.filename)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <div className="text-xs text-slate-500">
                        {selectedFilename ? `Arquivo selecionado: ${selectedFilename}.json` : 'Nenhum arquivo selecionado'}
                    </div>
                    <div className="flex gap-4">
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
                            ) : (
                                "Carregar Jogo"
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}