import { NextRequest, NextResponse } from "next/server";

// The real backend origin — set as a server-only (non-NEXT_PUBLIC_) env var
// on Vercel. Every /api/* call from the browser lands here and gets
// forwarded to it, so the browser only ever talks to our own origin —
// that's what makes the auth cookies first-party instead of a cross-site
// cookie Safari's ITP (and Chrome's strict third-party-cookie mode)
// silently refuses to store.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

async function proxy(req: NextRequest, path: string[]) {
  const targetUrl = `${BACKEND_URL}/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length"); // recomputed by fetch() from the body below

  const hasBody = !["GET", "HEAD"].includes(req.method);

  const backendRes = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const resHeaders = new Headers(backendRes.headers);
  resHeaders.delete("content-encoding"); // already decoded by fetch — forwarding this would tell the browser to decode it again
  resHeaders.delete("transfer-encoding");
  resHeaders.delete("set-cookie"); // re-added below, one at a time

  const response = new NextResponse(backendRes.body, {
    status: backendRes.status,
    headers: resHeaders,
  });

  // A plain `Headers` object (and most fetch-based proxies) merge multiple
  // Set-Cookie response headers into a single comma-joined string —
  // getSetCookie() is the one API that still exposes each one separately.
  // Losing that separation here would have silently mangled both the
  // accessToken and refreshToken cookies (this endpoint always sets both
  // at once) into one broken value.
  for (const cookie of backendRes.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
