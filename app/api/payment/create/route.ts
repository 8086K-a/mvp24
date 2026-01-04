// app/api/payment/create/route.ts - 统一支付创建API（支持订阅+一次性）
import { NextRequest, NextResponse } from "next/server";
import { PayPalProvider } from "@/lib/architecture-modules/layers/third-party/payment/providers/paypal-provider";
import { StripeProvider } from "@/lib/architecture-modules/layers/third-party/payment/providers/stripe-provider";
import { AlipayProvider } from "@/lib/architecture-modules/layers/third-party/payment/providers/alipay-provider";
import { WechatProviderV3 } from "@/lib/architecture-modules/layers/third-party/payment/providers/wechat-provider-v3";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, createAuthErrorResponse } from "@/lib/auth";
import { getDatabase } from "@/lib/auth-utils";
import { isChinaRegion } from "@/lib/config/region";
import { paymentRateLimit } from "@/lib/rate-limit";
import { captureException } from "@/lib/sentry";
import { logInfo, logError, logWarn } from "@/lib/logger";
import {
  getPricingByMethod,
  getDaysByBillingCycle,
} from "@/lib/payment-config";
import type { PaymentMethod, BillingCycle } from "@/lib/payment-config";

export async function POST(request: NextRequest) {
  // 应用速率限制
  return new Promise<NextResponse>((resolve) => {
    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => resolve(NextResponse.json(data, { status: code })),
      }),
      setHeader: () => {},
      getHeader: () => undefined,
    };

    paymentRateLimit(request as any, mockRes as any, async () => {
      resolve(await handlePaymentCreate(request));
    });
  });
}

