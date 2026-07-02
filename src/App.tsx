import './components/ui.css';
import DcfPage from './pages/DcfPage';

function App() {
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
      <DcfPage />
    </div>
  );
}

export default App;
