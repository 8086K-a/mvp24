// test-alipay-confirm.js - 测试Alipay支付确认API
// 使用Node.js内置的fetch (v18+)

async function testAlipayConfirm() {
  console.log("🧪 测试Alipay支付确认API");

  // 模拟Alipay同步返回的参数
  const testParams = {
    out_trade_no: "test_alipay_" + Date.now(),
    trade_no: "20241234567890123456",
    total_amount: "0.01",
    subject: "Test Payment",
    sign: "test_signature",
  };

  const queryString = new URLSearchParams(testParams).toString();
  const confirmUrl = `http://localhost:3000/api/payment/onetime/confirm?${queryString}`;

  console.log("📋 测试参数:", testParams);
  console.log("🔗 请求URL:", confirmUrl);

  try {
    const response = await fetch(confirmUrl, {
      method: "GET",
      headers: {
        Authorization: "Bearer test_token", // 需要有效的认证token
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    console.log("📊 API响应:", result);

    if (response.ok && result.success) {
      console.log("✅ Alipay支付确认测试通过");
    } else {
      console.log("❌ Alipay支付确认测试失败:", result.error);
    }
  } catch (error) {
    console.log("❌ 请求失败:", error.message);
    console.log("💡 请确保Next.js服务器正在运行 (npm run dev)");
  }
}

testAlipayConfirm();