async function handlePaymentCreate(request: NextRequest) {
  const startTime = Date.now();
  const operationId = `payment_create_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    // 验证用户认证
    const authResult = await requireAuth(request);
    if (!authResult) {
      return createAuthErrorResponse();
    }

    const { user } = authResult;
    const body = await request.json();
    const { method, billingCycle, channel } = body as {
      method: PaymentMethod;
      billingCycle: BillingCycle;
      channel?: string; // 可选："app" 触发原生支付
    };

    logInfo("Creating payment", {
      operationId,
      userId: user.id,
      method,
      billingCycle,
    });

    // 验证必需参数
    if (!method || !billingCycle) {
      logWarn("Missing required parameters", {
        operationId,
        userId: user.id,
        method,
        billingCycle,
      });
      return NextResponse.json(
        { success: false, error: "Missing payment method or billing cycle" },
        { status: 400 }
      );
    }

    // 验证 billingCycle
    if (!["monthly", "yearly"].includes(billingCycle)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid billing cycle. Must be 'monthly' or 'yearly'",
        },
        { status: 400 }
      );
    }

    // 使用统一的支付配置获取货币和金额
    const pricing = getPricingByMethod(method);
    const currency = pricing.currency;
    const amount = pricing[billingCycle];
    const days = getDaysByBillingCycle(billingCycle);

    // 检查最近1分钟内是否有相同的pending或completed支付(防止重复点击)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    let recentPayments: any[] = [];
    let checkError: any = null;

    if (isChinaRegion()) {
      // CloudBase 查询
      try {
        const db = getDatabase();
        const _ = db.command;
        const result = await db
          .collection("payments")
          .where({
            user_id: user.id,
            amount: amount,
            currency: currency,
            payment_method: method,
            created_at: _.gte(oneMinuteAgo),
            status: _.in(["pending", "completed"]),
          })
          .orderBy("created_at", "desc")
          .limit(1)
          .get();

        recentPayments = result.data || [];
      } catch (error) {
        checkError = error;
      }
    } else {
      // Supabase 查询
      const result = await supabaseAdmin
        .from("payments")
        .select("id, status, created_at")
        .eq("user_id", user.id)
        .eq("amount", amount)
        .eq("currency", currency)
        .eq("payment_method", method)
        .gte("created_at", oneMinuteAgo)
        .in("status", ["pending", "completed"])
        .order("created_at", { ascending: false })
        .limit(1);

      recentPayments = result.data || [];
      checkError = result.error;
    }

    if (checkError && (!isChinaRegion() || checkError.code !== "PGRST116")) {
      logError("Error checking existing payment", checkError, {
        operationId,
        userId: user.id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify payment uniqueness, please try again",
        },
        { status: 500 }
      );
    }

    // 如果存在最近的支付,拒绝创建新订单
    if (recentPayments && recentPayments.length > 0) {
      const latestPayment = recentPayments[0];
      const paymentAge =
        Date.now() - new Date(latestPayment.created_at).getTime();

      logWarn("Duplicate payment request blocked", {
        operationId,
        userId: user.id,
        existingPaymentId: latestPayment.id,
        paymentAge: `${Math.floor(paymentAge / 1000)}s`,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "You have a recent payment request. Please wait a moment before trying again.",
          code: "DUPLICATE_PAYMENT_REQUEST",
          existingPaymentId: latestPayment.id,
          waitTime: Math.ceil((60000 - paymentAge) / 1000),
        },
        { status: 429 }
      );
    }

    // 创建支付订单数据
    const order = {
      amount,
      currency,
      description: `${
        billingCycle === "monthly" ? "1 Month" : "1 Year"
      } Premium Membership`,
      userId: user.id,
      planType: "onetime",
      billingCycle,
      metadata: {
        userId: user.id,
        days,
        paymentType: "onetime",
        billingCycle,
      },
    };

    // 根据支付方式创建支付
    let result;

    try {
      if (method === "stripe") {
        logInfo("Creating Stripe payment", {
          operationId,
          userId: user.id,
          amount,
        });
        const stripeProvider = new StripeProvider(process.env);
        result = await stripeProvider.createOnetimePayment(order);
      } else if (method === "paypal") {
        logInfo("Creating PayPal payment", {
          operationId,
          userId: user.id,
          amount,
        });
        const paypalProvider = new PayPalProvider(process.env);
        result = await paypalProvider.createOnetimePayment(order);
      } else if (method === "alipay") {
        logInfo("Creating Alipay payment", {
          operationId,
          userId: user.id,
          amount,
          channel,
        });
        const alipayProvider = new AlipayProvider(process.env);
        if (channel === "app") {
          result = await alipayProvider.createAppPayment(order);
        } else {
          result = await alipayProvider.createPayment(order);
        }
      } else if (method === "wechat") {
        logInfo("Creating WeChat payment", {
          operationId,
          userId: user.id,
          amount,
        });

        if (!isChinaRegion()) {
          return NextResponse.json(
            {
              success: false,
              error: "WeChat payment is only available in China region",
            },
            { status: 400 }
          );
        }

        const out_trade_no = `WX${Date.now()}${Math.random()
          .toString(36)
          .substr(2, 9)
          .toUpperCase()}`;

        const wechatProvider = new WechatProviderV3({
          appId: process.env.WECHAT_APP_ID!,
          mchId: process.env.WECHAT_PAY_MCH_ID!,
          apiV3Key: process.env.WECHAT_PAY_API_V3_KEY!,
          privateKey: process.env.WECHAT_PAY_PRIVATE_KEY!,
          serialNo: process.env.WECHAT_PAY_SERIAL_NO!,
          notifyUrl: `${process.env.APP_URL}/api/payment/webhook/wechat`,
        });

        const wechatResponse = await wechatProvider.createNativePayment({
          out_trade_no,
          amount: Math.round(amount * 100),
          description: order.description,
        });

        result = {
          success: true,
          paymentId: out_trade_no,
          paymentUrl: wechatResponse.codeUrl,
          codeUrl: wechatResponse.codeUrl,
          transactionId: out_trade_no,
        };
      } else {
        return NextResponse.json(
          { success: false, error: `Unsupported payment method: ${method}` },
          { status: 400 }
        );
      }
    } catch (providerError) {
      const e: any = providerError;
      const providerErrorForLog =
        providerError instanceof Error
          ? providerError
          : new Error(
              typeof e?.message === "string"
                ? e.message
                : typeof providerError === "string"
                ? providerError
                : "Payment provider error"
            );

      logError("Payment provider error", providerErrorForLog, {
        operationId,
        userId: user.id,
        method,
      });
      return NextResponse.json(
        {
          success: false,
          error:
            typeof e?.message === "string"
              ? e.message
              : providerError instanceof Error
              ? providerError.message
              : "Payment provider error",
        },
        { status: 500 }
      );
    }

    // 记录到数据库
    if (result && result.success && result.paymentId) {
      const paymentData: any = {
        user_id: user.id,
        amount,
        currency,
        status: "pending",
        payment_method: method,
        transaction_id: result.paymentId,
        metadata: {
          days,
          paymentType: "onetime",
          billingCycle,
        },
      };

      if (method === "wechat") {
        paymentData.out_trade_no = result.paymentId;
        paymentData.code_url = result.codeUrl;
        paymentData.client_type = "native";
      }

      try {
        if (isChinaRegion()) {
          const db = getDatabase();
          await db.collection("payments").add(paymentData);
        } else {
          console.log("💾 Inserting payment data to Supabase:", {
            transactionId: result.paymentId,
            metadata: paymentData.metadata,
          });

          const { data: insertedPayment, error: paymentRecordError } =
            await supabaseAdmin
              .from("payments")
              .insert([paymentData])
              .select("id, metadata");

          if (paymentRecordError) {
            console.error("❌ Supabase insert error:", paymentRecordError);
            throw paymentRecordError;
          }

          if (insertedPayment && insertedPayment.length > 0) {
            const payment = insertedPayment[0];
            console.log("✅ Payment record created with metadata:", {
              paymentId: payment.id,
              metadata: payment.metadata,
            });
            logInfo("Payment record created", {
              operationId,
              userId: user.id,
              paymentId: payment.id,
              transactionId: result.paymentId,
              amount,
              days,
            });
          }
        }
      } catch (paymentRecordError) {
        console.error("❌ Error recording payment:", paymentRecordError);
        logError(
          "Error recording payment",
          paymentRecordError instanceof Error
            ? paymentRecordError
            : new Error(String(paymentRecordError)),
          {
            operationId,
            userId: user.id,
            transactionId: result.paymentId,
            amount,
            currency,
            method,
          }
        );
      }
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Payment creation failed" },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    logInfo("Payment created successfully", {
      operationId,
      userId: user.id,
      method,
      amount,
      days,
      duration: `${duration}ms`,
    });

    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logError("Payment creation error", error as Error, {
      operationId,
      duration: `${duration}ms`,
    });
    captureException(error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
