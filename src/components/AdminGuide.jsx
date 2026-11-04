import { HelpCircle } from 'lucide-react';

export default function AdminGuide() {
  return (
    <div className="card fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--card-padding, 3rem)', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
      <h2 className="jua text-main" style={{ fontSize: '1.8rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <HelpCircle size={32} color="var(--accent)" /> 스마트 출석부 관리자 가이드
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: 1.6, color: 'var(--text-main)', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
        
        <section>
          <h3 className="font-bold text-accent" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>1. 실시간 관제 및 출결 수정 (구글 시트형)</h3>
          <p className="text-muted">
            대시보드 상단의 <b>[조회 일자]</b>를 변경하면 과거의 출결 기록을 볼 수 있습니다.<br/>
            표에 있는 🟢🔴🟡 동그라미를 <b>클릭</b>하면 강제로 출결 상태(정상/결석/자율출석/지정석미도래 등)를 수정할 수 있습니다.<br/>
            당일(오늘) 조회 시에는 '상태' 글자(입실중/외출중)를 클릭해 학생을 강제 퇴실(자리 반납) 시킬 수 있습니다.
          </p>
        </section>

        <section>
          <h3 className="font-bold text-accent" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>2. 좌석 배치 및 자석(Snap) 기능</h3>
          <p className="text-muted">
            [좌석 도면 배치] 메뉴에서 좌석을 마우스로 드래그하면 <b>20px 단위로 눈금에 맞춰 예쁘게 정렬</b>됩니다.<br/>
            우측의 <b>[자동 배치 생성]</b>을 이용하면 교실 전체 자리를 1초 만에 깔끔한 바둑판 배열로 만들 수 있습니다.<br/>
            추가된 빈자리를 지우고 싶다면 좌석을 <b>더블클릭</b> 하세요.
          </p>
        </section>

        <section>
          <h3 className="font-bold text-accent" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>3. 월간 출결 통계 확인</h3>
          <p className="text-muted">
            [월간 출결 현황] 메뉴에서 1주차, 2주차 탭을 눌러 학생들의 일별 출석 현황을 확인하세요.<br/>
            표에 표시된 동그라미를 <b>클릭</b>하면, 그날 몇 교시에 출석/결석했는지 상세 내역 팝업을 볼 수 있습니다.
          </p>
        </section>

        <section>
          <h3 className="font-bold text-accent" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>4. 엑셀 연동 (학생 명단 & 감독 교사)</h3>
          <p className="text-muted">
            <b>[학생 명단 관리]</b> 탭에서 양식을 다운받아 평일/주말 자습 시간표를 엑셀로 한 번에 업로드할 수 있습니다.<br/>
            <b>[감독 교사 명단]</b> 탭에서도 마찬가지로 한 달 치 감독 교사 일정을 엑셀로 일괄 업로드 가능하며, 실제 감독 횟수는 자동으로 카운트됩니다.
          </p>
        </section>
        
      </div>
    </div>
  );
}
