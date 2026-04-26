import { useEffect, useState, useRef } from "react";
import { api, uploadFile, ImageItem, User } from "./api";

type Mode = "login" | "register";

function AuthScreen({ onAuthed }: { onAuthed: (u: User) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const fn = mode === "login" ? api.login : api.register;
      const { token, user } = await fn(email, password);
      localStorage.setItem("token", token);
      onAuthed(user);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {err && <div className="error">{err}</div>}
        <button type="submit" disabled={busy}>
          {busy ? "..." : mode === "login" ? "Sign in" : "Register"}
        </button>
      </form>
      <button
        className="ghost"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
      </button>
    </div>
  );
}

function Gallery({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const { images } = await api.list();
      setImages(images);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      await uploadFile(file);
      await refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="container">
      <div className="row">
        <h1>Image Vault</h1>
        <div>
          <span style={{ marginRight: 12 }}>{user.email}</span>
          <button className="ghost" style={{ width: "auto" }} onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
      <div className="uploader">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={onFileChange}
          disabled={busy}
        />
        {busy && <div>Uploading…</div>}
      </div>
      {err && <div className="error">{err}</div>}
      <div className="gallery">
        {images.map((img) => (
          <img key={img.id} src={img.url} alt="" />
        ))}
        {images.length === 0 && <div>No images yet — upload your first one.</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  if (loading) return <div className="container">Loading…</div>;
  if (!user) return <AuthScreen onAuthed={setUser} />;
  return <Gallery user={user} onLogout={logout} />;
}
