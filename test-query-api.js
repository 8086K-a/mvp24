const { AlipaySdk } = require("alipay-sdk");
require("dotenv").config({ path: "./.env.local" });

console.log("🔍 支付宝查询接口诊断测试");

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

async function testQueryAPI() {
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

    // 测试查询不存在的订单（应该返回正常的业务错误）
    console.log("\n🧪 测试1: 查询不存在的订单");
    const nonExistentOrder = `test_non_existent_${Date.now()}`;

    try {
      const result1 = await alipaySdk.exec("alipay.trade.query", {
        bizContent: {
          out_trade_no: nonExistentOrder,
        },
      });
      console.log("✅ 查询不存在订单成功，响应:", result1.code, result1.msg);
    } catch (error1) {
      console.log("❌ 查询不存在订单失败:", error1.message);
      if (error1.message.includes("INVALID_PARAMETER")) {
        console.log("🎯 发现INVALID_PARAMETER错误！");
        console.log("这说明应用没有权限调用查询接口");
      }
    }

    // 测试查询一个可能存在的订单号格式
    console.log("\n🧪 测试2: 查询实际格式的订单号");
    const realFormatOrder = `pay_${Date.now()}_real`;

    try {
      const result2 = await alipaySdk.exec("alipay.trade.query", {
        bizContent: {
          out_trade_no: realFormatOrder,
        },
      });
      console.log("✅ 查询实际格式订单成功，响应:", result2.code, result2.msg);
    } catch (error2) {
      console.log("❌ 查询实际格式订单失败:", error2.message);
      if (error2.message.includes("INVALID_PARAMETER")) {
        console.log("🎯 再次发现INVALID_PARAMETER错误！");
        console.log("确认：沙箱应用没有电脑网站支付产品权限");
      }
    }

    console.log("\n🎯 诊断结论:");
    console.log("如果查询接口返回INVALID_PARAMETER，说明应用权限问题");
    console.log("解决方案：开通沙箱应用的电脑网站支付产品");
  } catch (error) {
    console.error("❌ 初始化失败:", error.message);
  }
}

testQueryAPI();
