const { AlipaySdk } = require("alipay-sdk");
const fs = require("fs");

console.log("🧪 测试支付宝Provider集成 (v4.14.0)");

// 模拟环境变量
const config = {
  ALIPAY_APP_ID: "9021000157643313",
  ALIPAY_PRIVATE_KEY: fs.readFileSync("./pkcs1_private.pem", "utf8"),
  ALIPAY_ALIPAY_PUBLIC_KEY: fs.readFileSync(
    "./alipay_private_base64.txt",
    "utf8"
  ),
  ALIPAY_GATEWAY_URL: "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
};

function formatPrivateKey(key) {
  if (key.includes("BEGIN RSA PRIVATE KEY")) return key;
  if (key.includes("BEGIN PRIVATE KEY")) {
    const keyContent = key
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s/g, "");
    return `-----BEGIN RSA PRIVATE KEY-----\n${keyContent}\n-----END RSA PRIVATE KEY-----`;
  }
  return `-----BEGIN RSA PRIVATE KEY-----\n${key}\n-----END RSA PRIVATE KEY-----`;
}

function formatPublicKey(key) {
  if (key.includes("BEGIN")) return key;
  return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
}

async function testProviderIntegration() {
  try {
    console.log("📦 初始化AlipaySdk v4...");

    const alipaySdk = new AlipaySdk({
      appId: config.ALIPAY_APP_ID,
      privateKey: formatPrivateKey(config.ALIPAY_PRIVATE_KEY),
      signType: "RSA2",
      alipayPublicKey: formatPublicKey(config.ALIPAY_ALIPAY_PUBLIC_KEY),
      gateway: config.ALIPAY_GATEWAY_URL,
      timeout: 30000,
      camelcase: false,
    });

    console.log("✅ SDK初始化成功");

    console.log("💰 创建支付订单...");

    const outTradeNo = `test_${Date.now()}`;
    const bizContent = {
      out_trade_no: outTradeNo,
      total_amount: "0.01",
      subject: "test",
      product_code: "FAST_INSTANT_TRADE_PAY",
    };

    console.log("📋 订单参数:", bizContent);

    // 使用pageExecute方法（v4 SDK）
    const formHtml = await alipaySdk.pageExecute(
      "alipay.trade.page.pay",
      {
        notify_url: "http://localhost:3000/api/payment/alipay/notify",
        return_url: "http://localhost:3000/payment/success",
      },
      {
        bizContent,
      }
    );

    console.log("✅ 支付创建成功");
    console.log("📋 结果:", {
      outTradeNo,
      payUrlLength: formHtml ? formHtml.length : 0,
      hasForm: formHtml.includes("<form"),
    });

    console.log("🎯 测试结果: Provider集成成功 - v4 SDK pageExecute工作正常");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    console.error("📋 错误详情:", error);
  }
}

testProviderIntegration();
