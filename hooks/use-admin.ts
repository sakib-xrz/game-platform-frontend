"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminClient } from "@/lib/admin-client";

export function useAdminRuntime() {
  return useQuery({ queryKey: ["admin", "runtime"], queryFn: adminClient.runtime, refetchInterval: 3_000, refetchIntervalInBackground: false });
}

export function useAdminConfigs() {
  return useQuery({ queryKey: ["admin", "configs"], queryFn: adminClient.configs, staleTime: 15_000 });
}

export function useAdminAction(action: () => Promise<unknown>, invalidate: string[] = ["admin", "runtime"]) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: action, onSuccess: async () => { await Promise.all(invalidate.map((key) => queryClient.invalidateQueries({ queryKey: ["admin", key] }))); } });
}
export function useAdminRounds() { return useQuery({ queryKey: ["admin", "rounds"], queryFn: () => adminClient.rounds(), staleTime: 5_000 }); }
export function useAdminAudit() { return useQuery({ queryKey: ["admin", "audit"], queryFn: () => adminClient.auditLogs(), staleTime: 5_000 }); }
export function useAdminApprovals() { return useQuery({ queryKey: ["admin", "approvals"], queryFn: () => adminClient.approvals(), refetchInterval: 8_000 }); }
export function useAdminHealth() { return useQuery({ queryKey: ["admin", "health"], queryFn: adminClient.health, refetchInterval: 10_000, refetchIntervalInBackground: false }); }
