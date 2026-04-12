import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip middleware check
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // Create Supabase client for auth check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validate session and refresh token if expired — getUser() makes a server
  // call that guarantees the token is valid and triggers cookie refresh via setAll.
  // getClaims() can return stale claims from an expired JWT when refresh fails,
  // which lets unauthenticated users past the middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect all routes except /auth/* and /api/*
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Role-based routing: read role from JWT claims (injected by custom_access_token_hook).
  // Zero DB queries for role when the hook is active in Supabase Dashboard.
  if (user) {
    // Primary: read role from JWT custom claims set by custom_access_token_hook
    const { data: claimsData } = await supabase.auth.getClaims();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userRole: string | undefined = (claimsData?.claims as any)?.user_role as string | undefined;

    // Fallback: query DB if hook is not yet enabled (remove once hook is confirmed working)
    if (!userRole) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      userRole = profile?.role ?? undefined;
    }

    const pathname = request.nextUrl.pathname;

    // Backward-compat: redirect legacy /portal/* URLs to the new unprefixed routes.
    // Historical links, bookmarks and emails still point at /portal/*.
    if (pathname === '/portal' || pathname.startsWith('/portal/')) {
      const url = request.nextUrl.clone();
      if (pathname === '/portal') {
        url.pathname = '/';
      } else if (pathname === '/portal/admin') {
        url.pathname = '/workspace';
      } else {
        // /portal/<uuid>/... is a project detail — map to /projects/<uuid>/...
        // /portal/<name>/... is a named route — strip the /portal prefix.
        const rest = pathname.slice('/portal/'.length);
        const firstSeg = rest.split('/')[0];
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        url.pathname = uuidRe.test(firstSeg) ? `/projects/${rest}` : `/${rest}`;
      }
      return NextResponse.redirect(url);
    }

    // Admin-only routes — only admin role can access /admin, managers fall back to /
    const adminOnlyRoutes = ['/admin'];
    if (userRole !== 'admin' && adminOnlyRoutes.some((route) => pathname.startsWith(route))) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Manager-or-admin-only routes — /workspace manages branding/apps/client access
    const managerOrAboveRoutes = ['/workspace', '/clients', '/seo'];
    if (
      userRole !== 'admin' &&
      userRole !== 'manager' &&
      managerOrAboveRoutes.some((route) => pathname.startsWith(route))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Authenticated users hitting /auth/login or /auth/signup → home
    if (pathname === '/auth/login' || pathname === '/auth/signup') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
