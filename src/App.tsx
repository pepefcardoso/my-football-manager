import React, { useState } from 'react';
import { useGameStore } from './state/useGameStore';
import { createNewGame } from './data/initialSetup';
import { formatDate, getDayOfWeek } from './core/systems/TimeSystem';
import { Calendar, Play, FastForward, SkipForward, Sparkles } from 'lucide-react';

function App() {
  const [notification, setNotification] = useState<string>("");
  const loadGame = useGameStore((state) => state.loadGame);
  const advanceDay = useGameStore((state) => state.advanceDay);
  const advanceMultipleDays = useGameStore((state) => state.advanceMultipleDays);
  const advanceToNextUserMatch = useGameStore((state) => state.advanceToNextUserMatch);

  const clubCount = useGameStore((state) => Object.keys(state.clubs).length);
  const currentDate = useGameStore((state) => state.meta.currentDate);
  const managerId = useGameStore((state) => state.meta.currentUserManagerId);
  const managerName = useGameStore((state) => state.managers[managerId]?.name);
  const clubs = useGameStore((state) => state.clubs);
  const players = useGameStore((state) => state.players);

  const handleNewGame = () => {
    console.log("Iniciando novo jogo...");
    const newState = createNewGame();
    loadGame(newState);
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

  const handleAdvanceWeek = () => {
    const result = advanceMultipleDays(7);
    showNotification(`⏭️ Avançado 7 dias • Nova data: ${formatDate(result.newDate)}`);
  };

  const handleAdvanceToMatch = () => {
    const result = advanceToNextUserMatch();

    if (result) {
      showNotification(`⚽ Avançado até próxima partida (${formatDate(result.newDate)})`);
    } else {
      showNotification("❌ Nenhuma partida encontrada no próximo ano");
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center p-8 gap-6">

      <div className="text-center">
        <h1 className="text-6xl font-bold text-emerald-400 tracking-tighter">Maestro</h1>
        <p className="text-slate-400">Football Management Simulator</p>
      </div>

      {notification && (
        <div className="fixed top-8 right-8 bg-emerald-500 text-slate-900 px-6 py-3 rounded-lg shadow-2xl font-semibold animate-in slide-in-from-top duration-300 z-50">
          {notification}
        </div>
      )}

      {clubCount === 0 ? (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 w-96 text-center shadow-xl mt-20">
          <button
            onClick={handleNewGame}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded shadow-lg w-full transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={20} />
            Novo Jogo
          </button>
        </div>
      ) : (
        <div className="w-full max-w-6xl space-y-6 animate-in fade-in duration-700">

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Calendar className="text-emerald-400" size={32} />
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {formatDate(currentDate)}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {getDayOfWeek(currentDate)} • Treinador: {managerName}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAdvanceDay}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded transition-all flex items-center gap-2 shadow-lg"
                  title="Avançar 1 dia"
                >
                  <Play size={18} />
                  1 Dia
                </button>

                <button
                  onClick={handleAdvanceWeek}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded transition-all flex items-center gap-2 shadow-lg"
                  title="Avançar 7 dias"
                >
                  <FastForward size={18} />
                  1 Semana
                </button>

                <button
                  onClick={handleAdvanceToMatch}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded transition-all flex items-center gap-2 shadow-lg"
                  title="Avançar até próximo jogo"
                >
                  <SkipForward size={18} />
                  Próximo Jogo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
              <div className="text-center">
                <p className="text-xs text-slate-500">Clubes Gerados</p>
                <p className="text-xl font-bold text-emerald-400">{Object.keys(clubs).length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Jogadores Total</p>
                <p className="text-xl font-bold text-blue-400">{Object.keys(players).length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Timestamp Atual</p>
                <p className="text-xs font-mono text-slate-400">{currentDate}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col h-[600px] shadow-lg">
              <div className="p-4 bg-slate-950/30 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-lg text-emerald-400">Clubes</h3>
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-white">{Object.keys(clubs).length}</span>
              </div>
              <div className="overflow-y-auto p-4 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-600">
                {Object.values(clubs).map((club) => (
                  <div key={club.id} className="p-3 bg-slate-700/40 hover:bg-slate-700/60 rounded border border-slate-700/50 flex justify-between items-center transition-colors">
                    <div>
                      <div className="font-bold text-white">{club.name}</div>
                      <div className="text-xs text-slate-400">Reputação: {club.reputation}</div>
                    </div>
                    <div
                      className="w-6 h-6 rounded-full border-2 border-slate-600 shadow-sm"
                      style={{ backgroundColor: club.primaryColor }}
                      title={`Cor: ${club.primaryColor}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col h-[600px] shadow-lg">
              <div className="p-4 bg-slate-950/30 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-lg text-emerald-400">Jogadores</h3>
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-white">{Object.keys(players).length}</span>
              </div>
              <div className="overflow-y-auto p-4 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-600">
                {Object.values(players).map((player) => (
                  <div key={player.id} className="p-3 bg-slate-700/40 hover:bg-slate-700/60 rounded border border-slate-700/50 flex justify-between items-center transition-colors">
                    <div>
                      <div className="font-bold text-white text-sm">{player.name}</div>
                      <div className="text-xs text-slate-400">{player.primaryPositionId} • {new Date(player.birthDate).getFullYear()}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-slate-500 font-mono tracking-wider">{player.id.substring(0, 4)}</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                        Técnica: {player.technique}
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