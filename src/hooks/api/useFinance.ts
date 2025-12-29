import { useQuery } from "@tanstack/react-query";
import { financeApi } from "../../services/api";

export function useFinanceDashboard(teamId: number, seasonId: number) {
  return useQuery({
    queryKey: ["finance", "dashboard", teamId, seasonId],
    queryFn: () => financeApi.getDashboard(teamId, seasonId),
    enabled: !!teamId && !!seasonId,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}

export function useFinancialTransactions(teamId: number, seasonId: number) {
  return useQuery({
    queryKey: ["finance", "transactions", teamId, seasonId],
    queryFn: () => financeApi.getTransactions(teamId, seasonId),
    enabled: !!teamId && !!seasonId,
  });
}

export function useOperationalCosts(teamId: number) {
  return useQuery({
    queryKey: ["finance", "operational-costs", teamId],
    queryFn: () => financeApi.getOperationalCosts(teamId, 19), // TODO matchesPlayed
    enabled: !!teamId,
  });
}

export function useRevenueProjection(teamId: number) {
  return useQuery({
    queryKey: ["finance", "revenue-projection", teamId],
    queryFn: () => financeApi.projectRevenue(teamId, 10, 19),
    enabled: !!teamId,
  });
}
