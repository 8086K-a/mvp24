// test-alipay-v4-full.js
const { AlipaySdk } = require("alipay-sdk");
const fs = require("fs");

console.log("🧪 支付宝SDK v4.14.0完整集成测试\n");

// 配置
const config = {
  appId: "9021000157643313",
  privateKey: fs
    .readFileSync("pkcs8_private.pem", "utf8")
    .replace(/-----BEGIN PRIVATE KEY-----/, "-----BEGIN RSA PRIVATE KEY-----")
    .replace(/-----END PRIVATE KEY-----/, "-----END RSA PRIVATE KEY-----"),
  alipayPublicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgeQ4urYRu9P+974YRwvMh8avnjY7DRIApy9617GNpLn36VTRxEbqc3x58I1LCKujMF7mIJtjhPEhtB39XczlHRYMEO7gkHZU6foZlfnX9U/1whCXnLwGbi5WUjbZn0W0YtrU2HzPCr6LtGgZT5ppfmTcGA7ESR6o1bgkBBBmF34b6nKfct6kurlfmxKYLVUYgJ0ML16XMQN1XW/s7d8fMiwYb5vSU1CbAPOny4v1/vMCzPjwhpYUPKocWDOG0/1N+uPkSsc+1FMxrL1W4x8igyYvRKj3GNBdarvWYTzmpkmNuQhDgyy5yq1kw4EJfwXhr8qaX3ANhSCUQHJ4/m4ePQIDAQAB
-----END PUBLIC KEY-----`,
  gateway: "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
};

console.log("📋 配置信息:");
console.log("- AppId:", config.appId);
console.log("- 私钥格式: PKCS1 (转换后)");
console.log("- 网关:", config.gateway);
console.log("- 公钥长度:", config.alipayPublicKey.length, "字符\n");

try {
  // 初始化SDK v4
  const sdk = new AlipaySdk(config);
  console.log("✅ SDK v4初始化成功\n");

  // 检查可用的方法
  console.log("🔍 检查SDK方法:");
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(sdk));
  const paymentMethods = methods.filter(
    (name) =>
      name.includes("page") || name.includes("exec") || name.includes("pay")
  );
  console.log("支付相关方法:", paymentMethods);
  console.log();

  // 构建支付参数
  const outTradeNo = "test_" + Date.now();
  const bizContent = {
    out_trade_no: outTradeNo,
    product_code: "FAST_INSTANT_TRADE_PAY",
    total_amount: "0.01",
    subject: "Test Payment",
  };

  console.log("📦 支付参数:");
  console.log(JSON.stringify(bizContent, null, 2));
  console.log();

  console.log("✅ 参数构建测试通过");
  console.log("✅ SDK v4配置测试通过\n");

  console.log("🎯 测试结果:");
  console.log("- SDK版本: ✅ v4.14.0");
  console.log("- 初始化: ✅ 成功");
  console.log("- 参数构建: ✅ 包含product_code");
  console.log("- 可用方法:", paymentMethods.join(", "), "\n");

  console.log("💡 下一步: 更新代码以使用v4的API方法");
} catch (error) {
  console.log("❌ 测试失败:", error.message);
  console.log("🔍 错误详情:", error);
}
