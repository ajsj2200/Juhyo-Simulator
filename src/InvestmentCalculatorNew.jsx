import { SimulatorProvider, useSimulator } from './contexts/SimulatorContext';
import { AppLayout } from './components/layout';
import {
  DashboardView,
  ResultsView,
  ProfileView,
  ComparisonView,
  MarriageView,
  RetirementView,
  PortfolioView,
  MonteCarloView,
  CrisisView,
  LoanView,
  PresetsView,
  AssetTrackingView,
  AssetSalaryView,
} from './components/views';

const ViewRouter = () => {
  const { activeView } = useSimulator();

  const views = {
    dashboard: DashboardView,
    results: ResultsView,
    profile: ProfileView,
    comparison: ComparisonView,
    marriage: MarriageView,
    retirement: RetirementView,
    portfolio: PortfolioView,
    montecarlo: MonteCarloView,
    crisis: CrisisView,
    loan: LoanView,
    presets: PresetsView,
    assetTracking: AssetTrackingView,
    assetSalary: AssetSalaryView,
  };

  const ViewComponent = views[activeView] || DashboardView;

  return <ViewComponent />;
};

const MainContent = () => {
  const { copyResults } = useSimulator();

  return (
    <AppLayout onCopyResults={copyResults}>
      <ViewRouter />
    </AppLayout>
  );
};

const InvestmentCalculatorNew = () => {
  return (
    <SimulatorProvider>
      <MainContent />
    </SimulatorProvider>
  );
};

export default InvestmentCalculatorNew;
