/**
 * ══════════════════════════════════════════════════════════════
 *  PBS PEO 초기 평가 — Google Apps Script 연동 코드
 *  대상 시트: 기본정보 및 초기논의 / 분석: PEO / 경과와성과
 *  작성: 작업치료사 자문 시스템 (OT Hub)
 * ══════════════════════════════════════════════════════════════
 *
 *  [설치 방법]
 *  1. 연동할 구글 스프레드시트 열기
 *  2. 확장 프로그램 > Apps Script
 *  3. 이 파일 전체 내용을 붙여넣기 (기존 코드 삭제 후)
 *  4. 저장(Ctrl+S) 후 '배포' > '새 배포' 클릭
 *  5. 종류: 웹 앱 / 실행 계정: 본인 / 액세스: 모든 사용자
 *  6. 배포 후 나타나는 웹 앱 URL을 복사
 *  7. 웹앱 HTML의 GAS_URL 변수에 붙여넣기
 * ══════════════════════════════════════════════════════════════
 */

const SPREADSHEET_ID = '11hi-pCDNo275nhFTfx4paKijdkTQm_ot8VcZUm8CZ9c';

// ── 시트 이름 상수 ──────────────────────────────────────────
const SHEET = {
  INFO:    '기본정보 및 초기논의',
  PEO:     '분석: PEO',
  PROGRESS:'경과와성과',
  PROFILE: '평가: O-P',
};

// ── CORS 헤더 ────────────────────────────────────────────────
function setCors(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
}

// ── 진입점: GET (상태 확인 / 기존 데이터 로드) ───────────────
function doGet(e) {
  const action = e.parameter.action || 'ping';

  if (action === 'ping') {
    return setCors(ContentService.createTextOutput(
      JSON.stringify({ status: 'ok', message: 'PBS PEO GAS 연동 정상', ts: new Date().toISOString() })
    ));
  }

  if (action === 'load') {
    const name = e.parameter.name || '';
    return setCors(ContentService.createTextOutput(
      JSON.stringify(loadRecord(name))
    ));
  }

  if (action === 'list') {
    return setCors(ContentService.createTextOutput(
      JSON.stringify(listRecords())
    ));
  }

  return setCors(ContentService.createTextOutput(
    JSON.stringify({ status: 'error', message: '알 수 없는 action' })
  ));
}

// ── 진입점: POST (평가 데이터 저장) ─────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action || 'save';

    if (action === 'save') {
      const result = saveAssessment(payload.data);
      return setCors(ContentService.createTextOutput(
        JSON.stringify({ status: 'ok', message: '저장 완료', detail: result })
      ));
    }

    return setCors(ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: '알 수 없는 action' })
    ));

  } catch (err) {
    return setCors(ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: err.toString() })
    ));
  }
}

// ════════════════════════════════════════════════════════════
//  핵심 저장 함수
// ════════════════════════════════════════════════════════════
function saveAssessment(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const results = [];

  results.push(writeBasicInfo(ss, data));
  results.push(writePEO(ss, data));
  results.push(writeProgress(ss, data));

  return results;
}

// ── 1. 기본정보 및 초기논의 시트 ────────────────────────────
function writeBasicInfo(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET.INFO);
  const ts    = new Date().toLocaleDateString('ko-KR');
  const child = data.child || {};
  const ref   = data.referral || {};
  const fit   = data.peoFit || {};
  const sum   = data.summary || {};

  // ── 헤더 행이 없으면 생성 ──
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '기록일', '이름(이니셜)', '생년월일', '학년', '배치유형', '진단명',
      '의뢰배경', '주요행동', '행동발생시간', '행동발생장소',
      'P-E Fit', 'P-O Fit', 'E-O Fit', '종합Fit',
      'OT자문요약', 'OT행동해석', 'OT제언', '추가평가필요', '후속조치',
      '평가자', '자격',
    ]);
    sheet.getRange(1, 1, 1, 21).setFontWeight('bold')
         .setBackground('#e0f7f2').setFontColor('#054d38');
    sheet.setFrozenRows(1);
  }

  // ── 같은 이름 기존 행 찾기 → 덮어쓰기 or 신규 추가 ──
  const existingRow = findRowByName(sheet, child.name, 2);
  const rowData = [
    ts,
    child.name        || '',
    child.dob         || '',
    child.grade       || '',
    child.placement   || '',
    child.diagnosis   || '',
    ref.background    || '',
    ref.targetBehavior|| '',
    ref.time          || '',
    ref.place         || '',
    fit.pe            || '',
    fit.po            || '',
    fit.eo            || '',
    fit.pe && fit.po && fit.eo
      ? ((Number(fit.pe)+Number(fit.po)+Number(fit.eo))/3).toFixed(1)
      : '',
    sum.envSummary      || '',
    sum.interpretation  || '',
    sum.recommendation  || '',
    sum.furtherEval     || '',
    sum.followUp        || '',
    sum.evaluatorName   || '',
    sum.evaluatorCred   || '',
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    return { sheet: SHEET.INFO, action: '업데이트', row: existingRow };
  } else {
    sheet.appendRow(rowData);
    return { sheet: SHEET.INFO, action: '신규추가', row: sheet.getLastRow() };
  }
}

