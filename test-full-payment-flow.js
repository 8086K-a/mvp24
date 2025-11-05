const {
  AlipayProvider,
} = require("./lib/architecture-modules/layers/third-party/payment/providers/alipay-provider");

console.log("🔍 测试完整的支付宝支付流程");

// 模拟环境变量
process.env.ALIPAY_APP_ID = "9021000157643313";
process.env.ALIPAY_PRIVATE_KEY = require("fs").readFileSync(
  "./pkcs1_private.pem",
  "utf8"
);
process.env.ALIPAY_ALIPAY_PUBLIC_KEY = require("fs").readFileSync(
  "./alipay_private_base64.txt",
  "utf8"
);
process.env.ALIPAY_GATEWAY_URL =
  "https://openapi-sandbox.dl.alipaydev.com/gateway.do";
process.env.APP_URL = "http://localhost:3000";

async function testFullPaymentFlow() {
  try {
    console.log("📦 初始化支付宝提供商...");
    const alipayProvider = new AlipayProvider(process.env);

    console.log("💰 创建支付订单...");
    const order = {
      amount: 30,
      currency: "CNY",
      description: "1 Month Premium Membership (One-time Payment)",
      userId: "test_user_123",
      planType: "onetime",
      billingCycle: "monthly",
      metadata: {
        userId: "test_user_123",
        days: 30,
        paymentType: "onetime",
        billingCycle: "monthly",
      },
    };

    const result = await alipayProvider.createPayment(order);

    console.log("✅ 支付创建成功!");
    console.log("📋 返回结果:");
    console.log("- success:", result.success);
    console.log("- paymentId:", result.paymentId);
    console.log("- paymentUrl 类型:", typeof result.paymentUrl);
    console.log("- paymentUrl 长度:", result.paymentUrl?.length || 0);
    console.log("- 包含<form>:", result.paymentUrl?.includes("<form") || false);
    console.log(
      "- 包含支付宝网关:",
      result.paymentUrl?.includes("alipaydev.com") || false
    );

    if (result.paymentUrl && result.paymentUrl.includes("<form")) {
      console.log("\n🎯 表单内容预览:");
      // 显示表单的开始部分
      const formStart = result.paymentUrl.substring(0, 300);
      console.log(formStart + "...");

      // 检查关键参数
      const hasAction = result.paymentUrl.includes(
        'action="https://openapi-sandbox.dl.alipaydev.com/gateway.do"'
      );
      const hasMethod = result.paymentUrl.includes('method="post"');
      const hasBizContent = result.paymentUrl.includes('name="biz_content"');
      const hasAutoSubmit = result.paymentUrl.includes(
        "document.forms[0].submit()"
      );

      console.log("\n🔍 表单验证:");
      console.log("- 正确的action URL:", hasAction);
      console.log("- POST方法:", hasMethod);
      console.log("- 包含biz_content:", hasBizContent);
      console.log("- 自动提交脚本:", hasAutoSubmit);

      if (hasAction && hasMethod && hasBizContent && hasAutoSubmit) {
        console.log("\n✅ 表单格式完全正确！符合支付宝官方要求");
        console.log("📋 前端处理流程:");
        console.log("1. 检测到paymentUrl包含<form>");
        console.log("2. 对HTML进行base64编码");
        console.log("3. 重定向到/payment/redirect?form=<encoded>");
        console.log("4. redirect页面解码并自动提交表单");
        console.log("5. 用户跳转到支付宝收银台");
      } else {
        console.log("\n❌ 表单格式不符合预期");
      }
    } else {
      console.log("\n❌ 返回的不是HTML表单");
    }
  } catch (error) {
    console.error("❌ 测试失败:", error.message);

    // 如果是错误检测功能在工作，显示详细信息
    if (error.message.includes("[") && error.message.includes("]:")) {
      console.log("🎯 错误检测功能正常工作，错误已分类处理");
    }
  }
}

testFullPaymentFlow();
