/**
 * Supabase (国际版) 用户缓存管理器
 * 为国际版提供与国内版一致的用户信息缓存和跨标签页同步功能
 */

export interface SupabaseUserProfile {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  subscription_plan?: string;
  subscription_status?: string;
  subscription_expires_at?: string;
  membership_expires_at?: string;
  [key: string]: any;
}

export interface SupabaseUserCache {
  user: SupabaseUserProfile;
  cachedAt: number; // 缓存时间戳 (毫秒)
  expiresIn: number; // 缓存有效期 (秒)
}

const SUPABASE_USER_CACHE_KEY = "supabase-user-cache";
const DEFAULT_CACHE_DURATION = 300; // 5分钟 (与国内版保持一致)

/**
 * 保存用户信息到本地缓存
 * @param user 用户信息对象
 * @param expiresIn 缓存有效期(秒)，默认300秒
 */
export function saveSupabaseUserCache(
  user: SupabaseUserProfile,
  expiresIn: number = DEFAULT_CACHE_DURATION
): void {
  if (typeof window === "undefined") return;

  try {
    const cache: SupabaseUserCache = {
      user,
      cachedAt: Date.now(),
      expiresIn,
    };

    localStorage.setItem(SUPABASE_USER_CACHE_KEY, JSON.stringify(cache));
    console.log("✅ [Supabase Cache] 用户信息已缓存:", {
      userId: user.id,
      email: user.email,
      expiresIn: `${expiresIn}秒`,
    });

    // 触发跨标签页同步事件
    window.dispatchEvent(
      new CustomEvent("supabase-user-changed", {
        detail: user,
      })
    );
  } catch (error) {
    console.error("❌ [Supabase Cache] 保存用户缓存失败:", error);
    // 保存失败则清除
    localStorage.removeItem(SUPABASE_USER_CACHE_KEY);
  }
}

/**
 * 从本地缓存获取用户信息
 * @returns 缓存的用户信息，如果缓存不存在或已过期则返回 null
 */
export function getSupabaseUserCache(): SupabaseUserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(SUPABASE_USER_CACHE_KEY);
    if (!cached) {
      console.log("📦 [Supabase Cache] 无缓存数据");
      return null;
    }

    const cache: SupabaseUserCache = JSON.parse(cached);

    // 验证数据完整性
    if (!cache.user?.id || !cache.user?.email) {
      console.warn("⚠️ [Supabase Cache] 缓存数据不完整");
      clearSupabaseUserCache();
      return null;
    }

    // 检查是否过期
    const age = Date.now() - cache.cachedAt;
    const ageInSeconds = Math.floor(age / 1000);

    if (age > cache.expiresIn * 1000) {
      console.log("⏰ [Supabase Cache] 缓存已过期:", {
        age: `${ageInSeconds}秒`,
        expiresIn: `${cache.expiresIn}秒`,
      });
      clearSupabaseUserCache();
      return null;
    }

    console.log("✅ [Supabase Cache] 使用缓存的用户信息:", {
      userId: cache.user.id,
      age: `${ageInSeconds}秒`,
      remainingTime: `${cache.expiresIn - ageInSeconds}秒`,
    });

    return cache.user;
  } catch (error) {
    console.error("❌ [Supabase Cache] 读取缓存失败:", error);
    clearSupabaseUserCache();
    return null;
  }
}

/**
 * 清除本地缓存的用户信息
 */
export function clearSupabaseUserCache(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(SUPABASE_USER_CACHE_KEY);
    console.log("🗑️  [Supabase Cache] 用户缓存已清除");

    // 触发跨标签页同步事件
    window.dispatchEvent(
      new CustomEvent("supabase-user-changed", {
        detail: null,
      })
    );
  } catch (error) {
    console.error("❌ [Supabase Cache] 清除缓存失败:", error);
  }
}

/**
 * 检查缓存是否有效
 * @returns 缓存是否存在且未过期
 */
export function isSupabaseCacheValid(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const cached = localStorage.getItem(SUPABASE_USER_CACHE_KEY);
    if (!cached) return false;

    const cache: SupabaseUserCache = JSON.parse(cached);
    const age = Date.now() - cache.cachedAt;

    return age <= cache.expiresIn * 1000;
  } catch (error) {
    return false;
  }
}

/**
 * 更新缓存中的部分用户信息
 * @param updates 要更新的字段
 */
export function updateSupabaseUserCache(
  updates: Partial<SupabaseUserProfile>
): void {
  if (typeof window === "undefined") return;

  try {
    const cached = localStorage.getItem(SUPABASE_USER_CACHE_KEY);
    if (!cached) {
      console.warn("⚠️ [Supabase Cache] 无现有缓存，无法更新");
      return;
    }

    const cache: SupabaseUserCache = JSON.parse(cached);

    // 合并更新
    cache.user = {
      ...cache.user,
      ...updates,
    };

    // 重置缓存时间
    cache.cachedAt = Date.now();

    localStorage.setItem(SUPABASE_USER_CACHE_KEY, JSON.stringify(cache));
    console.log("✅ [Supabase Cache] 用户信息已更新:", updates);

    // 触发跨标签页同步事件
    window.dispatchEvent(
      new CustomEvent("supabase-user-changed", {
        detail: cache.user,
      })
    );
  } catch (error) {
    console.error("❌ [Supabase Cache] 更新缓存失败:", error);
  }
}

/**
 * 获取缓存剩余有效时间(秒)
 * @returns 剩余时间(秒)，如果缓存无效则返回 0
 */
export function getCacheRemainingTime(): number {
  if (typeof window === "undefined") return 0;

  try {
    const cached = localStorage.getItem(SUPABASE_USER_CACHE_KEY);
    if (!cached) return 0;

    const cache: SupabaseUserCache = JSON.parse(cached);
    const age = Date.now() - cache.cachedAt;
    const remaining = cache.expiresIn - Math.floor(age / 1000);

    return remaining > 0 ? remaining : 0;
  } catch (error) {
    return 0;
  }
}
