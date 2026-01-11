import { useSimulator } from '../../contexts/SimulatorContext';
import { PortfolioSection } from '../index';

const PortfolioView = () => {
  const { portfolio, setPortfolio, you } = useSimulator();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">포트폴리오</h1>
        <p className="text-body">자산 배분을 설정하세요.</p>
      </div>

      <PortfolioSection
        portfolio={portfolio}
        setPortfolio={setPortfolio}
        you={you}
      />
    </div>
  );
};

export default PortfolioView;
