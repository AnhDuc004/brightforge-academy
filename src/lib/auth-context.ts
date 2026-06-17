import { useQuery } from "@tanstack/react-query";

import api from "@/lib/axios";
import {
  getAccessToken,
  getStoredAuthContext,
  normalizeAuthContext,
  setAuthContext,
  type AuthContext,
} from "@/lib/auth";

export async function fetchAuthContext() {
  const response = await api.get("/v1/auth/me");
  const context = normalizeAuthContext(response.data);

  if (!context) {
    throw new Error("Auth profile response is missing user data.");
  }

  setAuthContext(context);
  return context;
}

export function useAuthContextQuery() {
  const token = getAccessToken();

  return useQuery<AuthContext>({
    queryKey: ["auth", "me", token],
    queryFn: fetchAuthContext,
    enabled: Boolean(token),
    initialData: getStoredAuthContext() ?? undefined,
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
}
