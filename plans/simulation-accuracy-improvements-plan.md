## Plan: Simulation Accuracy & Realism Improvements

종합적인 시뮬레이션 정확성 개선: Codex 검토 결과 기반으로 수학적 버그 수정, 현실성 강화, 통계적 방법론 업그레이드, 데이터 품질 개선을 진행합니다. 4가지 우선순위를 체계적으로 구현하여 시뮬레이터의 신뢰성과 정확성을 대폭 향상시킵니다.

**Phases (10 phases)**

1. **Phase 1: Test Infrastructure Setup**
    - **Objective:** 계산 정확성 검증을 위한 테스트 인프라 구축
    - **Files/Functions to Modify/Create:**
        - `tests/calculations.test.js` (신규)
        - `tests/monte-carlo.test.js` (신규)
        - `package.json` (테스트 스크립트 확인/추가)
    - **Tests to Write:**
        - `test_annualPctToMonthlyRate_accuracy`
        - `test_calculateWealth_compound_vs_simple`
        - `test_exchangeRate_adjustment_units`
        - `test_partial_retirement_expense`
        - `test_increasing_loan_schedule`
    - **Steps:**
        1. Vitest 설정 확인 및 테스트 파일 생성
        2. 복리 변환 정확성 테스트 작성 (기하평균 vs 산술평균)
        3. 환율 반영 계산 단위 테스트 작성
        4. 부분 은퇴 시나리오 테스트 작성 (한 사람만 은퇴)
        5. 체증식 대출 고금리 시나리오 테스트 작성
        6. 테스트 실행하여 현재 버그 확인 (Red)

2. **Phase 2: Priority 1A - Rate Conversion Standardization**
    - **Objective:** 복리 계산 불일치 해결 - 모든 월 수익률 변환을 `annualPctToMonthlyRate`로 통일
    - **Files/Functions to Modify/Create:**
        - `src/utils/calculations.js` - `calculateWealth`, `calculateWealthWithMarriage`, `calculateWealthWithMarriageHistorical`
        - `src/constants/assetData.js` - `runSingleSimulation` (포트폴리오 MC)
    - **Tests to Write:**
        - `test_rate_conversion_consistency`
        - `test_long_term_compound_accuracy`
    - **Steps:**
        1. 테스트 작성: 30년 복리 계산에서 두 방법의 차이 검증
        2. `calculateWealth` (L677)의 `annualRate/100/12`를 `annualPctToMonthlyRate(annualRate)` 호출로 변경
        3. `calculateWealthWithMarriage` (L422, L501)의 `person.rate/100/12`를 동일 함수로 변경
        4. `calculateWealthWithMarriageHistorical` (L933, L1011)의 변환도 통일
        5. 포트폴리오 MC의 `yearReturn/100/12`를 `annualPctToMonthlyRate(yearReturn)`로 변경
        6. 주택 상승률, 위기 drawdown도 동일 패턴 적용 여부 검토
        7. 테스트 실행 및 검증 (Green)

3. **Phase 3: Priority 1B - Exchange Rate Bug Fix**
    - **Objective:** 환율 반영 계산 오류 수정 - % 단위 처리 정확성 확보
    - **Files/Functions to Modify/Create:**
        - `src/contexts/SimulatorContext.jsx` - `historicalReturns` 계산 로직
    - **Tests to Write:**
        - `test_exchange_adjusted_returns_unit`
        - `test_exchange_adjusted_mc_results`
    - **Steps:**
        1. 테스트 작성: 환율 변화와 S&P500 수익률 결합 검증
        2. L255의 `(1 + sp500Return)`를 `(1 + sp500Return/100)`로 수정
        3. 또는 sp500Return을 소수로 먼저 변환 후 계산
        4. 복사본 텍스트 (L1047)에서 공식 설명 업데이트
        5. 테스트 실행 및 검증 (Green)

4. **Phase 4: Priority 1C - Partial Retirement Logic Fix**
    - **Objective:** 부분 은퇴 시나리오 생활비 인출 로직 개선
    - **Files/Functions to Modify/Create:**
        - `src/utils/calculations.js` - `calculateWealthWithMarriage` (L583), `calculateWealthWithMarriageHistorical` (L1066)
    - **Tests to Write:**
        - `test_partial_retirement_one_spouse_expense`
        - `test_partial_retirement_both_spouses_sequential`
    - **Steps:**
        1. 테스트 작성: 한 사람 은퇴, 한 사람 근로 시나리오
        2. 은퇴 조건 분기를 개선하여 부분 은퇴도 생활비 고려
        3. `monthlyExpense`를 인당 vs 가구 기준으로 명확히 하고 비례 인출
        4. 테스트 실행 및 검증 (Green)

