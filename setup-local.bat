@echo off
echo 🚀 MultiGPT Platform - 本地开发环境设置
echo ======================================

echo 📦 安装依赖...
call pnpm install

echo 🗄️ 初始化Supabase本地环境...
call npx supabase init

echo 🔧 生成Supabase类型...
call npx supabase gen types typescript --local > lib/types/supabase.ts

echo ✅ 设置完成！
echo.
echo 📋 下一步操作：
echo 1. 启动Supabase本地服务: npm run supabase:start
echo 2. 在新终端启动开发服务器: npm run dev
echo 3. 或者使用Vercel CLI: npm run vercel:dev
echo.
echo 📖 查看完整指南: LOCAL_TOOLS_GUIDE.md
echo.

pause