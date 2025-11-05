// 加载环境变量
require("dotenv").config({ path: ".env.local" });

const crypto = require("crypto");

console.log("🔍 验证支付宝配置");

// 检测环境模式
const isSandbox = process.env.ALIPAY_SANDBOX === "true";
const envName = isSandbox ? "沙箱" : "生产";

console.log(`📍 当前环境: ${envName}环境`);

// 检查必需的环境变量
const requiredVars = [
  "ALIPAY_APP_ID",
  "ALIPAY_PRIVATE_KEY",
  "ALIPAY_PUBLIC_KEY", // 我方应用公钥（应与私钥匹配）
  "ALIPAY_ALIPAY_PUBLIC_KEY", // 支付宝公钥
];

const optionalVars = ["ALIPAY_GATEWAY_URL", "ALIPAY_SANDBOX"];

console.log("\n📋 必需配置检查:");
let allRequired = true;

for (const varName of requiredVars) {
  const value = process.env[varName];
  const isValid =
    value &&
    value !== `your_${varName.toLowerCase().replace("alipay_", "")}_here` &&
    value !== "example_value" &&
    value !== "your_production_private_key_content_here";

  console.log(
    `${isValid ? "✅" : "❌"} ${varName}: ${
      isValid ? "已配置" : "未配置或使用示例值"
    }`
  );

  if (!isValid) {
    allRequired = false;
  }
}

// 关键密钥格式与匹配性检查
if (process.env.ALIPAY_PRIVATE_KEY && process.env.ALIPAY_PUBLIC_KEY) {
  console.log("\n� 密钥自检:");
  try {
    // 规范化私钥（支持纯base64、PKCS#8、PKCS#1）
    const normalizePrivateKey = (key) => {
      if (key.includes("BEGIN RSA PRIVATE KEY")) return key;
      if (key.includes("BEGIN PRIVATE KEY")) return key; // Node.js可直接解析PKCS#8
      // 纯Base64内容，尝试按PKCS#8解析
      return `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
    };

    const rawPriv = process.env.ALIPAY_PRIVATE_KEY;
    const normalizedPriv = normalizePrivateKey(rawPriv);
    let privObj;
    try {
      // 优先按PKCS#8解析
      privObj = crypto.createPrivateKey({ key: normalizedPriv });
    } catch (_) {
      // 回退为PKCS#1
      const pkcs1 = rawPriv.includes("BEGIN RSA PRIVATE KEY")
        ? rawPriv
        : `-----BEGIN RSA PRIVATE KEY-----\n${rawPriv}\n-----END RSA PRIVATE KEY-----`;
      privObj = crypto.createPrivateKey({ key: pkcs1 });
    }
    const derivedPub = crypto
      .createPublicKey(privObj)
      .export({ type: "spki", format: "pem" })
      .toString();

    // 标准化环境中的公钥（支持纯Base64）
    const normalizePublicKey = (key) => {
      if (key.includes("BEGIN PUBLIC KEY")) return key;
      return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
    };

    const appPubNormalized = normalizePublicKey(process.env.ALIPAY_PUBLIC_KEY);

    // 去空白再比对（PEM行尾差异忽略）
    const strip = (s) => s.replace(/\s+/g, "");
    const match = strip(derivedPub) === strip(appPubNormalized);

    console.log(match ? "✅ 私钥与应用公钥匹配" : "❌ 私钥与应用公钥不匹配");

    // 额外检查：支付宝公钥与应用公钥不应相同
    if (process.env.ALIPAY_ALIPAY_PUBLIC_KEY) {
      const alipayPubNormalized = normalizePublicKey(
        process.env.ALIPAY_ALIPAY_PUBLIC_KEY
      );
      const sameAsApp = strip(alipayPubNormalized) === strip(appPubNormalized);
      console.log(
        sameAsApp
          ? "❌ 支付宝公钥与应用公钥相同（配置错误）"
          : "✅ 支付宝公钥与应用公钥区分正确"
      );
    }
  } catch (e) {
    console.log("❌ 密钥解析失败:", e.message);
    allRequired = false;
  }
}

console.log("\n�📋 可选配置检查:");
for (const varName of optionalVars) {
  const value = process.env[varName];
  const isConfigured = value !== undefined && value !== "";

  if (varName === "ALIPAY_SANDBOX") {
    const envType = value === "true" ? "沙箱环境" : "生产环境";
    console.log(`✅ ${varName}: ${envType}`);
  } else if (varName === "ALIPAY_GATEWAY_URL") {
    const expectedUrl = isSandbox
      ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
      : "https://openapi.alipay.com/gateway.do";
    const isCorrect = value === expectedUrl || value === undefined;
    console.log(
      `${isCorrect ? "✅" : "⚠️"} ${varName}: ${
        isCorrect ? `${envName}网关` : "网关地址不匹配"
      }`
    );
  } else {
    console.log(
      `${isConfigured ? "✅" : "⚠️"} ${varName}: ${
        isConfigured ? "已配置" : "使用默认值"
      }`
    );
  }
}

console.log(`\n🎯 ${envName}环境配置状态:`);
if (allRequired) {
  console.log(`✅ 所有必需配置已设置，可以使用${envName}环境`);
  console.log("💡 提示: 私钥、公钥配对通过，本地配置正确");
} else {
  console.log(`❌ 缺少必需配置或密钥错误，请先完成${envName}环境配置`);
  console.log("🔗 配置指南: 查看 ALIPAY_PRODUCTION_SETUP.md 文件");
}

console.log("\n🔐 安全提醒:");
console.log("- 私钥请妥善保管，不要提交到代码仓库");
console.log("- 建议使用环境变量或密钥管理服务存储敏感信息");
console.log("- 定期轮换API密钥");
