import React, { useState } from 'react';
import { useGameStore } from './state/useGameStore';
import { formatDate, getDayOfWeek } from './core/systems/TimeSystem';
import { Calendar, Play, Sparkles, Save, Disc } from 'lucide-react';

function App() {
  const [notification, setNotification] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const newGame = useGameStore((state) => state.newGame);
  const advanceDay = useGameStore((state) => state.advanceDay);
  const saveGameAction = useGameStore((state) => state.saveGame);
  const clubCount = useGameStore((state) => Object.keys(state.clubs).length);
  const currentDate = useGameStore((state) => state.meta.currentDate);
  const saveName = useGameStore((state) => state.meta.saveName);
  const managerId = useGameStore((state) => state.meta.currentUserManagerId);
  const managerName = useGameStore((state) => state.managers[managerId]?.name);
  const clubs = useGameStore((state) => state.clubs);
  const players = useGameStore((state) => state.players);

  const handleNewGame = () => {
    console.log("Iniciando novo jogo...");
    newGame();
    showNotification("🎮 Novo jogo criado com sucesso!");
  };

  const handleAdvanceDay = () => {
    const result = advanceDay();
    let message = `📅 Avançado 1 dia`;
    if (result.matchesToday.length > 0) {
      message += ` • ${result.matchesToday.length} partida(s) hoje`;
    }
    showNotification(message);
  };

  const handleSaveGame = async () => {
    setIsSaving(true);
    const success = await saveGameAction(saveName || "save-game-01");

    if (success) {
      showNotification("💾 Jogo salvo com sucesso no disco!");
    } else {
      showNotification("❌ Erro ao salvar o jogo.");
    }
    setIsSaving(false);
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center p-8 gap-6 font-sans">

      <div className="text-center">
        <h1 className="text-6xl font-bold text-emerald-400 tracking-tighter drop-shadow-lg">Maestro</h1>
        <p className="text-slate-400 font-medium tracking-wide">Football Management Simulator</p>
      </div>

      {notification && (
        <div className="fixed top-8 right-8 bg-emerald-500 text-slate-900 px-6 py-3 rounded-lg shadow-2xl font-bold animate-in slide-in-from-top duration-300 z-50 flex items-center gap-2">
          <Sparkles size={18} />
          {notification}
        </div>
      )}

      {clubCount === 0 ? (
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-96 text-center shadow-2xl mt-20">
          <div className="mb-6 flex justify-center text-slate-600">
            <Disc size={64} strokeWidth={1} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Bem-vindo, Mister.</h2>
          <p className="text-slate-400 mb-6 text-sm">A sua carreira começa aqui. Crie um novo universo para gerir.</p>
          <button
            onClick={handleNewGame}
            className="px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg shadow-lg w-full transition-all flex items-center justify-center gap-2 text-lg"
          >
            <Sparkles size={24} />
            Novo Jogo
          </button>
        </div>
      ) : (
        <div className="w-full max-w-6xl space-y-6 animate-in fade-in duration-700">

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <Calendar className="text-emerald-400" size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    {formatDate(currentDate)}
                  </h2>
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="bg-slate-700 px-2 py-0.5 rounded text-white text-xs uppercase font-bold tracking-wider">{getDayOfWeek(currentDate)}</span>
                    <span>Mister {managerName}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveGame}
                  disabled={isSaving}
                  className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                  title="Salvar Jogo"
                >
                  <Save size={20} />
                  {isSaving ? "Salvando..." : "Salvar"}
                </button>

                <button
                  onClick={handleAdvanceDay}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-emerald-500/20"
                  title="Avançar dia"
                >
                  <Play size={20} fill="currentColor" />
                  Continuar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-4 pt-6 border-t border-slate-700/50">
              <div className="text-center border-r border-slate-700/50 last:border-0">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Clubes Ativos</p>
                <p className="text-2xl font-bold text-emerald-400">{Object.keys(clubs).length}</p>
              </div>
              <div className="text-center border-r border-slate-700/50 last:border-0">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Base de Dados</p>
                <p className="text-2xl font-bold text-blue-400">{Object.keys(players).length} <span className="text-xs text-slate-500 font-normal">Jogadores</span></p>
              </div>
              <div className="text-center border-r border-slate-700/50 last:border-0">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Save Atual</p>
                <p className="text-sm font-mono text-slate-300 truncate px-4">{saveName}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Temporada</p>
                <p className="text-2xl font-bold text-amber-400">2024/25</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-[600px] shadow-lg">
              <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center backdrop-blur-sm">
                <h3 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
                  🛡️ Clubes
                </h3>
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-white font-mono">{Object.keys(clubs).length}</span>
              </div>
              <div className="overflow-y-auto p-4 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {Object.values(clubs).map((club) => (
                  <div key={club.id} className="p-3 bg-slate-700/30 hover:bg-slate-700/80 rounded-lg border border-slate-700/50 flex justify-between items-center transition-all cursor-default group">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-slate-600 shadow-sm flex-shrink-0"
                        style={{ backgroundColor: club.primaryColor }}
                      />
                      <div>
                        <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{club.name}</div>
                        <div className="text-xs text-slate-400">Reputação: <span className="text-slate-300">{club.reputation}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-[600px] shadow-lg">
              <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center backdrop-blur-sm">
                <h3 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
                  🏃 Jogadores
                </h3>
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-white font-mono">{Object.keys(players).length}</span>
              </div>
              <div className="overflow-y-auto p-4 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {Object.values(players).map((player) => (
                  <div key={player.id} className="p-3 bg-slate-700/30 hover:bg-slate-700/80 rounded-lg border border-slate-700/50 flex justify-between items-center transition-all cursor-default group">
                    <div>
                      <div className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">{player.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex gap-2">
                        <span className="bg-slate-800 px-1.5 rounded text-slate-300">{player.primaryPositionId.substring(0, 3)}</span>
                        <span>{new Date().getFullYear() - new Date(player.birthDate).getFullYear()} anos</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-slate-500 font-mono tracking-wider">OVR</span>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded ${player.technique > 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/30 text-slate-300'}`}>
                        {Math.floor((player.technique + player.intelligence + player.passing) / 3)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default App;