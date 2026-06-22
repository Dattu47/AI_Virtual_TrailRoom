"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { data } = useSession();
  const router = useRouter();
  const isFreeMode = process.env.NEXT_PUBLIC_FREE_MODE === "true";

  // Auth States
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [loginType, setLoginType] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handleFreeModeLogin = async () => {
    setLoading(true);
    const res = await signIn("credentials", {
      email: "local@stylesense.dev",
      loginType: "free",
      callbackUrl: "/onboarding",
      redirect: false
    });
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Logged into Local Dev Session");
      router.push("/onboarding");
    }
  };

  const handleSendOTP = async () => {
    if (!email) return toast.error("Please enter your email first");
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const resData = await res.json();
      if (res.ok) {
        toast.success(resData.message || "OTP code sent to your email!");
        setOtpSent(true);
      } else {
        toast.error(resData.error || "Could not send OTP");
      }
    } catch {
      toast.error("Failed to request OTP code");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter email");

    setLoading(true);
    if (authMode === "signup") {
      // Register logic
      if (password.length < 6) {
        setLoading(false);
        return toast.error("Password must be at least 6 characters");
      }
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const resData = await res.json();
        if (res.ok) {
          toast.success(resData.message || "Sign up successful! Log in now.");
          // Switch to sign in password mode
          setAuthMode("signin");
          setLoginType("password");
        } else {
          toast.error(resData.error || "Sign up failed");
        }
      } catch {
        toast.error("An error occurred during registration");
      } finally {
        setLoading(false);
      }
    } else {
      // Sign In logic
      const signInData: Record<string, string> = {
        email,
        loginType,
        callbackUrl: "/onboarding",
        redirect: "false"
      };

      if (loginType === "password") {
        if (!password) {
          setLoading(false);
          return toast.error("Please enter password");
        }
        signInData.password = password;
      } else {
        if (!otp) {
          setLoading(false);
          return toast.error("Please enter OTP code");
        }
        signInData.otp = otp;
      }

      const res = await signIn("credentials", {
        ...signInData,
        redirect: false
      });
      setLoading(false);

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Welcome back!");
        router.push("/onboarding");
      }
    }
  };

  return (
    <section className="mx-auto max-w-md py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl text-accent">
          StyleSense AI
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Your personal AI fashion stylist & virtual fitting room.
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/60 md:p-8">
        {data?.user ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-sm font-medium">Logged in as <span className="text-accent">{data.user.email}</span></p>
            <Link href="/dashboard" className="inline-block rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-md hover:bg-accent/90">
              Go to Dashboard
            </Link>
          </div>
        ) : isFreeMode ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-xs text-neutral-500">
              Free Mode is active. No external cloud credentials are required to test or browse.
            </p>
            <button
              onClick={handleFreeModeLogin}
              disabled={loading}
              className="w-full rounded-xl bg-accent py-3 font-semibold text-white shadow-md hover:bg-accent/90 disabled:opacity-50 shadow-accent/25"
            >
              {loading ? "Logging in..." : "Continue in Free Local Mode"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sign In vs Sign Up Tabs */}
            <div className="flex border-b border-black/5 dark:border-white/5 pb-2">
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={`flex-1 text-sm font-bold pb-2 border-b-2 text-center transition ${
                  authMode === "signin" ? "border-accent text-accent" : "border-transparent text-neutral-400"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`flex-1 text-sm font-bold pb-2 border-b-2 text-center transition ${
                  authMode === "signup" ? "border-accent text-accent" : "border-transparent text-neutral-400"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Email field */}
            <label className="flex flex-col space-y-1">
              <span className="text-xs font-semibold text-neutral-500">Email Address</span>
              <input
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm"
                required
              />
            </label>

            {/* If Sign In: toggle OTP vs Password */}
            {authMode === "signin" && (
              <div className="flex gap-2 py-1">
                <button
                  type="button"
                  onClick={() => setLoginType("password")}
                  className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wide transition ${
                    loginType === "password"
                      ? "bg-accent text-white"
                      : "bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                  }`}
                >
                  Password Login
                </button>
                <button
                  type="button"
                  onClick={() => setLoginType("otp")}
                  className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wide transition ${
                    loginType === "otp"
                      ? "bg-accent text-white"
                      : "bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                  }`}
                >
                  OTP Login (Passwordless)
                </button>
              </div>
            )}

            {/* Password input */}
            {(authMode === "signup" || (authMode === "signin" && loginType === "password")) && (
              <label className="flex flex-col space-y-1">
                <span className="text-xs font-semibold text-neutral-500">Password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm"
                  required
                />
              </label>
            )}

            {/* OTP Verification code inputs */}
            {authMode === "signin" && loginType === "otp" && (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <label className="flex-1 flex flex-col space-y-1">
                    <span className="text-xs font-semibold text-neutral-500">One-Time Password (OTP)</span>
                    <input
                      type="text"
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full text-sm h-10"
                      disabled={!otpSent}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={otpLoading}
                    className="rounded-xl border border-accent text-accent px-4 py-2 text-xs font-bold hover:bg-accent/5 disabled:opacity-50 h-10 whitespace-nowrap"
                  >
                    {otpLoading ? "Sending..." : otpSent ? "Resend OTP" : "Request OTP"}
                  </button>
                </div>
                {otpSent && (
                  <p className="text-[10px] text-green-600 font-semibold bg-green-50 p-2 rounded dark:bg-green-950/20 dark:text-green-400">
                    ✓ Code sent! Check your inbox and enter it above.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent py-3 font-semibold text-white shadow-md hover:bg-accent/90 disabled:opacity-50 mt-4 shadow-accent/20"
            >
              {loading
                ? "Please wait..."
                : authMode === "signup"
                ? "Register Account"
                : loginType === "password"
                ? "Sign In"
                : "Verify & Login"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
