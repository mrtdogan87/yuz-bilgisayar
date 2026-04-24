import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  setPassword,
  hasPassword,
  setSessionCookie,
  clearSessionCookie,
  createSession,
  destroyCurrentSession,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { action, password, newPassword } = await req.json();
  const ua = req.headers.get("user-agent") ?? undefined;

  if (action === "login") {
    const passwordExists = await hasPassword();
    if (!passwordExists) {
      if (!password || password.length < 6) {
        return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır." }, { status: 400 });
      }
      await setPassword(password);
      const token = createSession(ua);
      const res = NextResponse.json({ ok: true, firstSetup: true });
      setSessionCookie(res, token);
      return res;
    }
    const ok = await verifyPassword(password);
    if (!ok) return NextResponse.json({ error: "Hatalı şifre." }, { status: 401 });
    const token = createSession(ua);
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    return res;
  }

  if (action === "logout") {
    await destroyCurrentSession();
    const res = NextResponse.json({ ok: true });
    clearSessionCookie(res);
    return res;
  }

  if (action === "change-password") {
    const ok = await verifyPassword(password);
    if (!ok) return NextResponse.json({ error: "Mevcut şifre hatalı." }, { status: 401 });
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Yeni şifre en az 6 karakter olmalıdır." }, { status: 400 });
    }
    await setPassword(newPassword);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
}

export async function GET() {
  const passwordExists = await hasPassword();
  return NextResponse.json({ hasPassword: passwordExists });
}
