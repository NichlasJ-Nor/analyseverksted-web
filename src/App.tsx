import { useEffect, useState } from 'react';
import './components/ui.css';
import DcfPage from './pages/DcfPage';
import InvestPage from './pages/InvestPage';
import PortfolioPage from './pages/PortfolioPage';
import MonteCarloPage from './pages/MonteCarloPage';
import LoginPage from './pages/LoginPage';
import SaveBar from './components/SaveBar';
import { useAuthStore } from './store/authStore';
import { useDcfStore, getSerializableDcfState, type SerializableDcfState } from './store/dcfStore';
import { useInvestStore, getSerializableInvestState, type SerializableInvestState } from './store/investStore';
import { usePortfolioStore, getSerializablePortfolioState, type SerializablePortfolioState } from './store/portfolioStore';
import { useMonteCarloStore, getSerializableMcState, type SerializableMcState } from './store/monteCarloStore';

type Tool = 'dcf' | 'invest' | 'portfolio' | 'montecarlo';

function App() {
  const { session, loading, init } = useAuthStore();
  const dcf = useDcfStore();
  const inv = useInvestStore();
  const pf = usePortfolioStore();
  const mc = useMonteCarloStore();
  const [tool, setTool] = useState<Tool>('dcf');

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

      <div style={{ display: 'flex', gap: 8, padding: '10px 24px', borderBottom: '1px solid #2e4444' }}>
        <button className="btn" style={tool === 'dcf' ? { color: 'var(--acc)', borderColor: 'var(--acc)' } : {}}
          onClick={() => setTool('dcf')}>DCF / Verdsettelse</button>
        <button className="btn" style={tool === 'invest' ? { color: 'var(--acc)', borderColor: 'var(--acc)' } : {}}
          onClick={() => setTool('invest')}>Investeringsanalyse</button>
        <button className="btn" style={tool === 'portfolio' ? { color: 'var(--acc)', borderColor: 'var(--acc)' } : {}}
          onClick={() => setTool('portfolio')}>Portefølje</button>
        <button className="btn" style={tool === 'montecarlo' ? { color: 'var(--acc)', borderColor: 'var(--acc)' } : {}}
          onClick={() => setTool('montecarlo')}>Monte Carlo</button>
      </div>

      {tool === 'dcf' && (
        <>
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
        </>
      )}

      {tool === 'invest' && (
        <>
          <SaveBar
            tool="invest"
            id={inv.id}
            name={inv.name}
            onNameChange={inv.setName}
            getState={() => getSerializableInvestState(inv)}
            onLoad={(id, name, state) => inv.loadFromState(id, name, state as SerializableInvestState)}
            onNew={inv.reset}
          />
          <InvestPage />
        </>
      )}

      {tool === 'portfolio' && (
        <>
          <SaveBar
            tool="portfolio"
            id={pf.id}
            name={pf.name}
            onNameChange={pf.setName}
            getState={() => getSerializablePortfolioState(pf)}
            onLoad={(id, name, state) => pf.loadFromState(id, name, state as SerializablePortfolioState)}
            onNew={pf.reset}
          />
          <PortfolioPage />
        </>
      )}

      {tool === 'montecarlo' && (
        <>
          <SaveBar
            tool="montecarlo"
            id={mc.id}
            name={mc.name}
            onNameChange={mc.setName}
            getState={() => getSerializableMcState(mc)}
            onLoad={(id, name, state) => mc.loadFromState(id, name, state as SerializableMcState)}
            onNew={mc.reset}
          />
          <MonteCarloPage />
        </>
      )}
    </div>
  );
}

export default App;
