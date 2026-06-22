import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

const authMiddleware = withAuth({
  pages: { signIn: "/" }
});

export default function middleware(req: NextRequest, event: unknown) {
  if (process.env.FREE_MODE === "true") return NextResponse.next();
  const authHandler = authMiddleware as (request: unknown, event: unknown) => unknown;
  return authHandler(req, event) as NextResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/compare/:path*",
    "/wardrobe/:path*",
    "/history/:path*",
    "/api/profile",
    "/api/upload",
    "/api/wardrobe",
    "/api/analyses",
    "/api/tryon",
    "/api/style-analysis"
  ]
};
