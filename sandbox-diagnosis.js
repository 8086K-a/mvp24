const { AlipaySdk } = require("alipay-sdk");
const fs = require("fs");

console.log("🔍 支付宝沙箱环境完整诊断");

// 检查环境变量
console.log("\n📋 环境变量检查:");
console.log("ALIPAY_APP_ID:", process.env.ALIPAY_APP_ID || "未设置");
console.log("ALIPAY_GATEWAY_URL:", process.env.ALIPAY_GATEWAY_URL || "未设置");
console.log("ALIPAY_SANDBOX:", process.env.ALIPAY_SANDBOX || "未设置");

// 读取配置文件
const config = {
  appId: process.env.ALIPAY_APP_ID || "9021000157643313",
  privateKey:
    process.env.ALIPAY_PRIVATE_KEY ||
    fs.readFileSync("./pkcs1_private.pem", "utf8"),
  alipayPublicKey:
    process.env.ALIPAY_ALIPAY_PUBLIC_KEY ||
    fs.readFileSync("./alipay_private_base64.txt", "utf8"),
  gateway:
    process.env.ALIPAY_GATEWAY_URL ||
    "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
};

console.log("\n📋 实际使用配置:");
console.log("- AppId:", config.appId);
console.log("- 网关:", config.gateway);
console.log("- 私钥长度:", config.privateKey.length);
console.log("- 公钥长度:", config.alipayPublicKey.length);

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

async function fullSandboxDiagnosis() {
  try {
    console.log("\n📦 初始化SDK...");

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

    // 测试1: 基础参数测试
    console.log("\n🧪 测试1: 基础参数调用");
    const outTradeNo1 = `diag_basic_${Date.now()}`;
    const bizContent1 = {
      out_trade_no: outTradeNo1,
      total_amount: "0.01",
      subject: "诊断测试",
      product_code: "FAST_INSTANT_TRADE_PAY",
    };

    try {
      const form1 = await alipaySdk.pageExecute(
        "alipay.trade.page.pay",
        {
          notify_url: "http://localhost:3000/api/payment/alipay/notify",
          return_url: "http://localhost:3000/payment/success",
        },
        { bizContent: bizContent1 }
      );
      console.log("✅ 基础参数测试成功");
    } catch (error1) {
      console.log("❌ 基础参数测试失败:", error1.message);
    }

    // 测试2: 完整参数测试
    console.log("\n🧪 测试2: 完整参数调用");
    const outTradeNo2 = `diag_full_${Date.now()}`;
    const bizContent2 = {
      out_trade_no: outTradeNo2,
      total_amount: "0.01",
      subject: "完整诊断测试",
      product_code: "FAST_INSTANT_TRADE_PAY",
      body: "详细诊断测试商品描述",
      timeout_express: "30m",
      goods_type: "0",
    };

    try {
      const form2 = await alipaySdk.pageExecute(
        "alipay.trade.page.pay",
        {
          notify_url: "http://localhost:3000/api/payment/alipay/notify",
          return_url: "http://localhost:3000/payment/success",
        },
        { bizContent: bizContent2 }
      );
      console.log("✅ 完整参数测试成功");
    } catch (error2) {
      console.log("❌ 完整参数测试失败:", error2.message);
    }

    // 测试3: 检查应用状态
    console.log("\n🧪 测试3: 检查应用状态 (alipay.trade.query)");
    try {
      const queryResult = await alipaySdk.exec("alipay.trade.query", {
        bizContent: {
          out_trade_no: "non_existent_order_12345",
        },
      });
      console.log("✅ 查询接口可用，响应:", queryResult.code, queryResult.msg);
    } catch (error3) {
      console.log("❌ 查询接口失败:", error3.message);
    }

    // 测试4: 检查转账接口 (沙箱环境应该支持)
    console.log("\n🧪 测试4: 检查转账接口 (alipay.fund.trans.uni.transfer)");
    try {
      const transferResult = await alipaySdk.exec(
        "alipay.fund.trans.uni.transfer",
        {
          bizContent: {
            out_biz_no: `transfer_test_${Date.now()}`,
            trans_amount: "0.01",
            product_code: "TRANS_ACCOUNT_NO_PWD",
            biz_scene: "DIRECT_TRANSFER",
            payee_info: {
              identity: "test@example.com",
              identity_type: "ALIPAY_LOGON_ID",
              name: "测试收款人",
            },
            remark: "接口测试",
          },
        }
      );
      console.log(
        "✅ 转账接口可用，响应:",
        transferResult.code,
        transferResult.msg
      );
    } catch (error4) {
      console.log("❌ 转账接口失败:", error4.message);
    }

    console.log("\n🎯 诊断总结:");
    console.log("如果所有测试都失败，说明应用权限问题");
    console.log("如果只有page.pay失败，其他接口正常，说明电脑网站支付未开通");
    console.log("如果查询接口正常但page.pay失败，检查product_code参数");
  } catch (error) {
    console.error("❌ SDK初始化失败:", error.message);
    console.error("这通常表示密钥格式或配置错误");
  }
}

fullSandboxDiagnosis();
