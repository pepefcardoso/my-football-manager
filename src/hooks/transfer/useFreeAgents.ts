import { useQuery } from "@tanstack/react-query";

export function useFreeAgents() {
  const query = useQuery({
    queryKey: ["market", "free-agents"],
    queryFn: () => window.electronAPI.player.getFreeAgents(),
    enabled: false,
  });

  return {
    agents: query.data || [],
    isLoading: query.isLoading,
    fetch: query.refetch,
  };
}
