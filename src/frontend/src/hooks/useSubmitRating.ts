/**
 * useSubmitRating — mutation hook for submitting a community rating.
 *
 * Creates an authenticated actor using the user's Internet Identity,
 * then calls rateEntry on the backend.
 *
 * The backend's rateEntry checks AccessControl.hasPermission(#user).
 * For non-anonymous II users, this check passes when no strict role list
 * is configured — any authenticated non-anonymous principal is treated as #user.
 */
import { createActorWithConfig } from "@/config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInternetIdentity } from "./useInternetIdentity";

interface RatingInput {
  entryId: bigint;
  rating: number;
}

export function useSubmitRating() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation<void, Error, RatingInput>({
    mutationFn: async ({ entryId, rating }: RatingInput) => {
      if (!identity)
        throw new Error("Not authenticated — please sign in to rate");
      const actor = await createActorWithConfig({ agentOptions: { identity } });
      await actor.rateEntry(entryId, BigInt(rating));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["all-entry-ratings"] });
      void queryClient.invalidateQueries({ queryKey: ["caller-ratings"] });
    },
  });
}
