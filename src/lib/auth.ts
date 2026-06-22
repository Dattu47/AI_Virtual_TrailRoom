import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { freeModeUser, isFreeMode } from "@/lib/runtime";
import { supabaseAdmin } from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP Code", type: "text" },
        loginType: { label: "Login Type", type: "text" }
      },
      async authorize(credentials) {
        if (isFreeMode) {
          return freeModeUser;
        }

        if (!credentials?.email) {
          throw new Error("Email is required");
        }

        if (!supabaseAdmin) {
          throw new Error("Supabase authentication is not configured");
        }

        // 1. OTP Verification Flow
        if (credentials.loginType === "otp") {
          if (!credentials.otp) {
            throw new Error("OTP verification code is required");
          }
          const { data, error } = await supabaseAdmin.auth.verifyOtp({
            email: credentials.email,
            token: credentials.otp,
            type: "email"
          });

          if (error || !data.user) {
            throw new Error(error?.message || "Invalid or expired OTP code");
          }

          // Automatically ensure user profile is in database
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", credentials.email)
            .single();

          if (!profile) {
            await supabaseAdmin.from("profiles").insert({
              id: data.user.id,
              email: credentials.email
            });
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.email?.split("@")[0] || "User"
          };
        }

        // 2. Password Verification Flow
        if (credentials.loginType === "password") {
          if (!credentials.password) {
            throw new Error("Password is required");
          }

          const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
          });

          if (error || !data.user) {
            throw new Error(error?.message || "Invalid email or password");
          }

          // Automatically ensure user profile is in database
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", credentials.email)
            .single();

          if (!profile) {
            await supabaseAdmin.from("profiles").insert({
              id: data.user.id,
              email: credentials.email
            });
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.email?.split("@")[0] || "User"
          };
        }

        throw new Error("Invalid login authentication request");
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (isFreeMode) {
        token.uid = freeModeUser.id;
        token.email = freeModeUser.email;
        return token;
      }
      if (user) {
        token.uid = user.id;
        token.email = user.email;
      } else if (token.email) {
        if (supabaseAdmin) {
          try {
            const { data } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("email", token.email)
              .single();

            if (data?.id) token.uid = data.id;
          } catch {
            // Ignore database or table connection errors to prevent session invalidation
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string | undefined) ?? token.sub ?? "";
      }
      return session;
    }
  },
  pages: {
    signIn: "/"
  },
  secret: process.env.NEXTAUTH_SECRET || "local-dev-secret"
};
