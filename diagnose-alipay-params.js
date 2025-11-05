const { AlipaySdk } = require("alipay-sdk");
const fs = require("fs");

console.log("🔍 支付宝参数详细诊断测试");

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

async function diagnoseParameters() {
  try {
    console.log("📋 当前配置信息:");
    console.log("- AppId:", config.ALIPAY_APP_ID);
    console.log("- 网关:", config.ALIPAY_GATEWAY_URL);
    console.log("- 私钥格式: PKCS1");
    console.log("- 公钥长度:", config.ALIPAY_ALIPAY_PUBLIC_KEY.length, "字符");

    console.log("\n📦 初始化SDK...");
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

    console.log("\n🔍 测试alipay.trade.page.pay参数...");

    // 生成测试订单号
    const outTradeNo = `test_${Date.now()}`;
    console.log("订单号:", outTradeNo);

    // 构建bizContent - 按照支付宝官方文档的必需参数
    const bizContent = {
      out_trade_no: outTradeNo,
      total_amount: "0.01", // 字符串格式
      subject: "测试商品", // 订单标题
      product_code: "FAST_INSTANT_TRADE_PAY", // 电脑网站支付
    };

    console.log("📋 bizContent参数:");
    console.log(JSON.stringify(bizContent, null, 2));

    // 检查参数格式
    console.log("\n🔍 参数格式检查:");
    console.log(
      "- out_trade_no:",
      typeof bizContent.out_trade_no,
      "长度:",
      bizContent.out_trade_no.length
    );
    console.log(
      "- total_amount:",
      typeof bizContent.total_amount,
      "值:",
      bizContent.total_amount
    );
    console.log(
      "- subject:",
      typeof bizContent.subject,
      "长度:",
      bizContent.subject.length
    );
    console.log(
      "- product_code:",
      typeof bizContent.product_code,
      "值:",
      bizContent.product_code
    );

    // 尝试调用API
    console.log("\n🚀 尝试调用alipay.trade.page.pay...");

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
      console.log("📋 返回HTML长度:", formHtml.length, "字符");
      console.log("📋 包含<form>标签:", formHtml.includes("<form"));
    } catch (apiError) {
      console.log("❌ API调用失败，详细错误信息:");
      console.log("- 错误类型:", apiError.constructor.name);
      console.log("- 错误消息:", apiError.message);

      if (apiError.response) {
        console.log("- HTTP状态码:", apiError.response.status);
        console.log("- 响应数据:", apiError.response.data);
      }

      // 检查是否是INVALID_PARAMETER错误
      if (apiError.message.includes("INVALID_PARAMETER")) {
        console.log("\n🎯 诊断结果: INVALID_PARAMETER错误");
        console.log("这通常表示以下问题之一:");
        console.log("1. product_code参数错误或不支持");
        console.log("2. 金额格式问题");
        console.log("3. 订单号格式问题");
        console.log("4. 沙箱环境应用配置问题");
        console.log("5. 应用未开通电脑网站支付产品");
      }
    }
  } catch (error) {
    console.error("❌ 初始化失败:", error.message);
  }
}

diagnoseParameters();
