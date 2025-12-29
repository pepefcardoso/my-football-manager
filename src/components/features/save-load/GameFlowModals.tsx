import { LoadingOverlay } from "../../common/Loading";
import { LoadGameModal } from "./LoadGameModal";
import { NewGameModal } from "./NewGameModal";
import type { GameFlowState } from "../../../hooks/useGameManagement";
import { Modal } from "../../common/Modal";

interface GameFlowModalsProps {
    state: GameFlowState;
    onClose: () => void;
    onNewGameConfirm: (saveName: string, managerName: string) => void;
    onLoadGameConfirm: (filename: string) => void;
}

export function GameFlowModals({
    state,
    onClose,
    onNewGameConfirm,
    onLoadGameConfirm
}: GameFlowModalsProps) {

    if (state.status === 'loading') {
        return <LoadingOverlay message={state.message} />;
    }

    if (state.status === 'configuring_new_game') {
        return (
            <NewGameModal
                onClose={onClose}
                onConfirm={onNewGameConfirm}
            />
        );
    }

    if (state.status === 'selecting_save_file') {
        return (
            <LoadGameModal
                onClose={onClose}
                onLoad={async (filename) => onLoadGameConfirm(filename)}
            />
        );
    }

    if (state.status === 'error') {
        return (
            <Modal
                title="Erro Crítico"
                variant="danger"
                onClose={onClose}
                isOpen={true}
                size="sm"
            >
                <div className="p-4 text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <p className="text-slate-300 mb-6">{state.message}</p>
                    <button
                        onClick={onClose}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-bold"
                    >
                        Entendido
                    </button>
                </div>
            </Modal>
        );
    }

    return null;
}