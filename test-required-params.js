const {
  AlipayProvider,
} = require("./lib/architecture-modules/layers/third-party/payment/providers/alipay-provider");

console.log("🔍 验证支付宝必需参数设置");

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

async function testRequiredParameters() {
  try {
    console.log("📦 初始化支付宝提供商...");
    const alipayProvider = new AlipayProvider(process.env);

    console.log("💰 创建测试订单...");
    const testOrder = {
      amount: 88.88, // 测试金额
      currency: "CNY",
      description: "Iphone6 16G", // 测试商品标题
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

    console.log("📋 测试订单数据:");
    console.log("- amount:", testOrder.amount);
    console.log("- currency:", testOrder.currency);
    console.log("- description:", testOrder.description);

    // 调用createPayment方法
    const result = await alipayProvider.createPayment(testOrder);

    if (result.success && result.paymentUrl) {
      console.log("✅ 支付创建成功");

      // 解析生成的HTML表单，检查参数
      const formHtml = result.paymentUrl;
      console.log("\n🔍 检查生成的表单参数:");

      // 检查四个必需参数
      const checks = [
        {
          name: "out_trade_no",
          pattern: /"out_trade_no"\s*:\s*"([^"]+)"/,
          expected: "自动生成的不为空",
          validate: (value) => value && value.length > 0,
        },
        {
          name: "total_amount",
          pattern: /"total_amount"\s*:\s*"([^"]+)"/,
          expected: "88.88",
          validate: (value) => value === "88.88",
        },
        {
          name: "subject",
          pattern: /"subject"\s*:\s*"([^"]+)"/,
          expected: "Iphone6 16G",
          validate: (value) => value === "Iphone6 16G",
        },
        {
          name: "product_code",
          pattern: /"product_code"\s*:\s*"([^"]+)"/,
          expected: "FAST_INSTANT_TRADE_PAY",
          validate: (value) => value === "FAST_INSTANT_TRADE_PAY",
        },
      ];

      let allValid = true;

      for (const check of checks) {
        const match = formHtml.match(check.pattern);
        const value = match ? match[1] : null;
        const isValid = check.validate(value);

        console.log(`${isValid ? "✅" : "❌"} ${check.name}:`);
        console.log(`   - 期望值: ${check.expected}`);
        console.log(`   - 实际值: ${value || "未找到"}`);
        console.log(`   - 验证结果: ${isValid ? "通过" : "失败"}`);

        if (!isValid) {
          allValid = false;
        }
      }

      if (allValid) {
        console.log("\n🎯 结论: 所有四个必需参数都正确设置！");
        console.log("✅ out_trade_no - 自动生成 ✓");
        console.log("✅ total_amount - 使用订单金额 ✓");
        console.log("✅ subject - 使用订单描述 ✓");
        console.log("✅ product_code - 固定为FAST_INSTANT_TRADE_PAY ✓");
      } else {
        console.log("\n❌ 部分参数设置不正确");
      }
    } else {
      console.log("❌ 支付创建失败:", result.error);
    }
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

testRequiredParameters();
