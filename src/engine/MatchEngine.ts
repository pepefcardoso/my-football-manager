import { MatchEventType, MatchState } from "../domain/enums";
import type { Player } from "../domain/models";
import type {
  MatchConfig,
  MatchEventData,
  MatchResult,
  TeamStrength,
} from "../domain/types";
import { GameBalance } from "./GameBalanceConfig";
import { RandomEngine } from "./RandomEngine";
import { TeamStrengthCalculator } from "./TeamStrengthCalculator";
import type { IMatchState } from "./match/states/IMatchState";
import { NotStartedState } from "./match/states/NotStartedState";

/**
 * MatchEngine - Contexto do State Pattern
 *
 * Responsabilidade Principal:
 * - Manter o estado atual da partida (delegando comportamento para classes State)
 * - Fornecer API pública para controle (start, pause, resume, simulate)
 * - Armazenar dados da partida (placar, eventos, estatísticas)
 * - Fornecer métodos de acesso e mutação para os Estados
 *
 * Design Pattern: State Pattern
 * - currentState: Referência para o estado atual (IMatchState)
 * - setState(): Permite que estados transicionem entre si
 * - Métodos públicos delegam para this.currentState.metodo()
 */
export class MatchEngine {
  private currentState: IMatchState;
  private currentMinute: number = 0;
  private homeScore: number = 0;
  private awayScore: number = 0;
  private events: MatchEventData[] = [];
  private stats = {
    homePossession: 0,
    awayPossession: 0,
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homeCorners: 0,
    awayCorners: 0,
    homeFouls: 0,
    awayFouls: 0,
  };

  public readonly config: MatchConfig;
  public readonly rng: RandomEngine;
  private homeStrength: TeamStrength;
  private awayStrength: TeamStrength;
  private weatherMultiplier: number = 1.0;

  constructor(config: MatchConfig, seed?: number) {
    this.config = config;
    const matchSeed = seed || Date.now();
    this.rng = new RandomEngine(matchSeed);
    this.currentState = new NotStartedState(this);

    this.homeStrength = TeamStrengthCalculator.calculate({
      id: config.homeTeam.id.toString(),
      tacticalBonus: config.homeTacticalBonus || 0,
      players: config.homePlayers.map(
        (p) => ({ ...p, id: p.id.toString() } as any)
      ),
    } as any);

    this.awayStrength = TeamStrengthCalculator.calculate({
      id: config.awayTeam.id.toString(),
      tacticalBonus: config.awayTacticalBonus || 0,
      players: config.awayPlayers.map(
        (p) => ({ ...p, id: p.id.toString() } as any)
      ),
    } as any);

    this.applyWeatherEffects(config.weather || "sunny");
  }

  private applyWeatherEffects(weather: string): void {
    const penalty =
      GameBalance.MATCH.WEATHER_PENALTY[
        weather as keyof typeof GameBalance.MATCH.WEATHER_PENALTY
      ];
    this.weatherMultiplier = penalty || 1.0;
  }

  // ============================================
  // API PÚBLICA - CONTROLES (Delegam para State)
  // ============================================

  /**
   * Inicia a partida (Válido apenas em NOT_STARTED)
   */
  public start(): void {
    this.currentState.start();
  }

  /**
   * Pausa a simulação (Válido apenas em PLAYING)
   */
  public pause(): void {
    this.currentState.pause();
  }

  /**
   * Retoma a simulação (Válido apenas em PAUSED)
   */
  public resume(): void {
    this.currentState.resume();
  }

  /**
   * Simula um minuto de jogo
   * O comportamento depende do estado atual:
   * - NOT_STARTED: Avisa que precisa chamar start() primeiro
   * - PLAYING: Executa lógica de simulação completa
   * - PAUSED: Não faz nada
   * - FINISHED: Avisa que o jogo acabou
   */
  public simulateMinute(): void {
    this.currentState.simulateMinute();
  }

  /**
   * Simula a partida completa do início ao fim
   */
  public simulateToCompletion(): void {
    this.start();
    while (this.currentState.getStateEnum() !== MatchState.FINISHED) {
      this.simulateMinute();
    }
  }

  // ============================================
  // MÉTODOS DE ESTADO (Usados pelas classes State)
  // ============================================

  /**
   * Permite que estados transicionem para outros estados.
   * Chamado internamente por NotStartedState, PlayingState, etc.
   */
  public setState(newState: IMatchState): void {
    this.currentState = newState;
  }

  /**
   * Incrementa o minuto atual da partida
   */
  public incrementMinute(): void {
    this.currentMinute++;
  }

  /**
   * Adiciona um gol ao placar
   */
  public addScore(isHome: boolean): void {
    if (isHome) this.homeScore++;
    else this.awayScore++;
  }

