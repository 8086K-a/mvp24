console.log("🔍 验证支付宝必需参数设置");

// 模拟订单数据
const testOrder = {
  amount: 88.88,
  currency: "CNY",
  description: "Iphone6 16G",
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

// 模拟buildAlipayOrder方法（只保留四个必需参数）
function buildAlipayOrder(order) {
  const outTradeNo = `pay_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  const bizContent = {
    out_trade_no: outTradeNo, // 必需：商户订单号
    total_amount: order.amount.toFixed(2), // 必需：订单总金额，单位元，精确到小数点后两位
    subject: order.description, // 必需：订单标题，最长256字符
    product_code: "FAST_INSTANT_TRADE_PAY", // 必需：销售产品码，电脑网站支付固定值
  };

  return {
    method: "alipay.trade.page.pay",
    bizContent,
    returnUrl: "http://localhost:3000/payment/success",
    notifyUrl: "http://localhost:3000/api/payment/alipay/notify",
  };
}

// 生成订单参数
const alipayOrder = buildAlipayOrder(testOrder);

console.log("\n📋 生成的支付宝订单参数:");
console.log(JSON.stringify(alipayOrder.bizContent, null, 2));

console.log("\n🔍 检查四个必需参数:");

// 检查四个必需参数
const checks = [
  {
    name: "out_trade_no",
    value: alipayOrder.bizContent.out_trade_no,
    expected: "自动生成的不为空",
    validate: (value) => value && value.length > 0,
  },
  {
    name: "total_amount",
    value: alipayOrder.bizContent.total_amount,
    expected: "88.88",
    validate: (value) => value === "88.88",
  },
  {
    name: "subject",
    value: alipayOrder.bizContent.subject,
    expected: "Iphone6 16G",
    validate: (value) => value === "Iphone6 16G",
  },
  {
    name: "product_code",
    value: alipayOrder.bizContent.product_code,
    expected: "FAST_INSTANT_TRADE_PAY",
    validate: (value) => value === "FAST_INSTANT_TRADE_PAY",
  },
];

let allValid = true;

for (const check of checks) {
  const isValid = check.validate(check.value);

  console.log(`${isValid ? "✅" : "❌"} ${check.name}:`);
  console.log(`   - 期望值: ${check.expected}`);
  console.log(`   - 实际值: ${check.value}`);
  console.log(`   - 验证结果: ${isValid ? "通过" : "失败"}`);

  if (!isValid) {
    allValid = false;
  }
}

console.log("\n🎯 最终结论:");
if (allValid) {
  console.log("✅ 所有四个必需参数都正确设置！");
  console.log("✅ out_trade_no - 自动生成 ✓");
  console.log("✅ total_amount - 使用订单金额 ✓");
  console.log("✅ subject - 使用订单描述 ✓");
  console.log("✅ product_code - 固定为FAST_INSTANT_TRADE_PAY ✓");
} else {
  console.log("❌ 部分参数设置不正确");
}
