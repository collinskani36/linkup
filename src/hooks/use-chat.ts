import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  fetchMessages,
  mergeMessage,
  sendMessage,
  toMessage,
  type ChatMessage,
  type MessageRow,
} from "@/lib/chat";
import { supabase } from "@/lib/supabase";

export const messagesKey = (vibeId: string) => ["messages", vibeId] as const;

/**
 * One crew's chat: the history, new messages arriving live, and sending. Row-level security means
 * only people in the crew can read or write, so there's nothing to filter on our side.
 */
export function useChat(vibeId: string | undefined, userId: string) {
  const queryClient = useQueryClient();
  const enabled = Boolean(vibeId);

  const query = useQuery({
    queryKey: messagesKey(vibeId ?? ""),
    queryFn: () => fetchMessages(vibeId!),
    enabled,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!vibeId) return;
    const key = messagesKey(vibeId);
    const channel = supabase
      .channel(`chat-${vibeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `vibe_id=eq.${vibeId}` },
        (payload) => {
          const message = toMessage(payload.new as MessageRow);
          queryClient.setQueryData<ChatMessage[]>(key, (current) =>
            mergeMessage(current ?? [], message),
          );
        },
      )
      // Reloading once we're connected closes the gap between the first fetch and going live,
      // and catches up after a dropped connection.
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void queryClient.invalidateQueries({ queryKey: key });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [vibeId, queryClient]);

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(vibeId!, userId, body),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey(message.vibeId), (current) =>
        mergeMessage(current ?? [], message),
      );
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: enabled && query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
    send,
  };
}