import React from 'react';
import { useGameStore } from './state/useGameStore';
import { createNewGame } from './data/initialSetup';

function App() {
  const loadGame = useGameStore((state) => state.loadGame);
  const clubCount = useGameStore((state) => Object.keys(state.clubs).length);
  const managerId = useGameStore((state) => state.meta.currentUserManagerId);
  const managerName = useGameStore((state) => state.managers[managerId]?.name);
  const clubs = useGameStore((state) => state.clubs);
  const players = useGameStore((state) => state.players);

  const handleNewGame = () => {
    console.log("Iniciando novo jogo...");
    const newState = createNewGame();
    loadGame(newState);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center p-8 gap-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-emerald-400 tracking-tighter">Maestro</h1>
        <p className="text-slate-400">Football Management Simulator</p>
      </div>

      {clubCount === 0 ? (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 w-96 text-center shadow-xl mt-20">
          <button
            onClick={handleNewGame}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded shadow-lg w-full transition-all"
          >
            Novo Jogo
          </button>
        </div>
      ) : (
        <div className="w-full max-w-6xl space-y-6 animate-in fade-in duration-700">

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center shadow-lg">
            <div>
              <h2 className="text-xl font-bold text-emerald-400">Mundo Gerado com Sucesso</h2>
              <p className="text-sm text-slate-400">Treinador Ativo: <span className="text-white">{managerName}</span></p>
            </div>
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors">
              Entrar no Escritório &rarr;
            </button>
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