5. **Phase 5: Priority 1D - Dynamic Loan Growth Cap**
    - **Objective:** 체증식 대출 월 증가율 상한 동적 계산
    - **Files/Functions to Modify/Create:**
        - `src/utils/calculations.js` - `buildIncreasingSchedule` (L276), `getLoanPaymentAtMonth` 캐시 키 (L385)
    - **Tests to Write:**
        - `test_increasing_loan_high_rate_payoff`
        - `test_increasing_loan_long_term_payoff`
    - **Steps:**
        1. 테스트 작성: 고금리(6%) 30년 대출 시나리오
        2. `high` 상한을 0.02에서 동적으로 계산 (예: 0.05 또는 수렴까지 증가)
        3. 또는 이진탐색 반복 횟수 증가 (40 → 60)
        4. 캐시 키에 상환방식 포함 확인
        5. 테스트 실행 및 검증 (Green)

6. **Phase 6: Priority 2 - Realism Features (Tax, Fees, Inflation)**
    - **Objective:** 현실성 강화 - 세금, 거래비용, 인플레이션 반영 확장
    - **Files/Functions to Modify/Create:**
        - `src/constants/defaults.js` - 세금/수수료/인플레 기본값 추가
        - `src/contexts/SimulatorContext.jsx` - 상태 및 옵션 추가
        - `src/components/views/ProfileView.jsx` 또는 새 설정 섹션 - UI 입력
        - `src/utils/calculations.js` - 모든 계산 함수에 세금/수수료 적용
    - **Tests to Write:**
        - `test_dividend_tax_15_4_percent`
        - `test_capital_gains_tax_on_withdrawal`
        - `test_expense_ratio_annual_drag`
        - `test_salary_inflation_adjustment`
    - **Steps:**
        1. 테스트 작성: 세금/수수료가 장기 수익률에 미치는 영향
        2. defaults.js에 `taxOptions: { dividendTax: 15.4, capitalGainsTax: 22, expenseRatio: 0.1 }` 추가
        3. SimulatorContext에 세금/수수료 상태 추가
        4. UI에 "고급 설정" 섹션 추가 (세금/수수료 토글 및 입력)
        5. `calculateWealth` 등에서 배당세 연간 적용, 인출 시 양도세 적용
        6. 포트폴리오에서 자산별 expense ratio 차감
        7. 인플레이션을 급여(`monthlyGrowthRate`를 명목으로, 별도 실질 성장률 추가)와 생활비에 모두 적용
        8. 테스트 실행 및 검증 (Green)

7. **Phase 7: Priority 3A - Block Bootstrap & Path-based Bankruptcy**
    - **Objective:** 몬테카를로 통계 개선 - 블록 부트스트랩 및 경로 기반 파산확률
    - **Files/Functions to Modify/Create:**
        - `src/utils/calculations.js` - `runMonteCarloPlan`, `runMonteCarloAccumulation`
        - `src/contexts/SimulatorContext.jsx` - MC 옵션에 블록 부트스트랩 토글 추가
    - **Tests to Write:**
        - `test_block_bootstrap_sequence_length`
        - `test_path_bankruptcy_detection`
        - `test_bankruptcy_rate_vs_endpoint_only`
    - **Steps:**
        1. 테스트 작성: 블록 샘플링이 연속성을 유지하는지 확인
        2. `runMonteCarloPlan`에 블록 부트스트랩 옵션 추가 (3-5년 블록 랜덤 선택)
        3. 각 시뮬레이션에서 `yearlyData`를 추적하며 중간에 wealth < 0 발생 시 파산 카운트
        4. `belowZeroPathProbability` 추가 반환
        5. UI에 블록 부트스트랩 토글 추가
        6. 테스트 실행 및 검증 (Green)

