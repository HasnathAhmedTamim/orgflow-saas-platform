import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM =
  process.env.API_PROXY_TARGET?.replace(/\/$/, '') ||
  'https://orgflow-saas-platform.onrender.com';

type RouteCtx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  const target = `${UPSTREAM}/api/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  const cookie = req.headers.get('cookie');
  const accept = req.headers.get('accept');
  if (contentType) headers.set('content-type', contentType);
  if (cookie) headers.set('cookie', cookie);
  if (accept) headers.set('accept', accept);
  // So Express CORS / logs see the real browser origin when needed
  const origin = req.headers.get('origin');
  if (origin) headers.set('origin', origin);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const out = new Headers();

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'transfer-encoding' ||
      lower === 'connection' ||
      lower === 'keep-alive' ||
      lower === 'content-encoding'
    ) {
      return;
    }
    if (lower === 'set-cookie') return;
    out.set(key, value);
  });

  // Preserve multiple Set-Cookie headers (auth access + refresh)
  const getSetCookie = upstream.headers.getSetCookie?.bind(upstream.headers);
  if (getSetCookie) {
    for (const cookieHeader of getSetCookie()) {
      out.append('set-cookie', cookieHeader);
    }
  } else {
    const single = upstream.headers.get('set-cookie');
    if (single) out.append('set-cookie', single);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