// ── 2. 분석: PEO 시트 ────────────────────────────────────────
function writePEO(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET.PEO);
  const child = data.child || {};
  const env   = data.environment || {};
  const occ   = data.occupation  || {};
  const fit   = data.peoFit      || {};
  const ts    = new Date().toLocaleDateString('ko-KR');

  // ── 헤더 ──
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'PEO 모델', '내용', '분류', '강점/자원', '약점/제한', '비고',
      '기록일', '이름',
    ]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold')
         .setBackground('#fff8ec').setFontColor('#c47d0a');
    sheet.setFrozenRows(1);
  }

  const name = child.name || '';

  // PEO 각 요인을 행으로 기록
  const peoRows = [
    // 개인요인(P)
    ['개인요인(P)', ref_val(data, 'child.diagnosis'), '건강/진단',
     getStrengths(data), ref_val(data, 'referral.targetBehavior'), ref_val(data, 'child.placement'),
     ts, name],

    // 환경요인(E) — 물리
    ['환경요인(E)', ref_val(data, 'environment.physNote'), '물리적 환경',
     ratingToText(env.physRating, '물리'),
     ref_val(data, 'environment.physSuggest'), '',
     ts, name],

    // 환경요인(E) — 사회
    ['환경요인(E)', ref_val(data, 'environment.socialNote'), '사회적 환경',
     ratingToText(env.socialRating, '사회'),
     ref_val(data, 'environment.keySupporter'), ref_val(data, 'environment.teacherTrust'),
     ts, name],

    // 환경요인(E) — 제도
    ['환경요인(E)', ref_val(data, 'environment.instNote'), '제도·문화 환경',
     '', '', '', ts, name],

    // 작업(O)
    ['작업(O)', ref_val(data, 'occupation.antecedent'), 'ABC-선행사건',
     '', ref_val(data, 'occupation.antecedent'), '', ts, name],

    ['작업(O)', ref_val(data, 'occupation.behavior'), 'ABC-행동',
     '', ref_val(data, 'occupation.behavior'), '', ts, name],

    ['작업(O)', ref_val(data, 'occupation.consequence'), 'ABC-결과',
     '', ref_val(data, 'occupation.consequence'), '', ts, name],

    ['작업(O)', ref_val(data, 'occupation.function'), '추정행동기능',
     '', ref_val(data, 'occupation.function'), ref_val(data, 'occupation.functionConfidence'),
     ts, name],
  ];

  // 이름+기록일 조합으로 기존 블록 찾기 → 있으면 삭제 후 재기입
  deleteRowsByName(sheet, name, ts, 2);
  peoRows.forEach(row => sheet.appendRow(row));

  // Fit 점수 별도 블록
  sheet.appendRow(['[PEO Fit]', 'P-E', '', fit.pe || '', '', '', ts, name]);
  sheet.appendRow(['[PEO Fit]', 'P-O', '', fit.po || '', '', '', ts, name]);
  sheet.appendRow(['[PEO Fit]', 'E-O', '', fit.eo || '', '', '', ts, name]);

  return { sheet: SHEET.PEO, action: '기록완료', rows: peoRows.length + 3 };
}

