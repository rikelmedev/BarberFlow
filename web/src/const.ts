/// <reference types="vite/client" />
const VITE_MANUS_AUTH_URL = import.meta.env.VITE_MANUS_AUTH_URL as string | undefined;
const VITE_APP_URL = import.meta.env.VITE_APP_URL as string | undefined;
const VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined;

export const API_URL = VITE_API_URL ?? "https://fuzzy-space-palm-tree-wr4vjpvv565vhgj9x-3001.app.github.dev/";
export const APP_URL = VITE_APP_URL ?? "https://fuzzy-space-palm-tree-wr4vjpvv565vhgj9x-5173.app.github.dev/";
export const TRPC_URL = `${API_URL}/trpc`;


export function getLoginUrl(redirectPath = "/"): string {
  try {
    if (!VITE_MANUS_AUTH_URL) {
      console.warn(
        "[Auth] VITE_MANUS_AUTH_URL is not set. Using fallback login URL."
      );
      return `/login?redirect=${encodeURIComponent(redirectPath)}`;
    }

    const authUrl = new URL(VITE_MANUS_AUTH_URL);
    const redirectUri = new URL(redirectPath, APP_URL);

    authUrl.searchParams.set("redirect_uri", redirectUri.toString());
    authUrl.searchParams.set("response_type", "code");

    return authUrl.toString();
  } catch (error) {
    console.error("[Auth] Failed to construct login URL:", error);
    return `/login?redirect=${encodeURIComponent(redirectPath)}`;
  }
}

/**
 * Retorna a URL de logout
 */
export function getLogoutUrl(): string {
  try {
    if (!VITE_MANUS_AUTH_URL) {
      return "/";
    }
    const baseUrl = new URL(VITE_MANUS_AUTH_URL);
    const logoutUrl = new URL("/logout", baseUrl.origin);
    logoutUrl.searchParams.set("redirect_uri", APP_URL);
    return logoutUrl.toString();
  } catch {
    return "/";
  }
}

/**
 * Definições de Planos e Limites
 */
export const SUBSCRIPTION_TIERS = {
  starter: {
    label: "Starter",
    price: "R$ 49",
    period: "/mês",
    monthlyLimit: 30, //
    features: [
      "Até 30 agendamentos/mês",
      "1 salão",
      "Profissionais ilimitados",
      "Página de agendamento pública",
      "Dashboard administrativo",
    ],
  },
  pro: {
    label: "Pro",
    price: "R$ 99",
    period: "/mês",
    monthlyLimit: null, 
    features: [
      "Agendamentos ilimitados",
      "1 salão",
      "Profissionais ilimitados",
      "Tudo do Starter +",
      "Suporte prioritário",
      "Analytics avançado",
    ],
  },
} as const;