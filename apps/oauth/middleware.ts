import type { CookieToSet } from "@/lib/supabase/cookie-types";
import { isOAuthDevDemoEnabled } from "@/lib/oauth-dev-mode";
import { readSupabasePublicEnv } from "@/lib/supabase-public-env";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isOAuthDevDemoEnabled()) {
    if (pathname === "/demo-unavailable" || pathname.startsWith("/demo-unavailable/")) {
      return NextResponse.redirect(new URL("/demo", request.url));
    }
  } else {
    if (pathname.startsWith("/api/demo")) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (pathname === "/demo" || pathname.startsWith("/demo/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/demo-unavailable";
      url.search = "";
      return NextResponse.rewrite(url);
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const env = readSupabasePublicEnv();
  if (!env) {
    return supabaseResponse;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
