import {
  validateEnvironment,
  checkSensitiveDataExposure,
} from "@/lib/env-validation";

/**
 * 应用启动时的安全检查
 * 这个函数在应用启动时调用，用于验证环境配置的安全性
 */
export function performStartupSecurityChecks(): void {
  console.log("🔒 Performing startup security checks...");

  // 1. 验证环境变量
  const envValidation = validateEnvironment();
  if (!envValidation.success) {
    console.error("❌ Environment validation failed:");
    envValidation.errors.forEach((error) => console.error(`   - ${error}`));
    throw new Error(
      "Environment validation failed. Please check your configuration."
    );
  }
  console.log("✅ Environment variables validated");

  // 2. 检查敏感数据暴露
  const exposureCheck = checkSensitiveDataExposure();
  if (!exposureCheck.safe) {
    console.warn("⚠️  Sensitive data exposure warnings:");
    exposureCheck.warnings.forEach((warning) =>
      console.warn(`   - ${warning}`)
    );
  } else {
    console.log("✅ No sensitive data exposure detected");
  }

  // 3. 检查运行环境
  if (process.env.NODE_ENV === "production") {
    console.log("🏭 Running in production mode");

    // 生产环境额外检查
    const requiredProdVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "APP_URL",
    ];

    const missing = requiredProdVars.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missing.join(
          ", "
        )}`
      );
    }

    // 检查是否配置了支付提供商
    const paymentConfigured = [
      process.env.STRIPE_SECRET_KEY,
      process.env.PAYPAL_CLIENT_SECRET,
    ].some((key) => key);

    if (!paymentConfigured) {
      console.warn("⚠️  No payment providers configured in production");
    }
  }

  // 4. 检查API密钥格式（非阻塞）
  const apiKeys = {
    stripe: process.env.STRIPE_SECRET_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };

  Object.entries(apiKeys).forEach(([provider, key]) => {
    if (key && !key.startsWith(`sk${provider === "stripe" ? "_" : "-"}`)) {
      console.warn(
        `⚠️  ${provider.toUpperCase()} API key format looks unusual`
      );
    }
  });

  console.log("🎉 Security checks completed successfully");
}

// 在开发环境中运行检查
if (process.env.NODE_ENV !== "test") {
  try {
    performStartupSecurityChecks();
  } catch (error) {
    console.error("🚨 Startup security check failed:", error);
    // 在生产环境中，安全检查失败应该阻止启动
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}
