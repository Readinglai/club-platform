
/**
 * auth.ts — NextAuth v5 (beta) 完整設定（Server-side only）
 *
 * 合併 auth.config.ts（edge-safe 設定）和 Prisma Adapter（需要 Node.js）。
 * 使用 JWT session 策略，確保 proxy（Edge Runtime）也能驗證 session，
 * 同時用 Prisma Adapter 將 User/Account 寫入 Supabase 資料庫。
 *
 * ⚠️ 此檔案只應在 Server Components、Server Actions 和 API Routes 中 import。
 *    不可在 proxy.ts（Edge Runtime）中引用此檔案。
 */

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import type { Role } from "@/generated/prisma/client";
import { linkMembershipsToUser } from "@/lib/membership/link";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    ...authConfig.providers,

    {
      id: "resend",
      type: "email",
      name: "Email",

      async sendVerificationRequest({
        identifier,
        url,
      }: {
        identifier: string;
        url: string;
      }) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: identifier,
          subject: "ROCSAUT Magic Link",
          text: `請點擊以下連結登入 ROCSAUT：

${url}`,
          html: `
            <p>請點擊以下連結登入 ROCSAUT：</p>
            <p>
              <a href="${url}">登入 ROCSAUT</a>
            </p>
          `,
        });
      },
    },
  ],

  logger: {
    error(error) {
      console.error("[NextAuth][error]", error);
    },
    warn(code) {
      console.warn("[NextAuth][warn]", code);
    },
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db as any),

  session: {
    strategy: "jwt",
  },

  callbacks: {
    ...authConfig.callbacks,

    /**
     * redirect callback — remaps the old /dashboard landing to the role-aware
     * post-login router so existing callbackUrl=/dashboard links still work.
     * All other URLs follow standard NextAuth behaviour.
     */
    async redirect({ url, baseUrl }) {
      if (url === `${baseUrl}/dashboard`) {
        return `${baseUrl}/api/auth/post-login`;
      }

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (url.startsWith(baseUrl)) {
        return url;
      }

      return baseUrl;
    },

    /**
     * Anyone may sign in. Google accounts must have a verified email; email
     * links prove ownership by being clicked. New accounts start as USER.
     */
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      if (account?.provider === "google" && profile?.email_verified !== true) {
        return false;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role;

        // On sign-in: attach memberships recorded under this email and pick
        // up the role that may have changed because of it.
        if (user.id && user.email) {
          await linkMembershipsToUser(user.id, user.email);
          const fresh = await db.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
          if (fresh) token.role = fresh.role;
        }
      }

      if (!token.role && token.id) {
        const u = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });

        if (u) {
          token.role = u.role;
        }
      }

      return token;
    },
  },
});
