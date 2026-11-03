import {
  QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: true },
  },
});
// Effects live here, not in feature services or page components.
export const effects = {
  users: ["users", "sprites"],
  friends: ["friends", "items"],
  items: ["items"],
  loans: ["loans", "items"],
  handoff: ["loans", "items"],
  reviews: ["reviews", "items", "loans"],
  chats: ["chats", "messages"],
} as const;
export function useCommand<T>(
  feature: keyof typeof effects,
  command: (input: T) => Promise<unknown>,
) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: command,
    retry: false,
    onSuccess: () => {
      for (const key of effects[feature])
        void cache.invalidateQueries({ queryKey: [key] });
    },
    onError: () => {
      for (const key of effects[feature])
        void cache.invalidateQueries({ queryKey: [key] });
    },
  });
}
