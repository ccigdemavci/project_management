import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveToken } from "@/lib/auth";
import logo from "@/assets/trex-logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@trex.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null); // şimdilik kullanılmıyor

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // --- MOCK LOGIN ---
    // Backend’e istek atmıyoruz. Sahte bir token üretip kaydediyoruz.
    // ProtectedRoute sadece "token var mı?" diye baktığı için yeterli.
    const dummyToken = `dev.${btoa(email)}.${Date.now()}`;
    saveToken(dummyToken);

    // Direkt Dashboard’a yönlendir
    navigate("/", { replace: true });
    setLoading(false);
  }

  return (
    <div className="center-page">
      <img src={logo} alt="Trex Logo" className="logo-top" />

      <div className="card">
        <div className="title">Trex • Giriş</div>
        <div className="subtitle">Hesabınıza erişmek için giriş yapın</div>

        <form className="form" onSubmit={handleSubmit}>
          <div>
            <div className="label">Email</div>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="you@trex.com"
              required
            />
          </div>

          <div>
            <div className="label">Şifre</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}