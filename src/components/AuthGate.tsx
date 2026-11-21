import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AuthScreen } from "@/components/AuthScreen";
import { LinkUpMark } from "@/components/LinkUpMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { fetchMyProfile } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase";
import LinkUp from "@/pages/LinkUp";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <div className="brand-lockup mb-6 justify-center">
          <LinkUpMark />
          <span>linkup</span>
        </div>
        {children}
      </div>
    </main>
  );
}

export function AuthGate() {
  const { session, loading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const me = useQuery({
    queryKey: ["me", userId],
    queryFn: () => fetchMyProfile(userId!),
    enabled: Boolean(userId),
    staleTime: Infinity,
    retry: 1,
  });

  const handleSignOut = async () => {
    await signOut();
    queryClient.clear();
  };

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">Almost there</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to a{" "}
          <code>.env</code> file in the project root, then restart <code>npm run dev</code>.
        </p>
      </Centered>
    );
  }

  if (loading || (userId && me.isPending)) {
    return (
      <Centered>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Centered>
    );
  }

  if (!session) return <AuthScreen />;

  if (me.isError || !me.data) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">We couldn’t load your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your connection and try again. If it keeps happening, log out and back in.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => void me.refetch()}>Try again</Button>
          <Button variant="outline" onClick={() => void handleSignOut()}>
            Log out
          </Button>
        </div>
      </Centered>
    );
  }

  return <LinkUp key={userId} me={me.data} onSignOut={() => void handleSignOut()} />;
}
