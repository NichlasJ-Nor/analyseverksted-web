import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const { signIn, signUp } = useAuthStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const err = await fn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
    } else if (mode === 'signup') {
      setInfo('Konto opprettet! Sjekk e-posten din for bekreftelseslenke, logg deretter inn.');
      setMode('signin');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: 340 }}>
        <div className="card-title" style={{ justifyContent: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16 }}>Analyseverksted</span>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>E-post</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" />
        </div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Passord</label>
          <input type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
        </div>
        {error && <div style={{ color: 'var(--neg)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        {info && <div style={{ color: 'var(--acc)', fontSize: 12, marginBottom: 12 }}>{info}</div>}
        <button type="submit" className="btn-run" disabled={busy} style={{ width: '100%', marginBottom: 12 }}>
          {busy ? 'Vennligst vent…' : mode === 'signin' ? 'Logg inn' : 'Opprett konto'}
        </button>
        <button type="button" className="btn" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}>
          {mode === 'signin' ? 'Ny bruker? Opprett konto' : 'Har allerede konto? Logg inn'}
        </button>
      </form>
    </div>
  );
}
