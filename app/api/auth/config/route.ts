/**
 * 获取认证配置信息（环境变量）
 *
 * 这个端点在服务端运行时读取环境变量，然后返回给客户端
 * 使用延迟初始化模式，避免编译时读取环境变量
 *
 * 为什么需要延迟初始化？
 * - NEXT_PUBLIC_* 变量在编译时被嵌入到 JavaScript 中
 * - 云平台在编译时可能还没有设置这些变量
 * - 在运行时（首次调用时）才读取，这样可以获取云平台动态注入的值
 */

import { NextRequest, NextResponse } from "next/server";

// 缓存配置，避免重复读取
let cachedConfig: any = null;

function getAuthConfig() {
  // 如果已经缓存，直接返回
  if (cachedConfig) {
    return cachedConfig;
  }

  // 延迟到运行时才读取环境变量
  cachedConfig = {
    wechatAppId: process.env.MY_PUBLIC_WECHAT_APP_ID,
    appUrl: process.env.MY_PUBLIC_APP_URL,
    supabaseUrl: process.env.MY_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.MY_PUBLIC_SUPABASE_ANON_KEY,
    wechatCloudbaseId: process.env.MY_PUBLIC_WECHAT_CLOUDBASE_ID,
  };

  return cachedConfig;
}

export async function GET(request: NextRequest) {
  try {
    // 调用延迟初始化函数获取配置
    const config = getAuthConfig();

    // 检查关键配置
    const hasRequiredConfig =
      config.wechatAppId || config.supabaseUrl || config.wechatCloudbaseId;

    if (!hasRequiredConfig) {
      return NextResponse.json(
        {
          error: "No authentication configuration found",
          config: {
            wechatAppId: !!config.wechatAppId,
            appUrl: !!config.appUrl,
            supabaseUrl: !!config.supabaseUrl,
            wechatCloudbaseId: !!config.wechatCloudbaseId,
          },
        },
        { status: 500 }
      );
    }

    // 返回配置信息（只返回公开的信息，不返回密钥）
    return NextResponse.json({
      success: true,
      config: {
        wechatAppId: config.wechatAppId || null,
        appUrl: config.appUrl || null,
        supabaseUrl: config.supabaseUrl || null,
        wechatCloudbaseId: config.wechatCloudbaseId || null,
      },
    });
  } catch (error) {
    console.error("Error fetching auth config:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch configuration",
      },
      { status: 500 }
    );
  }
}
