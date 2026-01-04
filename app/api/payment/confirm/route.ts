// app/api/payment/confirm/route.ts - 统一支付确认API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, createAuthErrorResponse } from "@/lib/auth";
import { isChinaRegion } from "@/lib/config/region";
import { getDatabase } from "@/lib/cloudbase-service";
import { logInfo, logError, logWarn, logBusinessEvent } from "@/lib/logger";
import {
  confirmPayment,
  PaymentConfirmationError,
} from "@/app/api/payment/lib/confirm-payment";
import { extendMembership } from "@/app/api/payment/lib/extend-membership";

export async function GET(request: NextRequest) {
  console.log("🚀🚀🚀 [CONFIRM API] STARTED - Entry point");

  const startTime = Date.now();
  const operationId = `payment_confirm_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    // 验证用户认证
    const authResult = await requireAuth(request);
    if (!authResult) {
      return createAuthErrorResponse();
    }

    const { user } = authResult;
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("session_id");
    const token = searchParams.get("token");
    const outTradeNo = searchParams.get("out_trade_no");
    const tradeNo = searchParams.get("trade_no");
    const wechatOutTradeNo = searchParams.get("wechat_out_trade_no");

    console.log("🚀🚀🚀 [CONFIRM API] Parameters extracted", {
      hasSessionId: !!sessionId,
      hasToken: !!token,
      hasOutTradeNo: !!outTradeNo,
      hasTradeNo: !!tradeNo,
      hasWechatOutTradeNo: !!wechatOutTradeNo,
    });

    logInfo("Processing payment confirmation", {
      operationId,
      userId: user.id,
      hasSessionId: !!sessionId,
      hasToken: !!token,
      hasOutTradeNo: !!outTradeNo,
      hasTradeNo: !!tradeNo,
      hasWechatOutTradeNo: !!wechatOutTradeNo,
    });

    if (!sessionId && !token && !outTradeNo && !tradeNo && !wechatOutTradeNo) {
      logWarn("Missing payment confirmation parameters", {
        operationId,
        userId: user.id,
      });
      return NextResponse.json(
        { success: false, error: "Missing payment confirmation parameters" },
        { status: 400 }
      );
    }

    let transactionId = "";
    let amount = 0;
    let currency = "USD";
    let days = 0;

    try {
      const confirmedPayment = await confirmPayment({
        sessionId: sessionId || undefined,
        token: token || undefined,
        outTradeNo: outTradeNo || undefined,
        tradeNo: tradeNo || undefined,
        wechatOutTradeNo: wechatOutTradeNo || undefined,
        userId: user.id,
        operationId,
      });

      transactionId = confirmedPayment.transactionId;
      amount = confirmedPayment.amount;
      currency = confirmedPayment.currency;
      days = confirmedPayment.days;
    } catch (error) {
      if (error instanceof PaymentConfirmationError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.status }
        );
      }
      throw error;
    }

    // 检查是否已存在完成状态的支付记录
    let existingCompletedPayment: any = null;
    let existingCheckError: any = null;

    if (isChinaRegion()) {
      try {
        const db = getDatabase();
        const paymentsCollection = db.collection("payments");

        const result = await paymentsCollection
          .where({
            transaction_id: transactionId,
            status: "completed",
          })
          .get();

        existingCompletedPayment = result.data?.[0] || null;
      } catch (error) {
        logError("Error checking existing CloudBase payment", error as Error, {
          operationId,
          userId: user.id,
          transactionId,
        });
        existingCheckError = error;
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from("payments")
        .select("id, status")
        .eq("transaction_id", transactionId)
        .eq("status", "completed")
        .maybeSingle();

      existingCompletedPayment = data;
      existingCheckError = error;
    }

    if (existingCheckError) {
      logError("Error checking existing payment", existingCheckError as Error, {
        operationId,
        userId: user.id,
        transactionId,
      });
    }

    if (existingCompletedPayment) {
      logInfo("Payment already processed", {
        operationId,
        userId: user.id,
        transactionId,
        existingPaymentId:
          existingCompletedPayment.id || existingCompletedPayment._id,
      });

      if (days > 0 && transactionId) {
        logInfo("Ensuring membership extension for already-processed payment", {
          operationId,
          userId: user.id,
          transactionId,
          days,
        });

        const isPayPalOrStripe = !!sessionId || !!token;

        if (!isChinaRegion()) {
          if (isPayPalOrStripe) {
            console.log(
              "✅✅✅ [ALREADY-PROCESSED FLOW] PayPal/Stripe payment - SKIPPING extendMembership in confirm, relying on webhook",
              {
                operationId,
                userId: user.id,
                transactionId,
                isStripe: !!sessionId,
                isPayPal: !!token,
                days,
              }
            );
          } else {
            try {
              const { data: existingSub } = await supabaseAdmin
                .from("subscriptions")
                .select("id")
                .or(
                  `transaction_id.eq.${transactionId},provider_subscription_id.eq.${transactionId}`
                )
                .maybeSingle();

              if (existingSub && existingSub.id) {
                logInfo(
                  "Subscription already exists for transaction - skipping extendMembership",
                  {
                    operationId,
                    userId: user.id,
                    transactionId,
                    subscriptionId: existingSub.id,
                  }
                );
              } else {
                const membershipExtended = await extendMembership(
                  user.id,
                  days,
                  transactionId
                );

                if (!membershipExtended) {
                  logWarn(
                    "Failed to extend membership for already-processed payment",
                    {
                      operationId,
                      userId: user.id,
                      transactionId,
                    }
                  );
                }
              }
            } catch (err) {
              logWarn("Error during supabase subscription idempotency check", {
                operationId,
                userId: user.id,
                transactionId,
                err,
              });
              const membershipExtended = await extendMembership(
                user.id,
                days,
                transactionId
              );

              if (!membershipExtended) {
                logWarn(
                  "Failed to extend membership for already-processed payment (fallback)",
                  {
                    operationId,
                    userId: user.id,
                    transactionId,
                  }
                );
              }
            }
          }
        } else {
          const membershipExtended = await extendMembership(
            user.id,
            days,
            transactionId
          );
          if (!membershipExtended) {
            logWarn(
              "Failed to extend membership for already-processed payment",
              {
                operationId,
                userId: user.id,
                transactionId,
              }
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Payment already processed",
        transactionId,
      });
    }

    // 查找 pending 支付记录并更新为 completed
    // For Alipay: outTradeNo is our order number (stored in transaction_id), should be checked first
    const paymentIdToUpdate =
      sessionId || token || outTradeNo || wechatOutTradeNo || tradeNo;
    let pendingPayment: any = null;
    let findError: any = null;

    if (isChinaRegion()) {
      try {
        const db = getDatabase();
        const paymentsCollection = db.collection("payments");

        const result = await paymentsCollection
          .where({
            transaction_id: paymentIdToUpdate,
            user_id: user.id,
            status: "pending",
          })
          .get();

        pendingPayment = result.data?.[0] || null;
      } catch (error) {
        logError("Error finding CloudBase pending payment", error as Error, {
          operationId,
          userId: user.id,
          transactionId: paymentIdToUpdate,
        });
        findError = error;
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from("payments")
        .select("id, amount, currency")
        .eq("transaction_id", paymentIdToUpdate)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      pendingPayment = data;
      findError = error;
    }

    if (
      findError &&
      (!isChinaRegion() || (findError as any)?.code !== "PGRST116")
    ) {
      logError("Error finding pending payment", findError as Error, {
        operationId,
        userId: user.id,
        transactionId: paymentIdToUpdate,
      });
    }

    if (pendingPayment) {
      if (amount === 0 && pendingPayment.amount) {
        amount = pendingPayment.amount;
        logInfo("Using amount from pending payment", {
          operationId,
          userId: user.id,
          amount,
        });
      }
      if (!currency && pendingPayment.currency) {
        currency = pendingPayment.currency;
      }

      let updateError: any = null;

      if (isChinaRegion()) {
        try {
          const db = getDatabase();
          const paymentsCollection = db.collection("payments");

          await paymentsCollection.doc(pendingPayment._id).update({
            status: "completed",
            transaction_id: transactionId,
            amount,
            currency,
            updatedAt: new Date().toISOString(),
          });
        } catch (error) {
          logError("Error updating CloudBase payment status", error as Error, {
            operationId,
            userId: user.id,
            paymentId: pendingPayment._id,
          });
          updateError = error;
        }
      } else {
        const { error } = await supabaseAdmin
          .from("payments")
          .update({
            status: "completed",
            transaction_id: transactionId,
            amount,
            currency,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pendingPayment.id);

        updateError = error;
      }

      if (updateError) {
        logError("Error updating payment status", updateError as Error, {
          operationId,
          userId: user.id,
          paymentId: pendingPayment.id || pendingPayment._id,
        });
      }
    } else {
      logWarn("No pending payment found, creating new record", {
        operationId,
        userId: user.id,
        transactionId,
        amount,
        days,
      });

      if (amount <= 0) {
        logError(
          "Cannot create payment with zero or negative amount",
          undefined,
          {
            operationId,
            userId: user.id,
            transactionId,
            amount,
            currency,
          }
        );
      } else {
        const paymentData: any = {
          user_id: user.id,
          amount,
          currency,
          status: "completed",
          payment_method: sessionId ? "stripe" : token ? "paypal" : "alipay",
          transaction_id: transactionId,
          metadata: {
            days,
            paymentType: "onetime",
            billingCycle: days === 365 ? "yearly" : "monthly",
          },
        };

        let insertError: any = null;

        if (isChinaRegion()) {
          try {
            const db = getDatabase();
            const paymentsCollection = db.collection("payments");

            await paymentsCollection.add({
              ...paymentData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            logInfo("Payment record created successfully in CloudBase", {
              operationId,
              userId: user.id,
              transactionId,
              amount,
              days,
            });
          } catch (error) {
            logError(
              "Error creating CloudBase payment record",
              error as Error,
              {
                operationId,
                userId: user.id,
                transactionId,
                amount,
              }
            );
            insertError = error;
          }
        } else {
          const { data: insertedPayment, error } = await supabaseAdmin
            .from("payments")
            .insert(paymentData)
            .select("id")
            .single();

          if (error) {
            logError("Error creating payment record in Supabase", error, {
              operationId,
              userId: user.id,
              transactionId,
              amount,
              currency,
              paymentData,
              errorCode: error.code,
              errorMessage: error.message,
              errorDetails: error.details,
              errorHint: error.hint,
            });
            insertError = error;
          } else if (insertedPayment) {
            logInfo("Payment record created successfully in Supabase", {
              operationId,
              userId: user.id,
              paymentId: insertedPayment.id,
              transactionId,
              amount,
              days,
            });
          }
        }

        if (insertError) {
          logError(
            "Failed to create payment record - continuing anyway",
            insertError as Error,
            {
              operationId,
              userId: user.id,
              transactionId,
            }
          );
        }
      }
    }

    // 延长用户会员时间
    // 重要: 所有支付方式都必须在 confirm 中扩展会员
    // - Stripe/PayPal: 虽然有webhook，但confirm是主路径（用户体验）
    // - Alipay: 同步返回不会触发webhook，必须在confirm处理
    // - Webhook只是备选容错机制，不是主路径
    let membershipExtended = false;
    const isPayPalOrStripe = !!sessionId || !!token;
    const isAlipay = !!outTradeNo || !!tradeNo;

    if (isPayPalOrStripe) {
      // Stripe/PayPal: 在confirm中扩展会员（主路径）+ webhook（备选）
      console.log(
        "✅✅✅ [MAIN FLOW] PayPal/Stripe payment confirmed - Extending membership in confirm (primary path)",
        {
          operationId,
          userId: user.id,
          transactionId,
          isStripe: !!sessionId,
          isPayPal: !!token,
          days,
          note: "Webhook is fallback idempotency mechanism",
        }
      );
      membershipExtended = await extendMembership(user.id, days, transactionId);
    } else if (isAlipay) {
      // Alipay: 在confirm中扩展会员（必须，同步返回不会触发webhook）
      console.log(
        "✅✅✅ [MAIN FLOW] Alipay payment confirmed - Extending membership in confirm",
        {
          operationId,
          userId: user.id,
          transactionId,
          days,
          paymentType: outTradeNo ? "app" : "sync_return",
        }
      );
      membershipExtended = await extendMembership(user.id, days, transactionId);
    } else if (!isChinaRegion()) {
      try {
        const { data: existingSub } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .or(
            `transaction_id.eq.${transactionId},provider_subscription_id.eq.${transactionId}`
          )
          .maybeSingle();

        if (existingSub && existingSub.id) {
          logInfo(
            "Subscription already exists for transaction - skipping extendMembership",
            {
              operationId,
              userId: user.id,
              transactionId,
              subscriptionId: existingSub.id,
            }
          );
          membershipExtended = true;
        } else {
          membershipExtended = await extendMembership(
            user.id,
            days,
            transactionId
          );
        }
      } catch (err) {
        logWarn(
          "Error during supabase subscription idempotency check before extend",
          {
            operationId,
            userId: user.id,
            transactionId,
            err,
          }
        );
        membershipExtended = await extendMembership(
          user.id,
          days,
          transactionId
        );
      }
    } else {
      membershipExtended = await extendMembership(user.id, days, transactionId);
    }

    if (!membershipExtended) {
      logError("Failed to extend membership", undefined, {
        operationId,
        userId: user.id,
        transactionId,
        days,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Payment confirmed but failed to extend membership",
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    logInfo("Payment confirmed successfully", {
      operationId,
      userId: user.id,
      transactionId,
      amount,
      currency,
      daysAdded: days,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      transactionId,
      amount,
      currency,
      daysAdded: days,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logError("Payment confirmation error", error as Error, {
      operationId,
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
