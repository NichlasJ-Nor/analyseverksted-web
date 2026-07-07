import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DcfPage from './DcfPage';
import InvestPage from './InvestPage';
import PortfolioPage from './PortfolioPage';
import MonteCarloPage from './MonteCarloPage';
import ScenarioPage from './ScenarioPage';
import HomePage from './HomePage';
import { useDcfStore } from '../store/dcfStore';
import { useInvestStore } from '../store/investStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { useMonteCarloStore } from '../store/monteCarloStore';
import { useScenarioStore } from '../store/scenarioStore';
import { useUiStore } from '../store/uiStore';

afterEach(() => {
  cleanup();
  useDcfStore.getState().reset();
  useInvestStore.getState().reset();
  usePortfolioStore.getState().reset();
  useMonteCarloStore.getState().reset();
  useScenarioStore.getState().reset();
  useUiStore.getState().setTool('dcf');
});

describe('HomePage', () => {
  it('rendrer dashboard-kort for DCF, Invest, Portefolje og Scenario uten a kaste', () => {
    render(<HomePage />);
    expect(screen.getByText('Analyseresultater')).toBeInTheDocument();
    expect(screen.getByText('Verdsettelse / DCF')).toBeInTheDocument();
    expect(screen.getByText('Investeringsanalyse')).toBeInTheDocument();
    expect(screen.getByText('Prosjektportefølje')).toBeInTheDocument();
    expect(screen.getByText('Scenarioanalyse')).toBeInTheDocument();
  });

  it('bytter fane ved klikk pa et kort', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByText('Verdsettelse / DCF'));
    expect(useUiStore.getState().tool).toBe('dcf');
  });
});

describe('DcfPage', () => {
  it('rendrer og beregner verdsettelse uten å kaste', () => {
    render(<DcfPage />);
    fireEvent.click(screen.getByText('▶ Beregn verdsettelse'));
    expect(screen.getByText('Enterprise Value')).toBeInTheDocument();
  });

  it('sender EV til Invest og bytter fane', () => {
    render(<DcfPage />);
    fireEvent.click(screen.getByText('▶ Beregn verdsettelse'));
    fireEvent.click(screen.getByText('→ Send EV til Invest (I₀)'));
    expect(useUiStore.getState().tool).toBe('invest');
    expect(useInvestStore.getState().alternatives[0].i0).toBeGreaterThan(0);
  });

  it('synker til Scenarioanalyse og bytter fane', () => {
    render(<DcfPage />);
    fireEvent.click(screen.getByText('▶ Beregn verdsettelse'));
    fireEvent.click(screen.getByText('→ Synk til Scenarioanalyse'));
    expect(useUiStore.getState().tool).toBe('scenario');
    expect(useScenarioStore.getState().base.fcfs.length).toBe(useDcfStore.getState().years.length);
  });

  it('kjører Monte Carlo på DCF-modellen uten å kaste', () => {
    render(<DcfPage />);
    fireEvent.click(screen.getByText('▶ Beregn verdsettelse'));
    fireEvent.click(screen.getByText(/Monte Carlo på DCF-modellen/));
    fireEvent.click(screen.getByText(/Kjør .* simuleringer/));
  });
});

describe('InvestPage', () => {
  it('rendrer sammenligningstabell med begge standardalternativene', () => {
    render(<InvestPage />);
    expect(screen.getAllByText('Alternativ A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alternativ B').length).toBeGreaterThan(0);
    expect(screen.getByText('Breakeven-analyse')).toBeInTheDocument();
  });

  it('sender et alternativ til Portefølje og bytter fane', () => {
    render(<InvestPage />);
    const before = usePortfolioStore.getState().projects.length;
    fireEvent.click(screen.getAllByText('→ Portefølje')[0]);
    expect(useUiStore.getState().tool).toBe('portfolio');
    expect(usePortfolioStore.getState().projects.length).toBe(before + 1);
  });
});

describe('PortfolioPage', () => {
  it('rendrer rangeringstabell med standardprosjekter', () => {
    render(<PortfolioPage />);
    expect(screen.getByText('Total portefølje-NPV')).toBeInTheDocument();
    expect(screen.getByText('Risikojustert rangering (CAPM)')).toBeInTheDocument();
  });
});

describe('MonteCarloPage', () => {
  it('kjører simulering uten å kaste og viser persentiler', () => {
    render(<MonteCarloPage />);
    fireEvent.click(screen.getByText(/Kjør .* simuleringer/));
  });
});

describe('ScenarioPage', () => {
  it('rendrer alle tre scenarioer og EV-stat-kort', () => {
    render(<ScenarioPage />);
    expect(screen.getByText('BEAR')).toBeInTheDocument();
    expect(screen.getByText('BASE')).toBeInTheDocument();
    expect(screen.getByText('BULL')).toBeInTheDocument();
  });
});
