const {
  AlipayProvider,
} = require("./lib/architecture-modules/layers/third-party/payment/providers/alipay-provider.ts");

// 模拟订单数据
const testOrder = {
  amount: 300.0,
  description: "1 Year Premium Membership (One-time Payment)",
  currency: "CNY",
};

// 模拟配置
const testConfig = {
  ALIPAY_APP_ID: process.env.ALIPAY_APP_ID || "test_app_id",
  ALIPAY_PRIVATE_KEY: process.env.ALIPAY_PRIVATE_KEY || "test_private_key",
  ALIPAY_PUBLIC_KEY: process.env.ALIPAY_PUBLIC_KEY || "test_public_key",
  ALIPAY_ALIPAY_PUBLIC_KEY:
    process.env.ALIPAY_ALIPAY_PUBLIC_KEY || "test_alipay_public_key",
  ALIPAY_GATEWAY_URL: "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
};

async function testFormGeneration() {
  try {
    console.log("🧪 测试支付宝表单生成");
    console.log("📋 测试订单数据:", testOrder);

    // 创建提供商实例
    const provider = new AlipayProvider(testConfig);

    // 构建订单数据
    const orderData = await provider.buildAlipayOrder(testOrder);
    console.log("\n📋 生成的订单数据:");
    console.log(JSON.stringify(orderData, null, 2));

    // 验证必需参数
    const { bizContent } = orderData;
    console.log("\n🔍 验证四个必需参数:");

    const checks = [
      {
        name: "out_trade_no",
        value: bizContent.out_trade_no,
        expected: "自动生成的不为空",
        valid:
          bizContent.out_trade_no &&
          typeof bizContent.out_trade_no === "string",
      },
      {
        name: "total_amount",
        value: bizContent.total_amount,
        expected: testOrder.amount.toFixed(2),
        valid: bizContent.total_amount === testOrder.amount.toFixed(2),
      },
      {
        name: "subject",
        value: bizContent.subject,
        expected: testOrder.description,
        valid: bizContent.subject === testOrder.description,
      },
      {
        name: "product_code",
        value: bizContent.product_code,
        expected: "FAST_INSTANT_TRADE_PAY",
        valid: bizContent.product_code === "FAST_INSTANT_TRADE_PAY",
      },
    ];

    let allValid = true;
    checks.forEach((check) => {
      const status = check.valid ? "✅" : "❌";
      console.log(`${status} ${check.name}:`);
      console.log(`   - 期望值: ${check.expected}`);
      console.log(`   - 实际值: ${check.value}`);
      console.log(`   - 验证结果: ${check.valid ? "通过" : "失败"}`);
      if (!check.valid) allValid = false;
    });

    console.log("\n🎯 最终结论:");
    if (allValid) {
      console.log("✅ 所有四个必需参数都正确设置！");
      console.log("✅ out_trade_no - 自动生成 ✓");
      console.log("✅ total_amount - 使用订单金额 ✓");
      console.log("✅ subject - 使用订单描述 ✓");
      console.log("✅ product_code - 固定为FAST_INSTANT_TRADE_PAY ✓");
    } else {
      console.log("❌ 参数验证失败，请检查代码");
    }

    // 验证URLs
    console.log("\n🔗 验证回调URLs:");
    console.log(`✅ returnUrl: ${orderData.returnUrl}`);
    console.log(`✅ notifyUrl: ${orderData.notifyUrl}`);
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

testFormGeneration();