// ── 3. 경과와성과 시트 ───────────────────────────────────────
function writeProgress(ss, data) {
  const sheet = getOrCreateSheet(ss, SHEET.PROGRESS);
  const child = data.child || {};
  const sum   = data.summary || {};
  const fit   = data.peoFit  || {};
  const ts    = new Date().toLocaleDateString('ko-KR');

  // ── 헤더 ──
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '기록일', '이름', '참여/수행 기초선 메모',
      '중재계획(환경중재)', '중재계획(간접중재)', '중재계획(직접중재)',
      '중재진행내용', '후속조치/다음계획',
      'P-E Fit', 'P-O Fit', 'E-O Fit', '종합Fit',
    ]);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold')
         .setBackground('#f2f0ff').setFontColor('#4e42b0');
    sheet.setFrozenRows(1);
  }

  const totalFit = (fit.pe && fit.po && fit.eo)
    ? ((Number(fit.pe)+Number(fit.po)+Number(fit.eo))/3).toFixed(1)
    : '';

  sheet.appendRow([
    ts,
    child.name             || '',
    sum.envSummary         || '',
    sum.recommendation     || '',  // 환경중재
    '',                            // 간접중재 (추후 기입)
    '',                            // 직접중재 (추후 기입)
    sum.interpretation     || '',
    sum.followUp           || '',
    fit.pe  || '',
    fit.po  || '',
    fit.eo  || '',
    totalFit,
  ]);

  return { sheet: SHEET.PROGRESS, action: '신규행추가', row: sheet.getLastRow() };
}

// ════════════════════════════════════════════════════════════
//  로드 함수 (웹앱 → 시트 불러오기)
// ════════════════════════════════════════════════════════════
function loadRecord(name) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET.INFO);
  if (!sheet) return { status: 'error', message: '시트 없음' };

  const data  = sheet.getDataRange().getValues();
  const header= data[0];
  const idx   = findColIndex(header, '이름(이니셜)');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idx] === name) {
      const record = {};
      header.forEach((h, j) => { record[h] = data[i][j]; });
      return { status: 'ok', record };
    }
  }
  return { status: 'not_found', message: '해당 이름의 기록 없음' };
}

function listRecords() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET.INFO);
  if (!sheet || sheet.getLastRow() <= 1)
    return { status: 'ok', records: [] };

  const data   = sheet.getDataRange().getValues();
  const header = data[0];
  const nameIdx= findColIndex(header, '이름(이니셜)');
  const dateIdx= findColIndex(header, '기록일');

  const records = data.slice(1)
    .filter(row => row[nameIdx])
    .map(row => ({ name: row[nameIdx], date: row[dateIdx] }));

  return { status: 'ok', records };
}

// ════════════════════════════════════════════════════════════
//  헬퍼 함수
// ════════════════════════════════════════════════════════════

// 시트 존재 여부 확인 후 없으면 생성
function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

// 이름으로 행 찾기 (헤더 제외, startRow부터)
function findRowByName(sheet, name, startRow) {
  if (!name) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return -1;
  const col1 = sheet.getRange(startRow, 2, lastRow - startRow + 1, 1).getValues();
  for (let i = 0; i < col1.length; i++) {
    if (col1[i][0] === name) return startRow + i;
  }
  return -1;
}

// PEO 시트에서 이름+날짜 블록 삭제
function deleteRowsByName(sheet, name, ts, startRow) {
  if (!name) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;
  const range = sheet.getRange(startRow, 1, lastRow - startRow + 1, 8).getValues();
  // 뒤에서부터 삭제 (인덱스 밀림 방지)
  for (let i = range.length - 1; i >= 0; i--) {
    if (range[i][7] === name && range[i][6] === ts) {
      sheet.deleteRow(startRow + i);
    }
  }
}

// 헤더 배열에서 열 인덱스 찾기
function findColIndex(header, colName) {
  return header.findIndex(h => h === colName);
}

// 중첩 키로 데이터 접근 (예: 'child.name')
function ref_val(data, path) {
  return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : ''), data);
}

// 평점 → 텍스트
function ratingToText(rating, type) {
  if (!rating) return '';
  const map = {
    1: '매우 낮음(방해)',
    2: '낮음',
    3: '중립',
    4: '높음(촉진)',
    5: '매우 높음(촉진)',
  };
  return `${type} 환경 ${map[rating] || rating}점`;
}

// 강점 체크리스트 → 문자열
function getStrengths(data) {
  return (data.strengths && data.strengths.checked)
    ? data.strengths.checked.join(', ')
    : '';
}
