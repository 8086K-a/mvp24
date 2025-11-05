const { AlipaySdk } = require("alipay-sdk");
require("dotenv").config({ path: "./.env.local" });

console.log("🔍 支付宝参数格式详细检查");

// 使用实际环境变量
const config = {
  appId: process.env.ALIPAY_APP_ID,
  privateKey: process.env.ALIPAY_PRIVATE_KEY,
  alipayPublicKey: process.env.ALIPAY_ALIPAY_PUBLIC_KEY,
  gateway: process.env.ALIPAY_GATEWAY_URL,
};

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

async function checkParameterFormat() {
  try {
    console.log("📦 初始化SDK...");

    if (!config.appId || !config.privateKey || !config.alipayPublicKey) {
      console.log("❌ 缺少环境变量");
      return;
    }

    const alipaySdk = new AlipaySdk({
      appId: config.appId,
      privateKey: formatPrivateKey(config.privateKey),
      signType: "RSA2",
      alipayPublicKey: formatPublicKey(config.alipayPublicKey),
      gateway: config.gateway,
      timeout: 30000,
      camelcase: false,
    });

    console.log("✅ SDK初始化成功");

    // 生成测试订单号
    const outTradeNo = `format_check_${Date.now()}`;
    console.log("\n📋 生成订单号:", outTradeNo);

    // 严格按照支付宝文档检查参数格式
    console.log("\n🔍 参数格式严格检查:");

    // 1. out_trade_no 检查
    console.log("1. out_trade_no:");
    console.log("   - 值:", outTradeNo);
    console.log("   - 类型:", typeof outTradeNo);
    console.log("   - 长度:", outTradeNo.length);
    console.log("   - 格式检查: 只能包含字母、数字、下划线、横线");
    const outTradeNoValid = /^[a-zA-Z0-9_-]+$/.test(outTradeNo);
    console.log("   - 格式验证:", outTradeNoValid ? "✅ 通过" : "❌ 失败");

    // 2. total_amount 检查
    const totalAmount = "0.01";
    console.log("\n2. total_amount:");
    console.log("   - 值:", totalAmount);
    console.log("   - 类型:", typeof totalAmount);
    console.log("   - 格式检查: 字符串格式，最多两位小数");
    const totalAmountValid = /^\d+(\.\d{1,2})?$/.test(totalAmount);
    console.log("   - 格式验证:", totalAmountValid ? "✅ 通过" : "❌ 失败");

    // 3. subject 检查
    const subject = "测试商品";
    console.log("\n3. subject:");
    console.log("   - 值:", subject);
    console.log("   - 类型:", typeof subject);
    console.log("   - 长度:", subject.length);
    console.log("   - 格式检查: 最长256字符，不能为空");
    const subjectValid = subject && subject.length > 0 && subject.length <= 256;
    console.log("   - 格式验证:", subjectValid ? "✅ 通过" : "❌ 失败");

    // 4. product_code 检查
    const productCode = "FAST_INSTANT_TRADE_PAY";
    console.log("\n4. product_code:");
    console.log("   - 值:", productCode);
    console.log("   - 类型:", typeof productCode);
    console.log("   - 格式检查: 必须是FAST_INSTANT_TRADE_PAY");
    const productCodeValid = productCode === "FAST_INSTANT_TRADE_PAY";
    console.log("   - 格式验证:", productCodeValid ? "✅ 通过" : "❌ 失败");

    // 构建bizContent
    const bizContent = {
      out_trade_no: outTradeNo,
      total_amount: totalAmount,
      subject: subject,
      product_code: productCode,
    };

    console.log("\n📋 最终bizContent:");
    console.log(JSON.stringify(bizContent, null, 2));

    // 检查JSON格式
    console.log("\n🔍 JSON格式检查:");
    try {
      const jsonString = JSON.stringify(bizContent);
      console.log("   - JSON序列化: ✅ 成功");
      console.log("   - JSON长度:", jsonString.length);
      console.log("   - 包含特殊字符检查: 无多余逗号括号");

      // 检查是否有语法错误
      const parsed = JSON.parse(jsonString);
      console.log("   - JSON解析: ✅ 成功");
      console.log(
        "   - 参数完整性:",
        Object.keys(parsed).length === 4 ? "✅ 4个必需参数" : "❌ 参数不完整"
      );
    } catch (jsonError) {
      console.log("   - JSON格式错误:", jsonError.message);
    }

    // 尝试调用API
    console.log("\n🚀 尝试调用API...");

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
      console.log("📋 生成HTML长度:", formHtml.length);

      // 检查表单内容
      const hasOutTradeNo = formHtml.includes(outTradeNo);
      const hasProductCode = formHtml.includes("FAST_INSTANT_TRADE_PAY");
      const hasTotalAmount = formHtml.includes("0.01");

      console.log("📋 表单内容检查:");
      console.log("   - 包含订单号:", hasOutTradeNo ? "✅" : "❌");
      console.log("   - 包含产品码:", hasProductCode ? "✅" : "❌");
      console.log("   - 包含金额:", hasTotalAmount ? "✅" : "❌");
    } catch (apiError) {
      console.log("❌ API调用失败，详细错误:");
      console.log("- 错误消息:", apiError.message);

      if (apiError.message.includes("INVALID_PARAMETER")) {
        console.log("\n🎯 INVALID_PARAMETER错误详情:");
        console.log("这通常表示以下问题之一:");
        console.log("1. 应用没有电脑网站支付权限");
        console.log("2. 参数格式仍然有问题");
        console.log("3. 网络或代理问题");

        // 检查错误详情
        if (apiError.response) {
          console.log("4. HTTP状态码:", apiError.response.status);
          if (apiError.response.data) {
            console.log(
              "5. 响应数据:",
              typeof apiError.response.data === "string"
                ? apiError.response.data.substring(0, 500)
                : JSON.stringify(apiError.response.data, null, 2)
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ 初始化失败:", error.message);
  }
}

checkParameterFormat();
