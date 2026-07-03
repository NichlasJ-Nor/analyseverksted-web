import { useState } from 'react';
import { listAnalyses, saveAnalysis, deleteAnalysis, type AnalysisRow } from '../lib/analyses';
import { useAuthStore } from '../store/authStore';

interface SaveBarProps {
  tool: string;
  id: string | null;
  name: string;
  onNameChange: (name: string) => void;
  getState: () => unknown;
  onLoad: (id: string, name: string, state: unknown) => void;
  onNew: () => void;
}

export default function SaveBar({ tool, id, name, onNameChange, getState, onLoad, onNew }: SaveBarProps) {
  const { session, signOut } = useAuthStore();
  const [showList, setShowList] = useState(false);
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setMsg(null);
    try {
      await saveAnalysis(id, name, tool, getState());
      setMsg('Lagret ✓');
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Feil ved lagring');
    }
    setBusy(false);
  }

  async function openList() {
    setBusy(true);
    try {
      setRows(await listAnalyses(tool));
      setShowList(true);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Feil ved henting');
    }
    setBusy(false);
  }

  async function handleDelete(rowId: string) {
    if (!confirm('Slette denne analysen?')) return;
    await deleteAnalysis(rowId);
    setRows((r) => r.filter((x) => x.id !== rowId));
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 32px',
      background: 'var(--s-bar)', borderBottom: '1px solid var(--l-default)', position: 'relative',
    }}>
      <span style={{ fontSize: 12, color: 'var(--t-mid)' }}>Analyse:</span>
      <input value={name} onChange={(e) => onNameChange(e.target.value)}
        style={{
          background: 'transparent', border: 'none', borderBottom: '1px solid var(--l-strong)',
          color: 'var(--t-body)', fontSize: 13, fontWeight: 600, padding: '2px 4px', width: 220,
        }} />
      {msg && <span style={{ fontSize: 12, color: 'var(--acc)' }}>{msg}</span>}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn" disabled={busy} onClick={handleSave}>💾 Lagre</button>
        <button className="btn" disabled={busy} onClick={openList}>📂 Mine analyser</button>
        <button className="btn" onClick={onNew}>+ Ny</button>
        <span style={{ fontSize: 11, color: 'var(--t-faint)', marginLeft: 8 }}>{session?.user.email}</span>
        <button className="btn" onClick={signOut}>Logg ut</button>
      </div>

      {showList && (
        <div style={{
          position: 'absolute', top: '100%', right: 32, background: 'var(--s-card)',
          border: '1px solid var(--l-strong)', borderRadius: 10, padding: 14, width: 340,
          boxShadow: 'var(--sh-pop)', zIndex: 50,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <b style={{ fontSize: 13 }}>Mine analyser</b>
            <button className="btn" onClick={() => setShowList(false)}>✕</button>
          </div>
          {rows.length === 0 && <p style={{ fontSize: 12, color: 'var(--t-mid)' }}>Ingen lagrede analyser ennå.</p>}
          {rows.map((r) => (
            <div key={r.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 4px', borderBottom: '1px solid var(--l-default)', fontSize: 12,
            }}>
              <div>
                <div style={{ color: 'var(--t-body)' }}>{r.name}</div>
                <div style={{ color: 'var(--t-faint)', fontSize: 10 }}>
                  {new Date(r.updated_at).toLocaleString('no-NO')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn" onClick={() => { onLoad(r.id, r.name, r.state); setShowList(false); }}>Last inn</button>
                <button className="btn" style={{ color: 'var(--neg)', borderColor: 'var(--neg)' }}
                  onClick={() => handleDelete(r.id)}>Slett</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
