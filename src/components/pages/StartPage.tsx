import { useGameManagement } from "../../hooks/useGameManagement";
import { StartMenuButton } from "../features/save-load/StartMenuButton";
import { GameFlowModals } from "../features/save-load/GameFlowModals";

function StartPage() {
    const { state, actions } = useGameManagement();
    const handleExit = () => window.close();
    const isBusy = state.status === 'loading';
    const recentSave = state.status === 'idle' ? state.recentSave : undefined;

    return (
        <div className="h-screen w-full bg-slate-950 flex relative overflow-hidden font-sans selection:bg-emerald-500/30">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]"></div>
            </div>

            <div className="w-full lg:w-5/12 xl:w-4/12 flex flex-col justify-center p-12 z-10 bg-slate-950/80 backdrop-blur-sm border-r border-slate-800 shadow-2xl relative">

                <div className="mb-10">
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

                <div className="space-y-3 w-full max-w-sm animate-in fade-in slide-in-from-left-8 duration-500">

                    {recentSave && (
                        <div className="pb-4 mb-4 border-b border-slate-800">
                            <StartMenuButton
                                variant="primary"
                                label="CONTINUAR"
                                subLabel={`${recentSave.teamName} • ${new Date(recentSave.currentDate).toLocaleDateString()}`}
                                onClick={actions.handleContinueLastSave}
                                disabled={isBusy}
                                icon={<span className="text-xl">▶</span>}
                            />
                        </div>
                    )}

                    <StartMenuButton
                        variant={recentSave ? "secondary" : "primary"}
                        label="NOVA CARREIRA"
                        subLabel="Inicie sua jornada no mundo do futebol"
                        onClick={actions.startNewGameFlow}
                        disabled={isBusy}
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />

                    <StartMenuButton
                        variant="secondary"
                        label="CARREGAR JOGO"
                        subLabel="Continue de onde parou"
                        onClick={actions.openLoadGameFlow}
                        disabled={isBusy}
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                    />

                    <StartMenuButton
                        variant="ghost"
                        label="CONFIGURAÇÕES"
                        onClick={() => { }}
                        className="opacity-70"
                        disabled={isBusy}
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    />

                    <div className="pt-6 border-t border-slate-800/50 mt-4">
                        <StartMenuButton
                            variant="danger"
                            label="SAIR PARA O DESKTOP"
                            onClick={handleExit}
                            disabled={isBusy}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>}
                        />
                    </div>
                </div>

                <div className="mt-auto pt-10 text-slate-600 text-xs font-mono">
                    <p>© 2025 Football Manager 2D. All rights reserved.</p>
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
                        <li className="flex gap-2 items-start">
                            <span className="text-emerald-500 mt-1">➜</span>
                            <span>Novo sistema de Scouting e Transferências.</span>
                        </li>
                        <li className="flex gap-2 items-start">
                            <span className="text-emerald-500 mt-1">➜</span>
                            <span>Melhoria na estabilidade do carregamento de saves.</span>
                        </li>
                        <li className="flex gap-2 items-start">
                            <span className="text-emerald-500 mt-1">➜</span>
                            <span>Interface remodelada para melhor UX.</span>
                        </li>
                    </ul>
                </div>
            </div>

            <GameFlowModals
                state={state}
                onClose={actions.resetToIdle}
                onNewGameConfirm={actions.confirmNewGameSetup}
                onLoadGameConfirm={actions.confirmLoadGame}
            />
        </div>
    );
}

export default StartPage;