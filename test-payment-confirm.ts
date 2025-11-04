// test-payment-confirm.ts - 测试支付确认API
async function testPaymentConfirm() {
  console.log("🔍 测试支付确认API...");

  const baseUrl = "http://localhost:3000";

  try {
    console.log("测试 /api/payment/confirm API...");
    const confirmResponse = await fetch(`${baseUrl}/api/payment/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriptionId: "I-P3UT5UMLY4V6",
        baToken: "BA-9LM15643MR260931M",
        token: "9BX4728909207704F",
        planType: "team",
        billingCycle: "yearly",
        userId: "user_123",
      }),
    });

    console.log("确认API响应状态:", confirmResponse.status);

    const confirmResult = await confirmResponse.json();
    console.log("确认API响应:", confirmResult);

    if (confirmResult.success) {
      console.log("✅ 支付确认成功");
    } else {
      console.log("❌ 支付确认失败:", confirmResult.error);
    }
  } catch (error) {
    console.log(
      "❌ 确认API测试失败:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

testPaymentConfirm();
