// 测试：支付宝证书模式 pageExecute
// 读取 .env.local 配置
require("dotenv").config({ path: ".env.local" });
const { AlipaySdk } = require("alipay-sdk");
const fs = require("fs");

function readMaybeFile(content, pathEnv) {
  if (content && String(content).trim()) return content;
  if (pathEnv && fs.existsSync(pathEnv))
    return fs.readFileSync(pathEnv, "utf8");
  return null;
}

function normalizePrivateKey(key) {
  if (!key) return null;
  const trimmed = String(key).trim();
  if (trimmed.includes("BEGIN RSA PRIVATE KEY")) return trimmed; // PKCS1
  if (trimmed.includes("BEGIN PRIVATE KEY")) return trimmed; // PKCS8
  // 纯Base64：优先按PKCS#1包装，不行再由Node回退
  return `-----BEGIN RSA PRIVATE KEY-----\n${trimmed}\n-----END RSA PRIVATE KEY-----`;
}

(async () => {
  try {
    const appId = process.env.ALIPAY_APP_ID;
    const gateway = process.env.ALIPAY_GATEWAY_URL;
    const privateKey = normalizePrivateKey(process.env.ALIPAY_PRIVATE_KEY);

    const appCertContent = readMaybeFile(
      process.env.ALIPAY_APP_CERT,
      process.env.ALIPAY_APP_CERT_PATH
    );
    const alipayPublicCertContent = readMaybeFile(
      process.env.ALIPAY_ALIPAY_PUBLIC_CERT,
      process.env.ALIPAY_ALIPAY_PUBLIC_CERT_PATH
    );
    const alipayRootCertContent = readMaybeFile(
      process.env.ALIPAY_ALIPAY_ROOT_CERT,
      process.env.ALIPAY_ALIPAY_ROOT_CERT_PATH
    );

    console.log("\n🧪 证书模式测试配置:");
    console.log("- appId:", appId);
    console.log("- gateway:", gateway);
    console.log("- 私钥存在:", !!privateKey);
    console.log("- appCert:", !!appCertContent);
    console.log("- alipayPublicCert:", !!alipayPublicCertContent);
    console.log("- alipayRootCert:", !!alipayRootCertContent);

    if (
      !appId ||
      !privateKey ||
      !appCertContent ||
      !alipayPublicCertContent ||
      !alipayRootCertContent
    ) {
      console.log("❌ 环境变量不完整，无法测试证书模式");
      process.exit(1);
    }

    const sdk = new AlipaySdk({
      appId,
      privateKey,
      signType: "RSA2",
      appCertContent,
      alipayPublicCertContent,
      alipayRootCertContent,
      gateway,
      camelcase: false,
      timeout: 30000,
    });

    const outTradeNo = `cert_test_${Date.now()}`;
    const bizContent = {
      out_trade_no: outTradeNo,
      total_amount: "0.01",
      subject: "证书模式测试",
      product_code: "FAST_INSTANT_TRADE_PAY",
    };

    console.log("\n🚀 调用 pageExecute (证书模式)...");
    const formHtml = await sdk.pageExecute(
      "alipay.trade.page.pay",
      {
        notify_url: "http://localhost:3000/api/payment/alipay/notify",
        return_url: "http://localhost:3000/payment/success",
      },
      { bizContent }
    );

    console.log("✅ 成功生成 HTML 表单，长度:", formHtml.length);
    const outPath = `alipay_cert_form_${Date.now()}.html`;
    fs.writeFileSync(outPath, formHtml);
    console.log("📝 已写入:", outPath);
  } catch (e) {
    console.error("❌ 测试失败:", e.message);
    if (e.response) {
      console.error("- HTTP:", e.response.status);
      console.error("- Data:", e.response.data);
    }
    process.exit(1);
  }
})();
