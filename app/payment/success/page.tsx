// app/payment/success/page.tsx - 支付成功页面
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useUser } from "@/components/user-context";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useUser();
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<
    "processing" | "success" | "error"
  >("processing");
  const [paymentDetails, setPaymentDetails] = useState<{
    daysAdded?: number;
    amount?: number;
    currency?: string;
  }>({});
  const [hasProcessed, setHasProcessed] = useState(false); // 🔑 防止重复处理

  useEffect(() => {
    // 🔑 如果已经处理过，直接返回
    if (hasProcessed) {
      return;
    }

    const handlePaymentSuccess = async () => {
      try {
        // 🔄 一次性支付使用不同的参数
        const sessionId = searchParams.get("session_id"); // Stripe
        const token = searchParams.get("token"); // PayPal
        const outTradeNo = searchParams.get("out_trade_no"); // Alipay
        const tradeNo = searchParams.get("trade_no"); // Alipay交易号
        const wechatOutTradeNo = searchParams.get("wechat_out_trade_no"); // WeChat Native QR Code

        console.log("Payment success callback:", {
          sessionId,
          token,
          outTradeNo,
          tradeNo,
          wechatOutTradeNo,
          allParams: Object.fromEntries(searchParams.entries()),
        });

        // 一次性支付:至少要有一个参数
        if (!sessionId && !token && !outTradeNo && !tradeNo && !wechatOutTradeNo) {
          throw new Error("Missing payment confirmation parameters");
        }

        // ✅ Alipay App 通道：没有 trade_no（同步 return 不存在），改用支付状态轮询等待 webhook 完成
        if (outTradeNo && !tradeNo && !sessionId && !token && !wechatOutTradeNo) {
          const paymentId = outTradeNo;

          // 如果是 App 通道（payment page 会把 orderString 放在 sessionStorage），这里负责拉起支付宝一次
          try {
            const orderStringKey = `alipay:orderString:${paymentId}`;
            const launchedKey = `alipay:launched:${paymentId}`;
            const orderString = sessionStorage.getItem(orderStringKey);
            const launched = sessionStorage.getItem(launchedKey);

            if (orderString && !launched) {
              sessionStorage.setItem(launchedKey, "1");
              const orderSuffix = encodeURIComponent(orderString);
              const alipayDeepLink = `alipays://platformapi/startapp?appId=20000125&orderSuffix=${orderSuffix}`;
              window.location.href = alipayDeepLink;
            }
          } catch {
            // ignore
          }

          const start = Date.now();
          const TIMEOUT_MS = 120000;
          const INTERVAL_MS = 2000;

          while (Date.now() - start < TIMEOUT_MS) {
            const res = await fetch(
              `/api/payment/status?paymentId=${encodeURIComponent(paymentId)}`
            );
            if (res.ok) {
              const data = await res.json();
              if (data?.status === "completed") {
                // 关键：completed 只代表支付记录完成，不一定已做会员延期（Alipay App 通道需要 confirm 来落库延期）
                try {
                  const { getAuthClient } = await import("@/lib/auth/client");
                  const sessionResult = await getAuthClient().getSession();
                  const session = sessionResult.data.session;
                  const headers: Record<string, string> = {};
                  if (session?.access_token) {
                    headers["Authorization"] = `Bearer ${session.access_token}`;
                  }

                  const confirmRes = await fetch(
                    `/api/payment/confirm?out_trade_no=${encodeURIComponent(
                      paymentId
                    )}`,
                    { headers }
                  );

                  if (!confirmRes.ok) {
                    const err = await confirmRes.json().catch(() => ({}));
                    throw new Error(err.error || "Payment confirmation failed");
                  }

                  const confirmData = await confirmRes.json();
                  if (!confirmData?.success) {
                    throw new Error(confirmData?.error || "Payment confirmation failed");
                  }
                } catch (e) {
                  console.error("Alipay app confirm failed", e);
                  throw e;
                }

                setHasProcessed(true);
                setPaymentDetails({
                  amount: data.amount,
                  currency: data.currency,
                });
                try {
                  sessionStorage.removeItem(`alipay:orderString:${paymentId}`);
                  sessionStorage.removeItem(`alipay:launched:${paymentId}`);
                } catch {
                  // ignore
                }
                try {
                  localStorage.removeItem("pending_payment");
                } catch {
                  // ignore
                }

                try {
                  await refreshUser();
                } catch {
                  // ignore refresh failure
                }

                setPaymentStatus("success");
                return;
              }
            }
            await new Promise((r) => setTimeout(r, INTERVAL_MS));
          }

          throw new Error("Payment is still processing, please try again");
        }

        // 🔄 调用一次性支付确认API (需要带认证token)
        const params = new URLSearchParams();
        if (sessionId) params.set("session_id", sessionId);
        if (token) params.set("token", token);
        if (outTradeNo) params.set("out_trade_no", outTradeNo);
        if (tradeNo) params.set("trade_no", tradeNo);
        if (wechatOutTradeNo) params.set("wechat_out_trade_no", wechatOutTradeNo);

        // 获取认证 token
        const { getAuthClient } = await import("@/lib/auth/client");
        const sessionResult = await getAuthClient().getSession();
        const session = sessionResult.data.session;

        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(
          `/api/payment/confirm?${params.toString()}`,
          { headers }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Payment confirmation failed");
        }

        const result = await response.json();

        if (result.success) {
          console.log("Payment confirmed:", result);
          // 🔑 标记为已处理，防止重复调用
          setHasProcessed(true);

          // 保存支付详情
          setPaymentDetails({
            daysAdded: result.daysAdded,
            amount: result.amount,
            currency: result.currency,
          });
          // 清除本地存储的支付信息(如果有)
          try {
            localStorage.removeItem("pending_payment");
          } catch (e) {
            // 忽略localStorage错误
          }

          // ✅ 关键修复：刷新用户信息以反映新的会员状态
          console.log("🔄 刷新用户信息以获取最新的会员状态...");
          try {
            await refreshUser();
            console.log("✅ 用户信息已刷新，会员状态已更新");
          } catch (refreshError) {
            console.warn("⚠️ 刷新用户信息失败，但支付已成功:", refreshError);
          }

          setPaymentStatus("success");
        } else {
          throw new Error(result.error || "Payment confirmation failed");
        }
      } catch (error) {
        console.error("Payment confirmation error:", error);
        setPaymentStatus("error");
        setHasProcessed(true); // 🔑 即使失败也标记为已处理，避免无限重试
      } finally {
        setIsProcessing(false);
      }
    };

    handlePaymentSuccess();
  }, [searchParams, hasProcessed]); // 🔑 添加 hasProcessed 到依赖

  const handleContinue = () => {
    router.push("/"); // 或者跳转到用户仪表板
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {paymentStatus === "processing" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <CardTitle className="text-xl">处理支付中...</CardTitle>
              <CardDescription>正在确认您的支付，请稍候</CardDescription>
            </>
          )}

          {paymentStatus === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-xl text-green-600">
                支付成功！
              </CardTitle>
              <CardDescription>
                {paymentDetails.daysAdded
                  ? `已为您添加 ${paymentDetails.daysAdded} 天高级会员`
                  : "您的会员已激活，感谢您的支持"}
              </CardDescription>
              {paymentDetails.amount &&
                paymentDetails.amount > 0 &&
                paymentDetails.currency && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    支付金额: {paymentDetails.amount} {paymentDetails.currency}
                  </div>
                )}
            </>
          )}

          {paymentStatus === "error" && (
            <>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl">✕</span>
              </div>
              <CardTitle className="text-xl text-red-600">
                支付确认失败
              </CardTitle>
              <CardDescription>请联系客服或稍后重试</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="text-center">
          {!isProcessing && (
            <Button onClick={handleContinue} className="w-full">
              {paymentStatus === "success" ? "开始使用" : "返回首页"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <CardTitle className="text-xl">加载中...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
