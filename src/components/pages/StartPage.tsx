import { useGameManagement } from "../../hooks/useGameManagement";
import { LoadGameModal } from "../features/save-load/LoadGameModal";
import { NewGameModal } from "../features/save-load/NewGameModal";
import { StartMenuButton } from "../features/save-load/StartMenuButton";

function StartPage() {
    const {
        activeModal,
        isLoading,
        loadingMessage,
        error,
        openNewGameModal,
        openLoadGameModal,
        closeModal,
        handleLoadGameConfirm,
        handleNewGameConfirm
    } = useGameManagement();

    const handleExit = () => window.close();

    return (
        <div className="h-screen w-full bg-slate-950 flex relative overflow-hidden font-sans selection:bg-emerald-500/30">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]"></div>
            </div>

            <div className="w-full lg:w-5/12 xl:w-4/12 flex flex-col justify-center p-12 z-10 bg-slate-950/80 backdrop-blur-sm border-r border-slate-800 shadow-2xl relative">

                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                            <svg className="w-6 h-6 text-slate-950" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                        </div>
                        <span className="text-slate-400 font-mono text-xs uppercase tracking-widest border border-slate-700 px-2 py-1 rounded">Build Alpha 0.2.1</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-white mb-2 leading-none">
                        FOOTBALL <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">MANAGER 2D</span>
                    </h1>
                    <p className="text-slate-400 text-lg">A simulação tática definitiva.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-left-4">
                        <span className="text-red-400 text-xl">⚠️</span>
                        <div>
                            <h4 className="text-red-400 font-bold text-sm">Erro ao iniciar</h4>
                            <p className="text-red-300/80 text-xs">{error}</p>
                        </div>
                    </div>
                )}

                <div className="space-y-4 w-full max-w-sm">
                    <StartMenuButton
                        variant="primary"
                        label="NOVA CARREIRA"
                        subLabel="Inicie sua jornada no mundo do futebol"
                        onClick={openNewGameModal}
                        disabled={isLoading}
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />

                    <StartMenuButton
                        variant="secondary"
                        label="CARREGAR JOGO"
                        subLabel="Continue de onde parou"
                        onClick={openLoadGameModal}
                        disabled={isLoading}
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                    />

                    <StartMenuButton
                        variant="secondary"
                        label="CONFIGURAÇÕES"
                        onClick={() => { }}
                        className="opacity-70"
                        disabled={isLoading}
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    />

                    <div className="pt-6">
                        <StartMenuButton
                            variant="danger"
                            label="SAIR PARA O DESKTOP"
                            onClick={handleExit}
                            disabled={isLoading}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>}
                        />
                    </div>
                </div>

                <div className="mt-auto pt-10 text-slate-600 text-xs">
                    <p>© 2025 Your Studio Name. All rights reserved.</p>
                </div>
            </div>

            <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-slate-900 via-slate-950 to-black items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20 transform perspective-1000 rotate-x-12 scale-110">
                    <div className="w-full h-full border-2 border-white/20 grid grid-cols-12 grid-rows-6">
                        {Array.from({ length: 72 }).map((_, i) => (
                            <div key={i} className="border border-white/5" />
                        ))}
                    </div>
                </div>

                <div className="z-10 max-w-md p-6 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl translate-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <h3 className="text-white font-bold uppercase tracking-widest text-sm">Novidades da Versão</h3>
                    </div>
                    <ul className="space-y-3 text-slate-300 text-sm">
                        <li className="flex gap-2">
                            <span className="text-emerald-500">➜</span>
                            Novo sistema de Scouting implementado.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-emerald-500">➜</span>
                            Melhoria na simulação minuto-a-minuto.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-emerald-500">➜</span>
                            UI otimizada com React 19.
                        </li>
                    </ul>
                </div>
            </div>

            {isLoading && (
                <div className="absolute inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-white font-light text-lg tracking-widest animate-pulse">
                        {loadingMessage || "Processando..."}
                    </p>
                </div>
            )}

            {activeModal === 'load_game' && (
                <LoadGameModal
                    onClose={closeModal}
                    onLoad={handleLoadGameConfirm}
                />
            )}

            {activeModal === 'new_game' && (
                <NewGameModal
                    onClose={closeModal}
                    onConfirm={handleNewGameConfirm}
                />
            )}
        </div>
    );
}

export default StartPage;