import { MatchState } from "../../domain/enums";
import type { MatchEventData } from "../../domain/types";
import { Logger } from "../../lib/Logger";

const logger = new Logger("MatchSimulationService");

export interface MatchSimulationState {
  matchId: number | null;
  state: MatchState;
  currentMinute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEventData[];
  isLoading: boolean;
  error: string | null;
}

type SimulationListener = (state: MatchSimulationState) => void;

class MatchSimulationService {
  private worker: Worker;
  private state: MatchSimulationState;
  private listeners: Set<SimulationListener> = new Set();
  private speed: number = 1;
  private isProcessingTick: boolean = false;

  constructor() {
    this.state = this.getInitialState();

    this.worker = new Worker(
      new URL("../../workers/match.worker.ts", import.meta.url),
      {
        type: "module",
      }
    );

    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }

  private getInitialState(): MatchSimulationState {
    return {
      matchId: null,
      state: MatchState.NOT_STARTED,
      currentMinute: 0,
      homeScore: 0,
      awayScore: 0,
      events: [],
      isLoading: false,
      error: null,
    };
  }

  private async handleWorkerMessage(e: MessageEvent) {
    if (e.data.type === "TICK") {
      await this.processTick();
    }
  }

  private async processTick() {
    if (
      this.isProcessingTick ||
      !this.state.matchId ||
      this.state.state !== MatchState.PLAYING
    )
      return;

    this.isProcessingTick = true;

    try {
      const result = await window.electronAPI.match.simulateMatchMinute(
        this.state.matchId
      );

      if (result) {
        let updateData = result;
        if ("data" in result && "success" in result) {
          updateData = (result as any).data;
        }

        if (!updateData) return;

        const newEvents = [
          ...this.state.events,
          ...(updateData.newEvents || []),
        ];

        this.updateState({
          currentMinute: updateData.currentMinute,
          homeScore: updateData.score.home,
          awayScore: updateData.score.away,
          events: newEvents,
        });

        if (updateData.currentMinute >= 90) {
          this.finishMatch();
        }
      }
    } catch (error) {
      logger.error("Erro no tick de simulação", error);
      this.worker.postMessage({ type: "PAUSE" });
    } finally {
      this.isProcessingTick = false;
    }
  }

  public async startMatch(matchId: number) {
    this.updateState({
      ...this.getInitialState(),
      matchId,
      isLoading: true,
    });

    try {
      const success = await window.electronAPI.match.startMatch(matchId);

      if (success) {
        this.updateState({
          state: MatchState.PLAYING,
          isLoading: false,
        });
        this.worker.postMessage({
          type: "START",
          payload: { speed: this.speed },
        });
      } else {
        this.updateState({
          isLoading: false,
          error: "Falha ao iniciar partida",
        });
      }
    } catch (err) {
      this.updateState({ isLoading: false, error: String(err) });
    }
  }

  public pauseMatch() {
    if (this.state.state === MatchState.PLAYING) {
      window.electronAPI.match.pauseMatch(this.state.matchId!);
      this.worker.postMessage({ type: "PAUSE" });
      this.updateState({ state: MatchState.PAUSED });
    }
  }

  public resumeMatch() {
    if (this.state.state === MatchState.PAUSED) {
      window.electronAPI.match.resumeMatch(this.state.matchId!);
      this.updateState({ state: MatchState.PLAYING });
      this.worker.postMessage({
        type: "START",
        payload: { speed: this.speed },
      });
    }
  }

  public setSpeed(speed: number) {
    this.speed = speed;
    if (this.state.state === MatchState.PLAYING) {
      this.worker.postMessage({ type: "SET_SPEED", payload: { speed } });
    }
  }

  public async simulateToEnd() {
    if (!this.state.matchId) return;

    this.worker.postMessage({ type: "STOP" });
    this.updateState({ isLoading: true });

    try {
      const result = await window.electronAPI.match.simulateFullMatch(
        this.state.matchId
      );
      if (result) {
        this.finishMatch(result);
      }
    } catch (error) {
      this.updateState({ isLoading: false, error: "Erro na simulação rápida" });
    }
  }

  private finishMatch(finalData?: any) {
    this.worker.postMessage({ type: "STOP" });

    const updates: Partial<MatchSimulationState> = {
      state: MatchState.FINISHED,
      currentMinute: 90,
      isLoading: false,
    };

    if (finalData) {
      updates.homeScore = finalData.homeScore ?? finalData.data?.homeScore;
      updates.awayScore = finalData.awayScore ?? finalData.data?.awayScore;
      updates.events = finalData.events ?? finalData.data?.events;
    }

    this.updateState(updates);
  }

  public reset() {
    this.worker.postMessage({ type: "STOP" });
    this.updateState(this.getInitialState());
  }

  public getState() {
    return this.state;
  }

  public getSpeed() {
    return this.speed;
  }

  private updateState(newState: Partial<MatchSimulationState>) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  public subscribe(listener: SimulationListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const matchSimulationService = new MatchSimulationService();
