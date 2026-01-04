// app/api/payment/webhook/alipay/route.ts - 支付宝webhook处理
import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { WebhookHandler } from "../../../../../lib/payment/webhook-handler";
import { isChinaRegion } from "../../../../../lib/config/region";
import { getDatabase } from "../../../../../lib/cloudbase-service";
import { logInfo, logError } from "../../../../../lib/logger";

// Alipay Webhook 依赖 Node.js 加密库
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 [Alipay Webhook] 收到 webhook 请求");

    // 支付宝在POST body中以form-urlencoded格式传递数据
    const formData = await request.formData();
    const params: Record<string, string> = {};

    // 收集所有参数
    formData.forEach((value, key) => {
      params[key] = value as string;
    });

    console.log("📝 [Alipay Webhook] 接收到的参数:", {
      outTradeNo: params.out_trade_no,
      tradeNo: params.trade_no,
      tradeStatus: params.trade_status,
      totalAmount: params.total_amount,
      passbackParams: params.passback_params,
      hasSignature: !!params.sign,
    });

    // 验证支付宝签名
    const isValidSignature = verifyAlipaySignature(
      params,
      process.env.ALIPAY_ALIPAY_PUBLIC_KEY
    );

    console.log("🔐 [Alipay Webhook] 签名验证:", isValidSignature ? "✅ 通过" : "❌ 失败");

    if (!isValidSignature) {
      console.error("❌ [Alipay Webhook] Invalid Alipay webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 检查支付状态
    const tradeStatus = params.trade_status;
    console.log("💰 [Alipay Webhook] 支付状态:", tradeStatus);

    if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
      console.log("⏭️  [Alipay Webhook] 支付状态不是最终状态，忽略:", tradeStatus);
      return NextResponse.json({ status: "ignored" });
    }

    // 幂等性检查: 防止重复处理相同的webhook
    const webhookEventId = `alipay_${params.out_trade_no}_${params.trade_no}`;
    
    if (isChinaRegion()) {
      try {
        const db = getDatabase();
        const result = await db
          .collection("webhook_events")
          .where({ id: webhookEventId })
          .get();

        if ((result.data?.length || 0) > 0) {
          logInfo("Alipay webhook event already processed", {
            webhookEventId,
            outTradeNo: params.out_trade_no,
          });
          // 支付宝要求返回success字符串，即使是重复请求
          return new NextResponse("success");
        }
      } catch (error) {
        logError("Error checking Alipay webhook event", error as Error, {
          webhookEventId,
        });
      }
    }

    console.log("✅ [Alipay Webhook] 支付成功，开始处理");

    // 处理webhook事件
    const webhookHandler = WebhookHandler.getInstance();
    const success = await webhookHandler.processWebhook(
      "alipay",
      tradeStatus,
      params
    );

    console.log("📊 [Alipay Webhook] 处理结果:", success ? "✅ 成功" : "❌ 失败");

    if (success) {
      // 记录webhook事件为已处理
      if (isChinaRegion()) {
        try {
          const db = getDatabase();
          await db.collection("webhook_events").add({
            id: webhookEventId,
            provider: "alipay",
            event_type: tradeStatus,
            event_data: params,
            processed: true,
            created_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
          });
        } catch (error) {
          logError("Error recording Alipay webhook event", error as Error, {
            webhookEventId,
          });
          // 不中断流程，webhook_events只是幂等性辅助
        }
      }

      // 支付宝要求返回success字符串
      console.log("✨ [Alipay Webhook] 返回 success");
      return new NextResponse("success");
    } else {
      console.error("❌ [Alipay Webhook] Failed to process Alipay webhook");
      return new NextResponse("failure");
    }
  } catch (error) {
    console.error("❌ [Alipay Webhook] 异常错误:", error);
    return new NextResponse("failure");
  }
}

/**
 * 验证支付宝签名
 */
function verifyAlipaySignature(
  params: Record<string, string>,
  publicKey?: string
): boolean {
  try {
    // 在开发环境下跳过签名验证
    if (process.env.NODE_ENV === "development") {
      return true;
    }

    if (!publicKey) {
      console.error("Missing Alipay public key");
      return false;
    }

    // 从参数中提取签名
    const sign = params.sign;
    const signType = params.sign_type;

    if (!sign || signType !== "RSA2") {
      console.error("Missing or invalid Alipay signature");
      return false;
    }

    // 移除签名相关参数
    const paramsToSign = { ...params };
    delete paramsToSign.sign;
    delete paramsToSign.sign_type;

    // 排序参数
    const sortedKeys = Object.keys(paramsToSign).sort();
    const signString = sortedKeys
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join("&");

    // 验证RSA2签名
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(signString, "utf8");

    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;

    const isValid = verify.verify(publicKeyPem, sign, "base64");

    if (!isValid) {
      console.error("Alipay signature verification failed");
    }

    return isValid;
  } catch (error) {
    console.error("Alipay signature verification error:", error);
    return false;
  }
}
