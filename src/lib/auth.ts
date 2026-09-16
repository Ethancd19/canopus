import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyAdminPassword } from "@/lib/password";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: SEVEN_DAYS },
  providers: [
    Credentials({
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!process.env.ADMIN_PASSWORD_HASH) {
          console.warn(
            "[auth] ADMIN_PASSWORD_HASH is not set; admin login is disabled",
          );
        }
        const candidate =
          typeof credentials?.password === "string" ? credentials.password : "";
        const ok = await verifyAdminPassword(
          candidate,
          process.env.ADMIN_PASSWORD_HASH,
        );
        return ok ? { id: "admin", name: "Ethan" } : null;
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
});
