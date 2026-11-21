import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { supabase } from "@/lib/supabase";
import {
  approveJoinRequest,
  cancelJoinRequest,
  createVibe,
  declineJoinRequest,
  fetchMyRequests,
  fetchPendingApplicants,
  fetchUpcomingVibes,
  requestToJoin,
  toVibe,
  type NewVibe,
} from "@/lib/vibes";

export const vibesKey = ["vibes"] as const;
export const myRequestsKey = (userId: string) => ["my-requests", userId] as const;
export const applicantsKey = (userId: string) => ["applicants", userId] as const;

/** Upcoming vibes from Supabase, each combined with my own join request for it. */
export function useVibes(userId: string) {
  const vibesQuery = useQuery({
    queryKey: vibesKey,
    queryFn: fetchUpcomingVibes,
    staleTime: 30_000,
  });
  const requestsQuery = useQuery({
    queryKey: myRequestsKey(userId),
    queryFn: () => fetchMyRequests(userId),
    staleTime: 30_000,
  });

  const vibes = useMemo(() => {
    const now = new Date();
    return (vibesQuery.data ?? []).map((row) =>
      toVibe(row, userId, requestsQuery.data?.[row.id] ?? null, now),
    );
  }, [vibesQuery.data, requestsQuery.data, userId]);

  return {
    vibes,
    isLoading: vibesQuery.isPending,
    isError: vibesQuery.isError,
    refetch: () => {
      void vibesQuery.refetch();
      void requestsQuery.refetch();
    },
  };
}

/** Resolves with the new vibe's id once the list has been refreshed to include it. */
export function useCreateVibe(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewVibe) => createVibe(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vibesKey }),
  });
}

/** People waiting to join the vibes I host. */
export function useApplicants(userId: string) {
  const query = useQuery({
    queryKey: applicantsKey(userId),
    queryFn: () => fetchPendingApplicants(userId),
    staleTime: 15_000,
  });
  return { applicants: query.data ?? [], isLoading: query.isPending };
}

/**
 * Request, cancel, approve and decline. Each one refreshes the feed (crew counts), my requests
 * and the host's applicants afterwards, even when it fails, so a "crew is full" shows up fresh.
 */
export function useJoinActions(userId: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: vibesKey }),
      queryClient.invalidateQueries({ queryKey: myRequestsKey(userId) }),
      queryClient.invalidateQueries({ queryKey: applicantsKey(userId) }),
    ]);

  return {
    request: useMutation({ mutationFn: requestToJoin, onSettled: refresh }),
    cancel: useMutation({ mutationFn: cancelJoinRequest, onSettled: refresh }),
    approve: useMutation({ mutationFn: approveJoinRequest, onSettled: refresh }),
    decline: useMutation({ mutationFn: declineJoinRequest, onSettled: refresh }),
  };
}

/**
 * Live updates: when a join request is created or decided, refresh what depends on it, so a host
 * sees new applicants and a guest sees "You're in" without reloading. Row-level security applies,
 * so each person only hears about their own requests and the ones on their own vibes.
 */
export function useJoinRequestUpdates(userId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`join-requests-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "join_requests" }, () => {
        void queryClient.invalidateQueries({ queryKey: vibesKey });
        void queryClient.invalidateQueries({ queryKey: myRequestsKey(userId) });
        void queryClient.invalidateQueries({ queryKey: applicantsKey(userId) });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}