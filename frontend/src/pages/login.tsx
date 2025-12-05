import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/trex-logo.png";
import { login } from "@/lib/auth";
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@trex.com");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password, remember);
      nav("/", { replace: true });
    } catch (err: any) {
      const msg = err?.message || "Giriş başarısız.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Decorative Background Elements */}
      <div style={{
        position: "absolute",
        top: "-10%",
        left: "-10%",
        width: "50%",
        height: "50%",
        background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
        filter: "blur(120px)",
        opacity: 0.15,
        borderRadius: "50%"
      }} />
      <div style={{
        position: "absolute",
        bottom: "-10%",
        right: "-10%",
        width: "50%",
        height: "50%",
        background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
        filter: "blur(120px)",
        opacity: 0.1,
        borderRadius: "50%"
      }} />

      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "var(--card)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "24px",
        border: "1px solid var(--border)",
        boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--border) inset",
        padding: "40px",
        position: "relative",
        zIndex: 10,
        margin: "20px"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src={logo}
            alt="Trex Logo"
            style={{
              width: "180px",
              height: "auto",
              objectFit: "contain",
              margin: "0 auto 16px",
              display: "block",
              filter: "drop-shadow(0 4px 12px rgba(34, 197, 94, 0.15))"
            }}
          />
          <h1 style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "var(--text)",
            marginBottom: "8px",
            letterSpacing: "-0.5px"
          }}>
            Tekrar Hoşgeldiniz
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>
            Trex Proje & Operasyon Konsolu
          </p>
        </div>

        {error && (
          <div style={{
            background: "color-mix(in oklab, var(--danger) 10%, transparent)",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            padding: "12px",
            borderRadius: "12px",
            fontSize: "13px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "currentColor" }} />
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "8px" }}>
              Email Adresi
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ornek@sirket.com"
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 42px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "color-mix(in oklab, var(--bg) 50%, transparent)",
                  fontSize: "14px",
                  color: "var(--text)",
                  outline: "none",
                  transition: "all 0.2s"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary)";
                  e.target.style.boxShadow = "0 0 0 3px var(--ring)";
                  e.target.style.background = "var(--bg)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                  e.target.style.background = "color-mix(in oklab, var(--bg) 50%, transparent)";
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>
                Şifre
              </label>
              <a href="#" style={{ fontSize: "12px", color: "var(--primary)", textDecoration: "none", fontWeight: "500" }}>
                Şifremi unuttum?
              </a>
            </div>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 42px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "color-mix(in oklab, var(--bg) 50%, transparent)",
                  fontSize: "14px",
                  color: "var(--text)",
                  outline: "none",
                  transition: "all 0.2s"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary)";
                  e.target.style.boxShadow = "0 0 0 3px var(--ring)";
                  e.target.style.background = "var(--bg)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                  e.target.style.background = "color-mix(in oklab, var(--bg) 50%, transparent)";
                }}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 0,
                  display: "flex"
                }}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "24px", display: "flex", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
              <div style={{
                width: "18px",
                height: "18px",
                borderRadius: "5px",
                border: remember ? "none" : "2px solid var(--border)",
                background: remember ? "var(--primary)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "8px",
                transition: "all 0.2s"
              }}>
                {remember && <CheckCircle2 size={12} color="var(--bg)" />}
              </div>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ display: "none" }}
              />
              <span style={{ fontSize: "13px", color: "var(--muted)" }}>Beni hatırla</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "var(--primary)",
              color: "var(--bg)",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px color-mix(in oklab, var(--primary) 25%, transparent)",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 16px color-mix(in oklab, var(--primary) 35%, transparent)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px color-mix(in oklab, var(--primary) 25%, transparent)";
            }}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "var(--muted)" }}>
            Hesabınız yok mu? <a href="#" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: "600" }}>Yönetici ile iletişime geçin</a>
          </p>
        </div>
      </div>
    </div>
  );
}