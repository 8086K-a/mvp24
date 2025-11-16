"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  getStoredAuthState,
  clearAuthState,
  initializeTokenPreloader,
  initAuthStateManager,
} from "@/lib/auth-state-manager";
import { getAuthClient } from "@/lib/auth/client";
import { isChinaRegion } from "@/lib/config/region";
import { supabase } from "@/lib/supabase";

const authClient = getAuthClient();

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  subscription_plan?: string;
  subscription_status?: string;
  subscription_expires_at?: string;
  membership_expires_at?: string;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthInitialized: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await authClient.signOut();
      if (error) {
        console.error("❌ [Auth] 登出失败:", error);
      }
      clearAuthState();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      console.log("🔄 [Auth] 刷新用户信息...");
      const { tokenManager } = await import("@/lib/frontend-token-manager");
      const headers = await tokenManager.getAuthHeaderAsync();
      if (!headers) {
        console.warn("⚠️ [Auth] 无法获取认证信息");
        return;
      }

      const response = await fetch("/api/profile", { headers });
      if (!response.ok) {
        throw new Error(`刷新用户信息失败: ${response.status}`);
      }

      const updatedUser = await response.json();
      setUser(updatedUser as UserProfile);
      console.log("✅ [Auth] 用户信息已刷新");
    } catch (error) {
      console.error("❌ [Auth] 刷新用户信息失败:", error);
    }
  }, []);

  // P0：同步初始化认证状态（从 localStorage 同步读取）
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("📝 [Auth] 同步初始化认证状态...");

        // 0. 初始化认证管理器（清除旧键，仅用于CN）
        if (isChinaRegion()) {
          initAuthStateManager();
        }

        // 1. 根据区域读取认证状态
        let authState = null;

        if (isChinaRegion()) {
          // CN：从 CloudBase 的 app-auth-state 读取
          authState = getStoredAuthState();
        } else {
          // INTL：从 Supabase 的 getSession() 读取
          console.log("🌍 [Auth] INTL 模式，从 Supabase 读取 session...");
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error("❌ [Auth] Supabase getSession 失败:", error);
          } else if (data?.session?.user) {
            console.log(
              `✅ [Auth] 从 Supabase 恢复用户: ${data.session.user.email}`
            );
            // 转换 Supabase 用户为 UserProfile 格式
            authState = {
              user: {
                id: data.session.user.id,
                email: data.session.user.email || "",
                name:
                  data.session.user.user_metadata?.displayName ||
                  data.session.user.user_metadata?.full_name ||
                  "",
                avatar: data.session.user.user_metadata?.avatar || "",
              },
            };
          }
        }

        if (authState && authState.user) {
          // 2. 立即设置用户信息（同步操作）
          setUser(authState.user as UserProfile);
          console.log(`✅ [Auth] 恢复用户: ${authState.user.email}`);
        } else {
          setUser(null);
          console.log("❌ [Auth] 无有效认证状态");
        }

        // 3. 标记初始化完成（重要：阻止闪烁）
        setIsAuthInitialized(true);
        setLoading(false);

        // P2-2: 初始化 token 预加载器（仅用于 CN）
        if (isChinaRegion()) {
          initializeTokenPreloader();
        }
      } catch (error) {
        console.error("❌ [Auth] 初始化失败:", error);
        setUser(null);
        setIsAuthInitialized(true);
        setLoading(false);
      }
    };

    // 异步执行初始化
    initializeAuth();
  }, []);

  // P1：多标签页同步（CN模式下监听 storage 事件）
  useEffect(() => {
    if (isChinaRegion()) {
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === "app-auth-state") {
          console.log("📡 [Auth] 检测到其他标签页的认证变化");
          if (!event.newValue) {
            // 其他标签页登出了
            setUser(null);
          } else {
            try {
              const authState = JSON.parse(event.newValue);
              if (authState.user) {
                setUser(authState.user as UserProfile);
              }
            } catch (error) {
              console.error("❌ [Auth] 解析跨标签页数据失败:", error);
              setUser(null);
            }
          }
        }
      };

      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);

  // P1：自定义事件监听（同标签页内 auth 状态变化）
  useEffect(() => {
    const handleAuthStateChanged = async () => {
      console.log("🔔 [Auth] 检测到认证状态变化");

      if (isChinaRegion()) {
        // CN：从 CloudBase 读取
        const authState = getStoredAuthState();
        if (authState?.user) {
          setUser(authState.user as UserProfile);
        } else {
          setUser(null);
        }
      } else {
        // INTL：从 Supabase 读取
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("❌ [Auth] Supabase getSession 失败:", error);
          setUser(null);
        } else if (data?.session?.user) {
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || "",
            name:
              data.session.user.user_metadata?.displayName ||
              data.session.user.user_metadata?.full_name ||
              "",
            avatar: data.session.user.user_metadata?.avatar || "",
          });
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener("auth-state-changed", handleAuthStateChanged);
    return () =>
      window.removeEventListener("auth-state-changed", handleAuthStateChanged);
  }, []);

  // INTL：Supabase 认证状态变化监听器
  useEffect(() => {
    if (!isChinaRegion()) {
      console.log("🌍 [Auth] 设置 Supabase auth 状态变化监听器...");

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔔 [Auth] Supabase 认证事件: ${event}`);

        if (session?.user) {
          console.log(`✅ [Auth] Supabase 用户登录: ${session.user.email}`);
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name:
              session.user.user_metadata?.displayName ||
              session.user.user_metadata?.full_name ||
              "",
            avatar: session.user.user_metadata?.avatar || "",
          });
        } else {
          console.log("❌ [Auth] Supabase 用户登出");
          setUser(null);
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  const contextValue = useMemo(
    () => ({ user, loading, isAuthInitialized, signOut, refreshUser }),
    [user, loading, isAuthInitialized, signOut, refreshUser]
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
