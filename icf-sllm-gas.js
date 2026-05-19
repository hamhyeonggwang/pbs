/**
 * ICF-LM 웹앱 스프레드시트 연동
 * Google Apps Script (Code.gs)
 * ──────────────────────────────────────────────
 * 사용법:
 *  1. Google Sheets 새 파일 생성
 *  2. 확장 프로그램 → Apps Script 열기
 *  3. 이 코드 전체 붙여넣기
 *  4. 배포 → 새 배포 → 웹 앱
 *     - 실행 계정: 나
 *     - 액세스 권한: 모든 사용자 (또는 조직 내)
 *  5. 배포 URL을 웹앱 오른쪽 패널에 입력
 * ──────────────────────────────────────────────
 */

const SHEET_NAME_CLASSIFY  = '분류결과';
const SHEET_NAME_FEEDBACK  = '피드백';
const SHEET_NAME_LOG       = '접속로그';

/* ── CORS 허용 응답 헬퍼 ── */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── GET: 헬스체크 ── */
function doGet(e) {
  return jsonResponse({ status: 'ok', service: 'ICF-LM Sheets Connector', version: '1.0' });
}

/* ── POST: 데이터 수신 ── */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    // 피드백 기록
    if (data.type === 'feedback') {
      saveFeedback(ss, data);
      return jsonResponse({ status: 'ok', saved: 'feedback' });
    }

    // 분류 결과 기록 (기본)
    saveClassification(ss, data);
    return jsonResponse({ status: 'ok', saved: 'classification' });

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

/* ── 분류 결과 저장 ── */
function saveClassification(ss, data) {
  let sheet = ss.getSheetByName(SHEET_NAME_CLASSIFY);

  // 시트 없으면 생성 + 헤더
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_CLASSIFY);
    const headers = [
      '저장일시',
      '세션ID',
      '입력 임상 언어',
      '분류 코드 (1순위)',
      '분류 코드 (2순위)',
      '분류 코드 (3순위)',
      '분류 코드 (4순위)',
      '전체 코드 목록',
      '분류 신뢰도',
      '모델 버전',
      '연구자',
      '피드백',
      '비고'
    ];
    sheet.appendRow(headers);
    // 헤더 스타일
    const hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setBackground('#cc6b2e');
    hRange.setFontColor('#ffffff');
    hRange.setFontWeight('bold');
    hRange.setFontSize(10);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(3, 320); // 임상 언어 열 넓게
  }

  const codes = Array.isArray(data.codes) ? data.codes : [];
  const row = [
    formatDate(data.timestamp),     // 저장일시
    data.session_id || '',          // 세션ID
    data.input_text  || '',         // 입력 임상 언어
    codes[0] || '',                 // 코드 1순위
    codes[1] || '',                 // 코드 2순위
    codes[2] || '',                 // 코드 3순위
    codes[3] || '',                 // 코드 4순위
    codes.join(', '),               // 전체 코드
    data.confidence  || '',         // 신뢰도
    data.model       || '',         // 모델 버전
    data.researcher  || '',         // 연구자
    data.feedback    || '대기',     // 피드백
    ''                              // 비고 (수동 입력용)
  ];
  sheet.appendRow(row);

  // 데이터 행 스타일 (짝수/홀수 구분)
  const lastRow = sheet.getLastRow();
  const rowRange = sheet.getRange(lastRow, 1, 1, row.length);
  rowRange.setFontSize(10);
  if (lastRow % 2 === 0) {
    rowRange.setBackground('#faf9f7');
  }
}

/* ── 피드백 저장 ── */
function saveFeedback(ss, data) {
  let sheet = ss.getSheetByName(SHEET_NAME_FEEDBACK);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_FEEDBACK);
    const headers = ['저장일시', '피드백 유형', '세션ID', '비고'];
    sheet.appendRow(headers);
    const hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setBackground('#2f6fd4');
    hRange.setFontColor('#ffffff');
    hRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    formatDate(data.timestamp),
    data.feedback || '',
    data.session_id || '',
    ''
  ]);
}

/* ── 날짜 포맷 ── */
function formatDate(isoStr) {
  if (!isoStr) return new Date().toLocaleString('ko-KR');
  try {
    const d = new Date(isoStr);
    return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  } catch(_) {
    return isoStr;
  }
}
