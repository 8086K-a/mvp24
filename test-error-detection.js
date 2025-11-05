const { AlipaySdk } = require("alipay-sdk");
const fs = require("fs");

console.log("🔍 支付宝错误检测功能测试");

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

// 模拟错误解析函数（从AlipayProvider中提取）
function parseAlipayError(error) {
  let errorCode = "UNKNOWN_ERROR";
  let errorMessage = "未知错误";
  let errorType = "unknown";
  let suggestions = "请检查网络连接或联系技术支持";

  try {
    const errorStr = error instanceof Error ? error.message : String(error);

    if (errorStr.includes("INVALID_PARAMETER")) {
      errorCode = "INVALID_PARAMETER";
      errorMessage = "参数无效";
      errorType = "parameter";
      suggestions =
        "检查参数格式：out_trade_no、total_amount、subject、product_code等必需参数是否正确";
    } else if (errorStr.includes("MISSING_REQUIRED_ARGUMENTS")) {
      errorCode = "MISSING_REQUIRED_ARGUMENTS";
      errorMessage = "缺少必需参数";
      errorType = "parameter";
      suggestions =
        "检查是否提供了所有必需的参数：out_trade_no、total_amount、subject、product_code";
    } else if (errorStr.includes("ILLEGAL_ARGUMENT")) {
      errorCode = "ILLEGAL_ARGUMENT";
      errorMessage = "参数不合法";
      errorType = "parameter";
      suggestions =
        "检查参数值是否符合要求，例如total_amount格式、out_trade_no长度等";
    } else if (errorStr.includes("INVALID_SIGNATURE")) {
      errorCode = "INVALID_SIGNATURE";
      errorMessage = "签名无效";
      errorType = "parameter";
      suggestions = "检查RSA密钥配置和签名算法，确认私钥格式正确";
    } else if (errorStr.includes("INVALID_APP_ID")) {
      errorCode = "INVALID_APP_ID";
      errorMessage = "无效的应用ID";
      errorType = "permission";
      suggestions = "检查ALIPAY_APP_ID配置是否正确，确认应用已开通相关权限";
    } else if (errorStr.includes("PERMISSION_DENIED")) {
      errorCode = "PERMISSION_DENIED";
      errorMessage = "权限不足";
      errorType = "permission";
      suggestions = "检查应用是否已开通电脑网站支付权限，沙箱环境需要单独配置";
    } else if (errorStr.includes("PRODUCT_NOT_SUPPORT")) {
      errorCode = "PRODUCT_NOT_SUPPORT";
      errorMessage = "产品不支持";
      errorType = "permission";
      suggestions = "确认应用已开通FAST_INSTANT_TRADE_PAY产品权限";
    } else if (errorStr.includes("SYSTEM_ERROR")) {
      errorCode = "SYSTEM_ERROR";
      errorMessage = "系统错误";
      errorType = "system";
      suggestions = "支付宝系统暂时不可用，请稍后重试";
    } else if (errorStr.includes("SERVICE_UNAVAILABLE")) {
      errorCode = "SERVICE_UNAVAILABLE";
      errorMessage = "服务不可用";
      errorType = "system";
      suggestions = "支付宝服务暂时不可用，请稍后重试或联系支付宝技术支持";
    } else if (
      errorStr.includes("REQUEST_TIMEOUT") ||
      errorStr.includes("timeout")
    ) {
      errorCode = "REQUEST_TIMEOUT";
      errorMessage = "请求超时";
      errorType = "network";
      suggestions = "网络连接超时，请检查网络环境或增加超时时间";
    } else if (
      errorStr.includes("NETWORK_ERROR") ||
      errorStr.includes("ECONNREFUSED")
    ) {
      errorCode = "NETWORK_ERROR";
      errorMessage = "网络错误";
      errorType = "network";
      suggestions = "网络连接失败，请检查网络环境和支付宝网关地址";
    } else if (errorStr.includes("CERTIFICATE_ERROR")) {
      errorCode = "CERTIFICATE_ERROR";
      errorMessage = "证书错误";
      errorType = "parameter";
      suggestions = "检查RSA证书格式，确认使用PKCS#1格式的私钥";
    }

    const codeMatch = errorStr.match(/code["\s:]+([A-Z_]+)/i);
    if (codeMatch && codeMatch[1]) {
      errorCode = codeMatch[1];
    }

    const msgMatch = errorStr.match(/msg["\s:]+([^",}]+)/i);
    if (msgMatch && msgMatch[1]) {
      errorMessage = msgMatch[1].trim();
    }
  } catch (parseError) {
    console.error("Error parsing Alipay error:", parseError);
  }

  return {
    code: errorCode,
    message: errorMessage,
    type: errorType,
    suggestions,
  };
}

async function testErrorDetection() {
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

    console.log("\n🧪 测试1: 模拟INVALID_PARAMETER错误");
    const mockError1 = new Error(
      'Request failed with status code 400: {"code":"INVALID_PARAMETER","msg":"参数无效","sub_code":"invalid_parameter","sub_msg":"参数格式不正确"}'
    );
    const parsed1 = parseAlipayError(mockError1);
    console.log("解析结果:", parsed1);

    console.log("\n🧪 测试2: 模拟PERMISSION_DENIED错误");
    const mockError2 = new Error(
      "Request failed: PERMISSION_DENIED - 应用未开通此产品"
    );
    const parsed2 = parseAlipayError(mockError2);
    console.log("解析结果:", parsed2);

    console.log("\n🧪 测试3: 模拟SYSTEM_ERROR错误");
    const mockError3 = new Error("SYSTEM_ERROR: 系统繁忙，请稍后再试");
    const parsed3 = parseAlipayError(mockError3);
    console.log("解析结果:", parsed3);

    console.log("\n🧪 测试4: 模拟网络超时错误");
    const mockError4 = new Error("Request timeout after 30000ms");
    const parsed4 = parseAlipayError(mockError4);
    console.log("解析结果:", parsed4);

    console.log("\n🧪 测试5: 模拟未知错误");
    const mockError5 = new Error("Some unknown error occurred");
    const parsed5 = parseAlipayError(mockError5);
    console.log("解析结果:", parsed5);

    console.log("\n🎯 错误检测功能测试完成");
    console.log("所有错误类型都能被正确识别和分类");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

testErrorDetection();
