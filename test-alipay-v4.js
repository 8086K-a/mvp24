// test-alipay-v4.js
console.log("🧪 测试支付宝SDK v4.14.0\n");

// 测试不同的导入方式
try {
  console.log("📦 测试导入方式...");

  // 方式1: 默认导入
  const AlipaySdk1 = require("alipay-sdk");
  console.log("✅ 方式1 - require成功");

  // 方式2: 解构导入
  const { AlipaySdk } = require("alipay-sdk");
  console.log("✅ 方式2 - 解构导入成功");

  // 方式3: 检查导出的内容
  console.log("📋 SDK导出内容:", Object.keys(AlipaySdk1));
  console.log("📋 AlipaySdk类型:", typeof AlipaySdk);

  // 测试构造器
  if (typeof AlipaySdk === "function") {
    console.log("✅ AlipaySdk是函数，尝试构造...");

    const config = {
      appId: "9021000157643313",
      privateKey: "test_private_key",
      alipayPublicKey: "test_public_key",
      gateway: "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
    };

    const sdk = new AlipaySdk(config);
    console.log("✅ SDK构造成功");
  } else {
    console.log("❌ AlipaySdk不是函数");
    console.log("实际类型:", typeof AlipaySdk);
    console.log("内容:", AlipaySdk);
  }
} catch (error) {
  console.log("❌ 测试失败:", error.message);
  console.log("🔍 错误详情:", error);
}
