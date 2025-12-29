import { useMutation } from "@tanstack/react-query";
import { Logger } from "../lib/Logger";

const logger = new Logger("useTrainingManagement");

interface UseTrainingManagementProps {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useTrainingManagement({
  onSuccess,
  onError,
}: UseTrainingManagementProps = {}) {
  const mutation = useMutation({
    mutationFn: async (focus: string) => {
      logger.info(`Atualizando foco de treino para: ${focus}`);
      const success = await window.electronAPI.game.updateTrainingFocus(focus);
      if (!success) {
        throw new Error("Falha ao atualizar o foco do treino no backend.");
      }
      return success;
    },
    onSuccess: () => {
      logger.info("Foco de treino atualizado com sucesso.");
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      logger.error("Erro ao atualizar treino:", error);
      if (onError) {
        onError(error);
      } else {
        alert("Não foi possível atualizar o treino. Tente novamente.");
      }
    },
  });

  return {
    updateTraining: mutation.mutate,
    updateTrainingAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
