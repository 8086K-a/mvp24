// 解析由 AlipayProvider.createPayment 返回的 HTML 表单，打印所有隐藏字段
require("dotenv").config({ path: ".env.local" });
const { AlipaySdk } = require("alipay-sdk");

function extractInputs(html) {
  const inputs = [];
  const inputTagRe = /<input\s+[^>]*>/gi;
  const nameRe = /name=("([^"]*)"|'([^']*)')/i;
  const valueRe = /value=("([^"]*)"|'([^']*)')/i;
  let m;
  while ((m = inputTagRe.exec(html)) !== null) {
    const tag = m[0];
    const nameMatch = tag.match(nameRe);
    const valueMatch = tag.match(valueRe);
    const name = nameMatch ? nameMatch[2] || nameMatch[3] || "" : "";
    const value = valueMatch ? valueMatch[2] || valueMatch[3] || "" : "";
    if (name) inputs.push({ name, value });
  }
  return inputs;
}

(async () => {
  try {
    const isCert = process.env.ALIPAY_CERT_MODE === "true";
    const productMode = (
      process.env.ALIPAY_PRODUCT_MODE || "page"
    ).toLowerCase();
    const isWap = productMode === "wap";

    const normalizePrivateKey = (key) => {
      if (!key) return null;
      const trimmed = String(key).trim();
      if (trimmed.includes("BEGIN RSA PRIVATE KEY")) return trimmed;
      if (trimmed.includes("BEGIN PRIVATE KEY")) return trimmed;
      return `-----BEGIN RSA PRIVATE KEY-----\n${trimmed}\n-----END RSA PRIVATE KEY-----`;
    };

    const sdk = new AlipaySdk({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: normalizePrivateKey(process.env.ALIPAY_PRIVATE_KEY),
      signType: "RSA2",
      gateway: process.env.ALIPAY_GATEWAY_URL,
      camelcase: false,
      ...(isCert
        ? {
            appCertContent:
              process.env.ALIPAY_APP_CERT ||
              (process.env.ALIPAY_APP_CERT_PATH
                ? require("fs").readFileSync(
                    process.env.ALIPAY_APP_CERT_PATH,
                    "utf8"
                  )
                : undefined),
            alipayPublicCertContent:
              process.env.ALIPAY_ALIPAY_PUBLIC_CERT ||
              (process.env.ALIPAY_ALIPAY_PUBLIC_CERT_PATH
                ? require("fs").readFileSync(
                    process.env.ALIPAY_ALIPAY_PUBLIC_CERT_PATH,
                    "utf8"
                  )
                : undefined),
            alipayRootCertContent:
              process.env.ALIPAY_ALIPAY_ROOT_CERT ||
              (process.env.ALIPAY_ALIPAY_ROOT_CERT_PATH
                ? require("fs").readFileSync(
                    process.env.ALIPAY_ALIPAY_ROOT_CERT_PATH,
                    "utf8"
                  )
                : undefined),
          }
        : { alipayPublicKey: process.env.ALIPAY_ALIPAY_PUBLIC_KEY }),
    });

    const method = isWap ? "alipay.trade.wap.pay" : "alipay.trade.page.pay";
    const bizContent = {
      out_trade_no: `dbg_${Date.now()}`,
      total_amount: "0.01",
      subject: "Fields Debug",
      product_code: isWap ? "QUICK_WAP_WAY" : "FAST_INSTANT_TRADE_PAY",
    };

    const formHtml = await sdk.pageExecute(
      method,
      {
        notify_url: "http://localhost:3000/api/payment/alipay/notify",
        return_url: "http://localhost:3000/payment/success",
      },
      { bizContent }
    );

    if (!formHtml || !formHtml.includes("<form")) {
      console.error("❌ 未获得表单 HTML");
      process.exit(1);
    }
    console.log("\n📄 表单预览:");
    console.log(formHtml.substring(0, 800));
    // 解析表单 action 上的查询参数
    const actionMatch = formHtml.match(
      /<form[^>]*action=("([^"]*)"|'([^']*)')/i
    );
    const actionUrl = actionMatch ? actionMatch[2] || actionMatch[3] : "";
    const url = new URL(actionUrl);
    const params = Object.fromEntries(url.searchParams.entries());
    console.log("\n� action 查询参数:");
    for (const [k, v] of Object.entries(params)) {
      const short = v.length > 160 ? v.substring(0, 160) + "…" : v;
      console.log(`- ${k}: ${short}`);
    }
    console.log("\n🔍 关键字段:");
    const pick = (k) => params[k];
    console.log("method:", pick("method"));
    console.log("charset:", pick("charset"));
    console.log("sign_type:", pick("sign_type"));
    console.log("timestamp:", pick("timestamp"));
    console.log("version:", pick("version"));
    console.log("app_cert_sn:", pick("app_cert_sn"));
    console.log("alipay_root_cert_sn:", pick("alipay_root_cert_sn"));
    // biz_content 常在隐藏 input 中，额外解析
    const inputs = extractInputs(formHtml);
    const bizInput = inputs.find((i) => i.name === "biz_content");
    let bizFromInput = bizInput?.value;
    console.log(
      "biz_content(action | input):",
      pick("biz_content"),
      "|",
      bizFromInput
        ? bizFromInput.substring(0, 160) +
            (bizFromInput.length > 160 ? "…" : "")
        : undefined
    );
    console.log("sign (len):", (pick("sign") || "").length);
  } catch (e) {
    console.error("❌ 调试失败:", e.message);
    process.exit(1);
  }
})();
