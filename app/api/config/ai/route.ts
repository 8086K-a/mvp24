/**
 * AI 配置 API
 * 根据用户区域返回对应的 AI 配置
 */

import { NextRequest, NextResponse } from "next/server";
import {
  loadAIConfig,
  getEnabledAgents,
  hasEnabledAI,
} from "@/lib/ai/ai-config-loader";

export async function GET(request: NextRequest) {
  try {
    // 从 middleware 设置的 Header 读取区域信息
    const region = request.headers.get("X-User-Region") || "global";
    const country = request.headers.get("X-User-Country") || "Unknown";

    console.log(`📡 AI 配置请求 - 区域: ${region}, 国家: ${country}`);

    // 加载对应区域的配置
    const config = loadAIConfig(region as "china" | "global" | "usa");

    // 获取已启用的智能体
    const enabledAgents = getEnabledAgents(
      region as "china" | "global" | "usa"
    );

    // 检查是否有可用的 AI
    const hasAI = hasEnabledAI(region as "china" | "global" | "usa");

    if (!hasAI) {
      console.warn(`⚠️ 区域 ${region} 没有启用的 AI Provider`);
      return NextResponse.json(
        {
          error: "No AI providers enabled",
          message: "Please configure API keys in environment variables",
          region,
          country,
        },
        { status: 503 }
      );
    }

    // 返回配置（不包含 API 密钥）
    return NextResponse.json({
      success: true,
      region: config.region,
      country,
      agents: enabledAgents,
      totalAgents: enabledAgents.length,
      providers: config.providers.map((p) => ({
        provider: p.provider,
        enabled: p.enabled,
        baseURL: p.baseURL,
        // ⚠️ 不返回 API 密钥到前端
      })),
    });
  } catch (error) {
    console.error("❌ AI 配置加载失败:", error);
    return NextResponse.json(
      {
        error: "Failed to load AI configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
