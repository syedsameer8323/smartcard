import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, refreshAccessToken, tokenStorage } from "../services/api.js";
import { useToast } from "../components/Toast.jsx";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const getCurrentUser = useCallback(async () => {
    const { data } = await authApi.me();
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    (async () => {
      if (tokenStorage.get("access") || tokenStorage.get("refresh")) {
        try {
          await getCurrentUser();
        } catch {
          tokenStorage.clear();
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, [getCurrentUser]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      toast.error("Your session has expired. Please log in again.");
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [toast]);

  // First stage: validate password and request an emailed OTP. No JWT is stored here.
  const login = useCallback(async ({ email, password }) => {
    const { data } = await authApi.login({ email, password });
    return data;
  }, []);

  const verifyLoginOTP = useCallback(async ({ challenge_id, code, remember }) => {
    const { data } = await authApi.verifyLoginOTP({ challenge_id, code });
    tokenStorage.set(data.access, data.refresh, remember);
    setUser(data.user);
    return data.user;
  }, []);

  const resendLoginOTP = useCallback(async (challenge_id) => {
    const { data } = await authApi.resendLoginOTP({ challenge_id });
    return data;
  }, []);

  const register = useCallback(async (payload) => (await authApi.register(payload)).data, []);

  const logout = useCallback(async () => {
    const refresh = tokenStorage.get("refresh");
    try {
      if (refresh) await authApi.logout(refresh);
    } catch {
      // An expired/blacklisted token still means the local session should be cleared.
    }
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    verifyLoginOTP,
    resendLoginOTP,
    register,
    logout,
    getCurrentUser,
    refreshToken: refreshAccessToken,
  }), [user, loading, login, verifyLoginOTP, resendLoginOTP, register, logout, getCurrentUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
