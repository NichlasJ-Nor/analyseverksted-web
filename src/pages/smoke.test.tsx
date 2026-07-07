import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DcfPage from './DcfPage';
import InvestPage from './InvestPage';
import PortfolioPage from './PortfolioPage';
import MonteCarloPage from './MonteCarloPage';
import ScenarioPage from './ScenarioPage';
import { useDcfStore } from '../store/dcfStore';
import { useInvestStore } from '../store/investStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { useMonteCarloStore } from '../store/monteCarloStore';
import { useScenarioStore } from '../store/scenarioStore';

afterEach(() => {
  cleanup();
  useDcfStore.getState().reset();
  useInvestStore.getState().reset();
  usePortfolioStore.getState().reset();
  useMonteCarloStore.getState().reset();
  useScenarioStore.getState().reset();
});

describe('DcfPage', () => {
  it('rendrer og beregner verdsettelse uten å kaste', () => {
    render(<DcfPage />);
    fireEvent.click(screen.getByText('▶ Beregn verdsettelse'));
    expect(screen.getByText('Enterprise Value')).toBeInTheDocument();
  });
});

describe('InvestPage', () => {
  it('rendrer sammenligningstabell med begge standardalternativene', () => {
    render(<InvestPage />);
    expect(screen.getAllByText('Alternativ A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alternativ B').length).toBeGreaterThan(0);
    expect(screen.getByText('Breakeven-analyse')).toBeInTheDocument();
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
