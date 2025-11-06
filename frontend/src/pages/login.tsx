import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/trex-logo.png";
import { login } from "@/lib/auth";

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
      nav("/", { replace: true }); // başarıyla dashboard’a
    } catch (err: any) {
      // FastAPI genelde {"detail":"Invalid credentials"} döner
      const msg = err?.message || "Giriş başarısız.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-page">
      {/* brand-pro bloğu (senin son halin) */}
      <header className="brand-pro" aria-label="Trex ürün kimliği">
        <span className="brand-mark"><span className="mark-glass"><img src={logo} alt="" /></span></span>
        <div className="brand-text">
          <div className="brand-name">Trex</div>
          <div className="brand-sub">Project &amp; Operations Console</div>
        </div>
      </header>
      <div className="brand-sep" />

      <div className="card">
        <h1 className="title">Giriş Yap</h1>
        <p className="subtitle">Hesabınıza erişmek için bilgilerinizi girin</p>

        {error && <div className="error">{error}</div>}

        <form className="form" onSubmit={onSubmit}>
          {/* Email */}
          <div className="field">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div className="field">
            <label className="label">Şifre</label>
            <div style={{ position: "relative" }}>
              <input
                className="input has-icon"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-icon"
                aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
                onClick={() => setShow((v) => !v)}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path fill="currentColor" d="M12 5c5 0 9 5 9 7s-4 7-9 7-9-5-9-7 4-7 9-7zm0 3a4 4 0 100 8 4 4 0 000-8z"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="row-sm">
            <label className="checkbox">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Beni hatırla
            </label>
            <a className="link" href="#">Şifremi unuttum</a>
          </div>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          <div className="foot">
            Kuruma yeni mi katıldın? <a href="#">Erişim iste</a>
          </div>
        </form>
      </div>
    </div>
  );
}