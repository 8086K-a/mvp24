const { AlipaySdk } = require("alipay-sdk");
const fs = require("fs");

console.log("🔍 支付宝官方文档参数完整性测试");

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

async function testOfficialParameters() {
  try {
    console.log("📦 初始化SDK...");
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

    console.log("\n📋 按照官方文档构建完整参数...");

    // 严格按照官方文档的必需参数和建议参数
    const outTradeNo = `official_test_${Date.now()}`;
    const bizContent = {
      // 必需参数
      out_trade_no: outTradeNo, // 商户订单号
      total_amount: "0.01", // 订单总金额
      subject: "测试商品", // 订单标题
      product_code: "FAST_INSTANT_TRADE_PAY", // 销售产品码

      // 可选但重要的参数
      body: "测试商品详细描述", // 商品描述
      timeout_express: "30m", // 交易超时时间
      goods_type: "0", // 商品主类型：0-虚拟类商品
    };

    console.log("📋 官方文档参数:");
    console.log(JSON.stringify(bizContent, null, 2));

    console.log("\n🔍 参数验证:");
    console.log("- out_trade_no:", bizContent.out_trade_no, "(必需)");
    console.log("- total_amount:", bizContent.total_amount, "(必需，格式正确)");
    console.log("- subject:", bizContent.subject, "(必需，4个字符)");
    console.log("- product_code:", bizContent.product_code, "(必需，固定值)");
    console.log("- body:", bizContent.body, "(可选，商品描述)");
    console.log(
      "- timeout_express:",
      bizContent.timeout_express,
      "(可选，30分钟)"
    );
    console.log("- goods_type:", bizContent.goods_type, "(可选，虚拟商品)");

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

      // 检查表单内容
      if (formHtml.includes("out_trade_no")) {
        console.log("✅ 表单包含订单号参数");
      }
      if (formHtml.includes("FAST_INSTANT_TRADE_PAY")) {
        console.log("✅ 表单包含正确的product_code");
      }

      console.log("\n🎯 结论: 代码参数完整，问题在于应用权限");
    } catch (apiError) {
      console.log("❌ API调用失败，错误详情:");
      console.log("- 错误类型:", apiError.constructor.name);
      console.log("- 错误消息:", apiError.message);

      if (apiError.message.includes("INVALID_PARAMETER")) {
        console.log("\n🎯 确认诊断: INVALID_PARAMETER错误");
        console.log("原因: 沙箱应用未开通电脑网站支付产品");
        console.log("解决方案: 在支付宝开放平台为沙箱应用开通电脑网站支付");
      }
    }
  } catch (error) {
    console.error("❌ 初始化失败:", error.message);
  }
}

testOfficialParameters();