  /**
   * Atualiza contadores de posse de bola
   */
  public updatePossession(isHome: boolean): void {
    if (isHome) this.stats.homePossession++;
    else this.stats.awayPossession++;
  }

  /**
   * Atualiza estatísticas de chutes
   */
  public updateShots(isHome: boolean, total: number, onTarget: number): void {
    if (isHome) {
      this.stats.homeShots += total;
      this.stats.homeShotsOnTarget += onTarget;
    } else {
      this.stats.awayShots += total;
      this.stats.awayShotsOnTarget += onTarget;
    }
  }

  /**
   * Atualiza contador de escanteios
   */
  public updateCorners(isHome: boolean): void {
    if (isHome) this.stats.homeCorners++;
    else this.stats.awayCorners++;
  }

  /**
   * Atualiza contador de faltas
   */
  public updateFouls(isHome: boolean): void {
    if (isHome) this.stats.homeFouls++;
    else this.stats.awayFouls++;
  }

  /**
   * Adiciona um evento ao histórico da partida
   */
  public addEvent(
    minute: number,
    type: MatchEventType,
    teamId: number | null,
    playerId: number | null,
    description: string
  ): void {
    this.events.push({ minute, type, teamId, playerId, description });
  }

  // ============================================
  // GETTERS (Acessados pelos States e UI)
  // ============================================

  public getCurrentMinute(): number {
    return this.currentMinute;
  }

  /**
   * Retorna o enum do estado atual (para UI e lógica externa)
   */
  public getState(): MatchState {
    return this.currentState.getStateEnum();
  }

  public getCurrentScore(): { home: number; away: number } {
    return { home: this.homeScore, away: this.awayScore };
  }

  public getEvents(): MatchEventData[] {
    return this.events;
  }

  public getHomeStrength(): TeamStrength {
    return this.homeStrength;
  }

  public getAwayStrength(): TeamStrength {
    return this.awayStrength;
  }

  public getWeatherMultiplier(): number {
    return this.weatherMultiplier;
  }

  // ============================================
  // FINALIZAÇÃO E RESULTADO
  // ============================================

  /**
   * Retorna o resultado final da partida.
   * Compila todos os dados (placar, eventos, estatísticas, updates de jogadores)
   */
  public getMatchResult(): MatchResult {
    if (this.currentState.getStateEnum() !== MatchState.FINISHED) {
      console.warn(
        "Warning: getMatchResult() called before match finished. Forcing completion."
      );
      this.simulateToCompletion();
    }

    return this.compileFinalResult();
  }

  private compileFinalResult(): MatchResult {
    const playerUpdates = this.calculatePlayerUpdates();
    const totalPossession =
      this.stats.homePossession + this.stats.awayPossession;
    const finalHomePossession =
      totalPossession > 0
        ? Math.round((this.stats.homePossession / totalPossession) * 100)
        : 50;

    return {
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      events: this.events,
      stats: {
        ...this.stats,
        homePossession: finalHomePossession,
        awayPossession: 100 - finalHomePossession,
      },
      playerUpdates,
    };
  }

  /**
   * Calcula as atualizações de atributos dos jogadores após a partida
   * (moral, energia, rating, gols, assistências)
   */
  private calculatePlayerUpdates(): MatchResult["playerUpdates"] {
    const updates: MatchResult["playerUpdates"] = [];
    const homeRep = this.config.homeTeam.reputation || 5000;
    const awayRep = this.config.awayTeam.reputation || 5000;
    const homeWon = this.homeScore > this.awayScore;
    const draw = this.homeScore === this.awayScore;

    const process = (
      players: Player[],
      won: boolean,
      draw: boolean,
      opponentRep: number,
      teamRep: number
    ) => {
      for (const player of players) {
        let moralChange = 0;
        if (won) {
          const repDiff = opponentRep - teamRep;
          moralChange = 5 + Math.max(0, Math.min(15, repDiff / 500));
        } else if (!won && !draw) {
          const repDiff = teamRep - opponentRep;
          moralChange = -5 - Math.max(0, Math.min(15, repDiff / 500));
        } else {
          moralChange = opponentRep > teamRep ? 2 : -2;
        }
        const newMoral = Math.max(0, Math.min(100, player.moral + moralChange));

        updates.push({
          playerId: player.id,
          energy: Math.max(0, player.energy - 15),
          moral: Math.round(newMoral),
          isInjured: false,
          rating: won ? 7.0 : draw ? 6.5 : 6.0,
          goals: this.events.filter(
            (e) => e.type === MatchEventType.GOAL && e.playerId === player.id
          ).length,
          assists: 0,
        });
      }
    };

    process(this.config.homePlayers, homeWon, draw, awayRep, homeRep);
    process(this.config.awayPlayers, !homeWon, draw, homeRep, awayRep);

    return updates;
  }
}
