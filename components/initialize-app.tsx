'use client';

import { useEffect } from 'react';

/**
 * 应用初始化组件
 * 在客户端运行时执行初始化代码（支付提供商、Sentry、安全检查等）
 * 这样可以避免在 Next.js 构建时执行这些代码
 */
export default function InitializeApp() {
  useEffect(() => {
    // 仅在客户端执行一次
    const initializeApp = async () => {
      try {
        // 初始化支付提供商
        const { initializePaymentProviders } = await import('@/lib/payment/init');
        initializePaymentProviders();

        // 初始化 Sentry
        const { initSentry } = await import('@/lib/sentry');
        initSentry();

        // 启动安全检查
        await import('@/lib/startup-checks');
      } catch (error) {
        console.warn('Failed to initialize app:', error);
        // 初始化失败不应该阻塞应用
      }
    };

    initializeApp();
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
