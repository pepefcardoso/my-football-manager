import { useGameStore } from "../../state/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { selectPlayerRowData, PlayerRowData } from "../../state/selectors";

export const usePlayerRowData = (playerId: string): PlayerRowData | null => {
  return useGameStore(
    useShallow((state) => selectPlayerRowData(state, playerId))
  );
};