8. **Phase 8: Priority 3B - Fat-tail Distribution & Sample Increase**
    - **Objective:** Fat tail 분포 옵션 및 샘플 수 증가
    - **Files/Functions to Modify/Create:**
        - `src/constants/assetData.js` - Student-t 분포 생성 함수 추가
        - `src/contexts/SimulatorContext.jsx` - MC 기본값 2000 → 5000, 최대 10000
        - `src/components/views/MonteCarloView.jsx` - 분포 선택 UI
    - **Tests to Write:**
        - `test_student_t_tail_probability`
        - `test_mc_10k_performance`
    - **Steps:**
        1. 테스트 작성: Student-t 분포가 극단값을 더 자주 생성하는지 확인
        2. `randomStudentT(df=5)` 함수 추가 (Box-Muller + Chi-square 근사)
        3. 포트폴리오 MC에 분포 선택 옵션 추가 (Normal vs Student-t)
        4. S&P500 MC 기본 반복 수를 5000으로 증가, UI에서 최대 10000 허용
        5. 성능 체크 및 로딩 인디케이터 추가
        6. 테스트 실행 및 검증 (Green)

9. **Phase 9: Priority 4 - Data Quality Improvements**
    - **Objective:** 데이터 출처 명시, SCHD/BND 확장, 단위 문서화
    - **Files/Functions to Modify/Create:**
        - `src/constants/sp500History.js` - 출처 주석 추가
        - `src/constants/exchangeHistory.js` - 출처 주석 추가
        - `src/constants/assetData.js` - SCHD/BND 프록시 데이터 추가, 출처 명시
        - `README.md` - 데이터 출처 섹션 추가
        - `src/utils/calculations.js` - 단위 변환 함수 명칭 및 주석 개선
    - **Tests to Write:**
        - `test_data_sources_documented`
        - `test_unit_conversion_consistency`
    - **Steps:**
        1. 테스트 작성: 데이터 주석 존재 여부, 단위 변환 일관성
        2. sp500History.js 상단에 "출처: S&P500 Total Return, Yahoo Finance, 2024-12-31 기준" 추가
        3. exchangeHistory.js에 "출처: 한국은행 경제통계시스템, 연평균 환율" 추가
        4. assetData.js에 SCHD는 배당주 지수로 2000년부터 역산, BND는 채권 지수로 1990년부터 역산
        5. README.md에 "## 데이터 출처" 섹션 추가
        6. calculations.js에 모든 % → 소수 변환에 명확한 주석
        7. 테스트 실행 및 검증 (Green)

10. **Phase 10: Integration & Documentation**
    - **Objective:** 전체 통합 테스트 및 문서화
    - **Files/Functions to Modify/Create:**
        - `tests/integration.test.js` (신규) - 전체 시나리오 테스트
        - `CHANGELOG.md` - 개선 내역 추가
        - `README.md` - 계산 방법론 섹션 추가
        - `AGENTS.md` - 업데이트
    - **Tests to Write:**
        - `test_full_scenario_30year_marriage_retirement`
        - `test_mc_with_all_features_enabled`
    - **Steps:**
        1. 통합 테스트 작성: 모든 기능 활성화 시나리오
        2. 전체 테스트 스위트 실행 및 검증
        3. CHANGELOG.md에 모든 개선사항 정리
        4. README.md에 "계산 방법론" 섹션 추가 (복리, MC, 세금 등)
        5. AGENTS.md에 새로운 옵션 및 테스트 정보 업데이트
        6. 수동 시나리오 테스트 (UI에서 세금/블록MC/fat-tail 사용)
        7. npm run lint 실행
        8. 최종 검증

**Open Questions (6 questions)**
1. `annualPctToMonthlyRate`를 시장 수익률 외에 주택 상승률, 위기 drawdown, 은퇴 성장률에도 적용? → 일관성을 위해 모두 적용 권장
2. 환율 조정 수익률을 % vs 소수 중 어느 단위로 통일? → 내부는 소수, 표시는 % 권장
3. `monthlyExpense`가 인당 vs 가구 단위? → UI 명확화 필요 (기본: 가구 단위, 은퇴 시 비례 배분)
4. 체증식 대출 성장률 상한을 사용자 설정? → 자동 계산 권장 (고급 옵션으로 오버라이드 가능)
5. 세금 범위: 배당만 vs 실현 이익? 연간 vs 인출 시? → 배당은 매년, 양도세는 인출/리밸런싱 시 권장
6. 블록 부트스트랩 길이 고정 vs 랜덤(3-5년)? → 랜덤 3-5년 권장 (더 현실적)
