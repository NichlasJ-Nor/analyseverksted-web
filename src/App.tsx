import { useEffect } from 'react';
import './components/ui.css';
import DcfPage from './pages/DcfPage';
import LoginPage from './pages/LoginPage';
import SaveBar from './components/SaveBar';
import { useAuthStore } from './store/authStore';
import { useDcfStore, getSerializableDcfState, type SerializableDcfState } from './store/dcfStore';

function App() {
  const { session, loading, init } = useAuthStore();
  const dcf = useDcfStore();

  useEffect(() => { init(); }, [init]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-mid)' }}>Laster…</div>;
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div>
      <header style={{
        background: 'var(--s-header)',
        padding: '15px 32px',
        borderBottom: '1px solid rgba(82,235,176,0.45)',
      }}>
        <h1 style={{ fontSize: 17 }}>Analyseverksted</h1>
        <p style={{ fontSize: 11, color: 'var(--t-mid)', marginTop: 2 }}>Sprint Consulting</p>
      </header>
      <SaveBar
        tool="dcf"
        id={dcf.id}
        name={dcf.name}
        onNameChange={dcf.setName}
        getState={() => getSerializableDcfState(dcf)}
        onLoad={(id, name, state) => dcf.loadFromState(id, name, state as SerializableDcfState)}
        onNew={dcf.reset}
      />
      <DcfPage />
    </div>
  );
}

export default App;
