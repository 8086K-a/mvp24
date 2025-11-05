require("dotenv").config({ path: "./.env.local" });

const { AlipaySdk } = require("alipay-sdk");

console.log("🔍 使用实际环境变量的支付宝诊断测试");

// 使用实际环境变量
const config = {
  appId: process.env.ALIPAY_APP_ID,
  privateKey: process.env.ALIPAY_PRIVATE_KEY,
  alipayPublicKey: process.env.ALIPAY_ALIPAY_PUBLIC_KEY,
  gateway: process.env.ALIPAY_GATEWAY_URL,
};

console.log("\n📋 实际环境变量配置:");
console.log("- ALIPAY_APP_ID:", config.appId ? "已设置" : "未设置");
console.log(
  "- ALIPAY_PRIVATE_KEY:",
  config.privateKey
    ? "已设置 (" + config.privateKey.length + " 字符)"
    : "未设置"
);
console.log(
  "- ALIPAY_ALIPAY_PUBLIC_KEY:",
  config.alipayPublicKey
    ? "已设置 (" + config.alipayPublicKey.length + " 字符)"
    : "未设置"
);
console.log("- ALIPAY_GATEWAY_URL:", config.gateway);
console.log("- ALIPAY_SANDBOX:", process.env.ALIPAY_SANDBOX);

function formatPrivateKey(key) {
  if (!key) return null;
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
  if (!key) return null;
  if (key.includes("BEGIN")) return key;
  return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
}

async function testWithEnvVars() {
  try {
    console.log("\n📦 使用环境变量初始化SDK...");

    if (!config.appId || !config.privateKey || !config.alipayPublicKey) {
      console.log("❌ 缺少必需的环境变量配置");
      console.log("- ALIPAY_APP_ID:", !!config.appId);
      console.log("- ALIPAY_PRIVATE_KEY:", !!config.privateKey);
      console.log("- ALIPAY_ALIPAY_PUBLIC_KEY:", !!config.alipayPublicKey);
      return;
    }

    const formattedPrivateKey = formatPrivateKey(config.privateKey);
    const formattedPublicKey = formatPublicKey(config.alipayPublicKey);

    console.log("私钥格式检查:");
    console.log(
      "- 包含BEGIN RSA PRIVATE KEY:",
      formattedPrivateKey.includes("BEGIN RSA PRIVATE KEY")
    );
    console.log(
      "- 包含END RSA PRIVATE KEY:",
      formattedPrivateKey.includes("END RSA PRIVATE KEY")
    );

    console.log("公钥格式检查:");
    console.log(
      "- 包含BEGIN PUBLIC KEY:",
      formattedPublicKey.includes("BEGIN PUBLIC KEY")
    );
    console.log(
      "- 包含END PUBLIC KEY:",
      formattedPublicKey.includes("END PUBLIC KEY")
    );

    const alipaySdk = new AlipaySdk({
      appId: config.appId,
      privateKey: formattedPrivateKey,
      signType: "RSA2",
      alipayPublicKey: formattedPublicKey,
      gateway: config.gateway,
      timeout: 30000,
      camelcase: false,
    });

    console.log("✅ SDK初始化成功");

    // 测试与实际应用相同的参数
    console.log("\n🧪 测试实际应用使用的参数...");
    const outTradeNo = `pay_${Date.now()}_test`;
    const bizContent = {
      out_trade_no: outTradeNo,
      total_amount: "30.00", // 实际应用中人民币30元
      subject: "1 Month Premium Membership (One-time Payment)", // 实际应用的描述
      product_code: "FAST_INSTANT_TRADE_PAY",
    };

    console.log("📋 实际应用参数:");
    console.log(JSON.stringify(bizContent, null, 2));

    console.log("\n🚀 调用alipay.trade.page.pay...");

    try {
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

      console.log("✅ API调用成功!");
      console.log("📋 生成HTML表单长度:", formHtml.length, "字符");
      console.log("📋 包含<form>标签:", formHtml.includes("<form"));

      // 检查是否能找到订单号
      console.log("📋 表单包含订单号:", formHtml.includes(outTradeNo));

      console.log("\n🎯 结论: 环境变量配置正确，SDK调用成功");
      console.log(
        "如果实际应用仍然报INVALID_PARAMETER，可能是应用权限或网络问题"
      );
    } catch (apiError) {
      console.log("❌ API调用失败，详细错误信息:");
      console.log("- 错误类型:", apiError.constructor.name);
      console.log("- 错误消息:", apiError.message);

      if (apiError.response) {
        console.log("- HTTP状态码:", apiError.response.status);
        console.log("- 响应头:", apiError.response.headers);
        console.log("- 响应数据:", apiError.response.data);
      }

      if (apiError.message.includes("INVALID_PARAMETER")) {
        console.log("\n🎯 确认INVALID_PARAMETER错误");
        console.log("可能原因:");
        console.log("1. 沙箱应用电脑网站支付产品未开通");
        console.log("2. 应用AppId不正确");
        console.log("3. 密钥配置错误");
        console.log("4. 网络或代理问题");
      }
    }
  } catch (error) {
    console.error("❌ 初始化失败:", error.message);
    console.error("这通常表示密钥格式或配置错误");
  }
}

testWithEnvVars();
