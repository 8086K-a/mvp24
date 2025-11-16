# 使用多阶段构建减小镜像大小
FROM node:20-alpine AS base

# 安装pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# ========== 构建时环境变量声明 ==========
# 接收腾讯云注入的构建参数（NEXT_PUBLIC_* 变量需要在构建时可用）
ARG NODE_ENV=production
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_WECHAT_CLOUDBASE_ID
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_ALIPAY_APP_ID
ARG WECHAT_APP_ID
ARG WECHAT_PAY_MCH_ID
ARG WECHAT_PAY_API_V3_KEY
ARG WECHAT_PAY_SERIAL_NO
ARG WECHAT_PAY_PRIVATE_KEY
ARG WECHAT_APP_SECRET
ARG DEEPSEEK_API_KEY
ARG OPENAI_API_KEY
ARG ANTHROPIC_API_KEY

# 将 ARG 转换为 ENV，使构建过程能访问这些变量
ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_WECHAT_CLOUDBASE_ID=$NEXT_PUBLIC_WECHAT_CLOUDBASE_ID
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_ALIPAY_APP_ID=$NEXT_PUBLIC_ALIPAY_APP_ID
ENV WECHAT_APP_ID=$WECHAT_APP_ID
ENV WECHAT_PAY_MCH_ID=$WECHAT_PAY_MCH_ID
ENV WECHAT_PAY_API_V3_KEY=$WECHAT_PAY_API_V3_KEY
ENV WECHAT_PAY_SERIAL_NO=$WECHAT_PAY_SERIAL_NO
ENV WECHAT_PAY_PRIVATE_KEY=$WECHAT_PAY_PRIVATE_KEY
ENV WECHAT_APP_SECRET=$WECHAT_APP_SECRET
ENV DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY

# 复制包管理文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用（此时环境变量已可用）
RUN pnpm build

# 生产阶段
FROM node:20-alpine AS production

# 安装pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# ========== 运行时环境变量声明 ==========
# 运行时环境变量将由腾讯云托管平台注入
# 这些变量在容器启动时会由腾讯云环境变量设置覆盖
ARG NODE_ENV=production
ARG PORT=3000

ENV NODE_ENV=$NODE_ENV
ENV PORT=$PORT

# 从构建阶段复制必要的文件
COPY --from=base /app/package.json /app/pnpm-lock.yaml ./
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.mjs ./

# 安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 更改文件所有权
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pnpm", "start"]