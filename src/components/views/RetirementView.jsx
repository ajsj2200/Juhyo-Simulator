import { useSimulator } from '../../contexts/SimulatorContext';
import { RetirementPlanSection } from '../index';

const RetirementView = () => {
  const { retirementPlan, setRetirementPlan, you, years } = useSimulator();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">은퇴 계획</h1>
        <p className="text-body">은퇴 시기와 생활비를 설정하세요.</p>
      </div>

      <RetirementPlanSection
        retirementPlan={retirementPlan}
        setRetirementPlan={setRetirementPlan}
        you={you}
        years={years}
      />
    </div>
  );
};

export default RetirementView;
