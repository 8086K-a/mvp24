// scripts/test-webhook-status.ts - 检查webhook处理状态
import { supabaseAdmin } from "../lib/supabase-admin";

async function checkWebhookStatus() {
  console.log("🔍 检查Webhook处理状态...\n");

  try {
    // 1. 检查webhook_events表
    console.log("1. 检查webhook_events表:");
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (eventsError) {
      console.error("❌ 查询webhook_events失败:", eventsError);
    } else {
      console.log(`✅ 找到 ${events.length} 个webhook事件:`);
      events.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.provider} - ${event.event_type}`);
        console.log(`      ID: ${event.id}`);
        console.log(`      处理状态: ${event.processed ? '✅ 已处理' : '⏳ 未处理'}`);
        console.log(`      创建时间: ${event.created_at}`);
        if (event.processed_at) {
          console.log(`      处理时间: ${event.processed_at}`);
        }
        console.log("");
      });
    }

    // 2. 检查最近的订阅更新
    console.log("2. 检查最近的订阅更新:");
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(5);

    if (subsError) {
      console.error("❌ 查询subscriptions失败:", subsError);
    } else {
      console.log(`✅ 找到 ${subscriptions.length} 个订阅记录:`);
      subscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. 用户: ${sub.user_id}`);
        console.log(`      计划: ${sub.plan_id}`);
        console.log(`      状态: ${sub.status}`);
        console.log(`      提供商订阅ID: ${sub.provider_subscription_id || '无'}`);
        console.log(`      更新时间: ${sub.updated_at}`);
        console.log("");
      });
    }

    // 3. 检查最近的支付记录
    console.log("3. 检查最近的支付记录:");
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (paymentsError) {
      console.error("❌ 查询payments失败:", paymentsError);
    } else {
      console.log(`✅ 找到 ${payments.length} 个支付记录:`);
      payments.forEach((payment, index) => {
        console.log(`   ${index + 1}. 用户: ${payment.user_id}`);
        console.log(`      金额: ${payment.amount} ${payment.currency}`);
        console.log(`      状态: ${payment.status}`);
        console.log(`      支付方式: ${payment.payment_method}`);
        console.log(`      交易ID: ${payment.transaction_id}`);
        console.log(`      创建时间: ${payment.created_at}`);
        console.log("");
      });
    }

    // 4. 检查用户订阅状态
    console.log("4. 检查用户订阅状态:");
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, subscription_plan, subscription_status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);

    if (profilesError) {
      console.error("❌ 查询user_profiles失败:", profilesError);
    } else {
      console.log(`✅ 找到 ${profiles.length} 个用户资料:`);
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. 用户: ${profile.id}`);
        console.log(`      订阅计划: ${profile.subscription_plan}`);
        console.log(`      订阅状态: ${profile.subscription_status}`);
        console.log(`      更新时间: ${profile.updated_at}`);
        console.log("");
      });
    }

    console.log("🎉 Webhook状态检查完成!");

  } catch (error) {
    console.error("❌ 检查过程中发生错误:", error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkWebhookStatus().catch(console.error);
}

export { checkWebhookStatus };