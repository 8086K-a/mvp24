// test-key.js
const crypto = require("crypto");
const fs = require("fs");

console.log("🔍 私钥格式验证测试\n");

// 读取PKCS8私钥
const pkcs8Key = fs.readFileSync("pkcs8_private.pem", "utf8");
console.log("PKCS8私钥:");
console.log("- 开始:", pkcs8Key.substring(0, 40) + "...");
console.log("- 结束:", "..." + pkcs8Key.substring(pkcs8Key.length - 40));
console.log("- 长度:", pkcs8Key.length, "字符\n");

// 测试PKCS8签名
try {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update("test_data_for_signing");
  const signature = sign.sign(pkcs8Key, "base64");
  console.log("✅ PKCS8私钥签名测试通过");
  console.log("签名长度:", signature.length, "字符\n");
} catch (error) {
  console.log("❌ PKCS8私钥签名测试失败:", error.message, "\n");
}

// 转换为PKCS1格式测试
const pkcs1Key = pkcs8Key
  .replace(/-----BEGIN PRIVATE KEY-----/, "-----BEGIN RSA PRIVATE KEY-----")
  .replace(/-----END PRIVATE KEY-----/, "-----END RSA PRIVATE KEY-----");

console.log("转换后的PKCS1私钥:");
console.log("- 开始:", pkcs1Key.substring(0, 40) + "...");
console.log("- 结束:", "..." + pkcs1Key.substring(pkcs1Key.length - 40));
console.log("- 长度:", pkcs1Key.length, "字符\n");

// 测试PKCS1签名
try {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update("test_data_for_signing");
  const signature = sign.sign(pkcs1Key, "base64");
  console.log("✅ PKCS1私钥签名测试通过");
  console.log("签名长度:", signature.length, "字符\n");
} catch (error) {
  console.log("❌ PKCS1私钥签名测试失败:", error.message, "\n");
}

console.log("🎯 建议: 如果PKCS8失败但PKCS1成功，使用PKCS1格式的私钥");
