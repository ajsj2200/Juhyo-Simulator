import { useSimulator } from '../../contexts/SimulatorContext';
import { MarriagePlanSection } from '../index';

const MarriageView = () => {
  const { marriagePlan, setMarriagePlan, you, years } = useSimulator();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">결혼/주택 계획</h1>
        <p className="text-body">결혼과 주택 구매 계획을 설정하세요.</p>
      </div>

      <MarriagePlanSection
        marriagePlan={marriagePlan}
        setMarriagePlan={setMarriagePlan}
        personMonthly={you.monthly}
      />
    </div>
  );
};

export default MarriageView;
