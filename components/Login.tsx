"use client";

import { FormEvent, useState } from "react";
import { Gauge, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) setMessage("Não foi possível entrar. Confirma o email e a palavra-passe.");
    setLoading(false);
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">
          <Gauge size={36} />
        </div>
        <div className="brand-title">
          <strong>3Volution</strong><span>Turbos</span>
        </div>
        <p className="muted">Gestão de oficina</p>

        <form onSubmit={signIn} className="stack">
          <label>
            Email
            <div className="input-icon">
              <Mail size={18} />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="oficina@exemplo.pt"
              />
            </div>
          </label>

          <label>
            Palavra-passe
            <div className="input-icon">
              <LockKeyhole size={18} />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </label>

          {message && <p className="error-text">{message}</p>}

          <button className="primary-button" disabled={loading}>
            {loading ? "A entrar..." : "Entrar"}
          </button>
        </form>

        <p className="login-help">
          Os utilizadores são criados no Supabase → Authentication → Users.
        </p>
      </section>
    </main>
  );
}
