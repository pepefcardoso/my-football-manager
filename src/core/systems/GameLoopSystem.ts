import { DAILY_PROCESSING_STAGES, TimeAdvanceResult } from "./TimeSystem";
import { SaveResult } from "../../data/fileSystem";

interface GameLoopCallbacks {
  onProgress: (message: string, type?: "loading" | "success") => void;
  onAdvance: () => Promise<TimeAdvanceResult>;
  onSave: (saveName: string) => Promise<SaveResult>;
  saveName: string;
}

export const executeGameDay = async (
  callbacks: GameLoopCallbacks
): Promise<void> => {
  const { onProgress, onAdvance, onSave, saveName } = callbacks;

  onProgress("Iniciando novo dia...", "loading");

  for (const stage of DAILY_PROCESSING_STAGES) {
    onProgress(stage, "loading");
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  await onAdvance();

  onProgress("Salvando progresso...", "loading");
  await new Promise((resolve) => setTimeout(resolve, 200));

  const result = await onSave(saveName);

  if (result.success) {
    onProgress("Dia finalizado com sucesso!", "success");
  } else {
    throw new Error(result.error || "Erro desconhecido ao salvar o jogo.");
  }
};
