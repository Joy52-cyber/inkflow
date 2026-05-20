import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api("/me", { auth: true })
      .then((d) => setCreator(d.creator))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { creator, token } = await api("/auth/login", { method: "POST", body: { email, password } });
    setToken(token); setCreator(creator);
  }
  async function register(email, displayName, password) {
    const { creator, token } = await api("/auth/register", { method: "POST", body: { email, displayName, password } });
    setToken(token); setCreator(creator);
  }
  function logout() { setToken(null); setCreator(null); }

  return <Ctx.Provider value={{ creator, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
