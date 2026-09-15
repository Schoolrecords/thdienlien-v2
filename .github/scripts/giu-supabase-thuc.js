// ============================================================
// giu-supabase-thuc.js — ROBOT GIỮ CHO CSDL CÁC TRƯỜNG KHỎI NGỦ
//
// Supabase gói miễn phí cho dự án NGỦ khi lâu không có hoạt động. Tệp này chạy
// tự động trên GitHub Actions MỖI NGÀY, gửi tới mỗi trường vài truy vấn nhẹ.
//
// ⚠️ ROBOT CHỈ GIỮ CHO KHỎI NGỦ, KHÔNG ĐÁNH THỨC ĐƯỢC.
//    Dự án đã ngủ rồi thì bắt buộc người có tài khoản vào Supabase bấm
//    "Resume project" — Supabase không mở đường tự động cho việc này.
//    Ngủ quá lâu là không Resume được nữa, chỉ còn tải bản sao lưu.
//
// 🔴 BÀI HỌC 15/9/2026 — bản cũ (3 ngày/lần, MỘT truy vấn, không thử lại):
//    · Nguyễn Kiệm được ping HTTP 200 ngày 13/9 mà 15/9 vẫn bị dừng → một truy
//      vấn thưa là KHÔNG đủ. Nay chạy mỗi ngày và chạm cả PostgREST lẫn Auth.
//    · Hòa Hiếu 1 gọi hỏng từ 1/9, Thần Lĩnh 1 từ 13/9 — robot báo "failure"
//      5 lần liền mà không ai biết, vì thư GitHub về hộp thư Schoolrecords.
//      Nay có trường hỏng thì robot MỞ MỘT ISSUE trên kho mã (tiêu đề cố định,
//      cập nhật lại mỗi ngày) và tự ĐÓNG khi mọi trường đã thức.
//    · "fetch failed" cũ không nói gì. Tên miền <ref>.supabase.co KHÔNG CÒN
//      (ENOTFOUND) nghĩa là dự án ĐÃ NGỦ — nay nói thẳng ra như vậy.
//
// Danh sách trường KHÔNG viết trong tệp này: đọc thẳng cau-hinh/ma/*.json,
// nên cấp mã cho trường mới là robot tự biết. Trường chưa có CSDL riêng (hai ô
// DIA_CHI / KHOA_CONG_KHAI trống — đang ở chế độ xem thử) thì bỏ qua.
//
// Khoá công khai (anon key) vốn đã nằm trong kho mã công khai và chỉ mở đúng
// những gì RLS cho phép. Issue dùng GITHUB_TOKEN có sẵn của Actions.
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');

const THU_MUC = path.join(__dirname, '..', '..', 'cau-hinh', 'ma');
const HET_GIO = 20000;        // 20 giây/lượt: máy chủ đang ngái ngủ trả lời chậm
const SO_LAN_THU = 3;
const NGHI_GIUA = 15000;      // 15 giây giữa hai lần thử
const TIEU_DE_ISSUE = '🔴 Robot giữ thức: có trường KHÔNG gọi được cơ sở dữ liệu';

const ngu = ms => new Promise(r => setTimeout(r, ms));

function docCauHinh() {
  if (!fs.existsSync(THU_MUC)) return [];
  return fs.readdirSync(THU_MUC)
    .filter(t => t.endsWith('.json'))
    .map(t => {
      try {
        return { tep: t, d: JSON.parse(fs.readFileSync(path.join(THU_MUC, t), 'utf8')) };
      } catch (e) {
        console.log(`⚠  ${t}: đọc không được (${e.message})`);
        return null;
      }
    })
    .filter(Boolean)
    // Bí danh ({ "xem": "<mã chính>" }) trỏ về tệp khác — ping một lần là đủ.
    .filter(x => !x.d.xem)
    .filter(x => x.d.DIA_CHI && x.d.KHOA_CONG_KHAI);
}

async function goi(url, khoa) {
  const dk = new AbortController();
  const hen = setTimeout(() => dk.abort(), HET_GIO);
  try {
    const r = await fetch(url, {
      headers: { apikey: khoa, Authorization: `Bearer ${khoa}` },
      signal: dk.signal
    });
    await r.text();
    // 200 hay 401 đều ĐẠT: yêu cầu đã tới máy chủ của trường; 401 chỉ là RLS.
    // 5xx (540 = dự án đang dừng) là HỎNG.
    return { dat: r.status < 500, mo_ta: `HTTP ${r.status}` };
  } catch (e) {
    const ma = e.cause && e.cause.code;
    if (ma === 'ENOTFOUND') return { dat: false, ngu: true, mo_ta: 'tên miền CSDL không còn — DỰ ÁN ĐÃ NGỦ' };
    if (e.name === 'AbortError') return { dat: false, mo_ta: `quá ${HET_GIO / 1000} giây không trả lời` };
    return { dat: false, mo_ta: `không gọi được (${ma || e.message})` };
  } finally {
    clearTimeout(hen);
  }
}

async function giuMotTruong(x) {
  const ten = x.d.TEN_TRUONG || x.tep;
  const goc = String(x.d.DIA_CHI).replace(/\/+$/, '');
  const ref = (goc.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || goc;
  // Hai cửa khác nhau: PostgREST phải hỏi Postgres (chạm CSDL thật), Auth là
  // dịch vụ đăng nhập. Chạm cả hai cho chắc được tính là "có hoạt động".
  const duong = [
    `${goc}/rest/v1/cau_hinh?select=khoa&limit=1`,
    `${goc}/auth/v1/settings`
  ];
  let kq;
  for (let lan = 1; lan <= SO_LAN_THU; lan++) {
    const tung = [];
    for (const u of duong) tung.push(await goi(u, x.d.KHOA_CONG_KHAI));
    kq = { ten, ref, dat: tung.every(t => t.dat), ngu: tung.some(t => t.ngu),
           mo_ta: tung.map(t => t.mo_ta).join(' · ') };
    // Đã chắc là ngủ (mất tên miền) thì thử lại cũng vô ích.
    if (kq.dat || kq.ngu) break;
    if (lan < SO_LAN_THU) await ngu(NGHI_GIUA);
  }
  console.log(`${kq.dat ? '✅' : kq.ngu ? '😴' : '❌'} ${ten} — ${kq.mo_ta}`);
  return kq;
}

// ── Issue trên kho mã: chỗ thầy Chung NHÌN THẤY được khi robot hỏng ─────────
async function gh(duong, opt = {}) {
  const token = process.env.GITHUB_TOKEN, kho = process.env.GITHUB_REPOSITORY;
  if (!token || !kho) return null;           // chạy thử trên máy: bỏ qua
  const r = await fetch(`https://api.github.com/repos/${kho}${duong}`, {
    ...opt,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
               'Content-Type': 'application/json' }
  });
  if (!r.ok) { console.log(`⚠  GitHub API ${duong}: HTTP ${r.status}`); return null; }
  return r.status === 204 ? {} : r.json();
}

async function baoIssue(ds) {
  const mo = await gh(`/issues?state=open&per_page=50`);
  if (!mo) return;
  const cu = mo.find(i => i.title === TIEU_DE_ISSUE && !i.pull_request);
  const hong = ds.filter(k => !k.dat);
  const hom_nay = new Date().toISOString().slice(0, 10);

  if (!hong.length) {
    if (cu) {
      await gh(`/issues/${cu.number}/comments`, { method: 'POST',
        body: JSON.stringify({ body: `✅ ${hom_nay}: cả ${ds.length} trường đã trả lời được — đóng issue.` }) });
      await gh(`/issues/${cu.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) });
      console.log(`Đã đóng issue #${cu.number}.`);
    }
    return;
  }

  const dong = hong.map(k =>
    `- ${k.ngu ? '😴 **ĐÃ NGỦ**' : '❌'} **${k.ten}** — ${k.mo_ta}\n` +
    `  → https://supabase.com/dashboard/project/${k.ref} (đăng nhập tài khoản Supabase của trường → **Resume project**)`
  ).join('\n');
  const noi_dung =
    `Lượt kiểm ${hom_nay}: **${hong.length}/${ds.length} trường** không gọi được cơ sở dữ liệu.\n\n${dong}\n\n` +
    `Robot chỉ GIỮ cho khỏi ngủ, không đánh thức được. Resume xong, lượt chạy hôm sau tự đóng issue này ` +
    `(hoặc vào tab Actions → "Giữ Supabase các trường khỏi ngủ" → Run workflow để kiểm ngay).`;

  if (cu) {
    await gh(`/issues/${cu.number}`, { method: 'PATCH', body: JSON.stringify({ body: noi_dung }) });
    await gh(`/issues/${cu.number}/comments`, { method: 'POST',
      body: JSON.stringify({ body: `Vẫn hỏng ${hom_nay}: ${hong.map(k => k.ten).join(', ')}` }) });
    console.log(`Đã cập nhật issue #${cu.number}.`);
  } else {
    const moi = await gh(`/issues`, { method: 'POST', body: JSON.stringify({ title: TIEU_DE_ISSUE, body: noi_dung }) });
    if (moi) console.log(`Đã mở issue #${moi.number}.`);
  }
}

(async function () {
  const ds = docCauHinh();
  if (!ds.length) {
    console.log('Không có trường nào đã nối cơ sở dữ liệu — không phải lỗi.');
    return;
  }
  console.log(`Giữ thức ${ds.length} trường:`);
  const kq = [];
  for (const x of ds) kq.push(await giuMotTruong(x));   // lần lượt, không dồn một lúc
  const hong = kq.filter(k => !k.dat);
  console.log(`\n${kq.length - hong.length}/${kq.length} trường trả lời được.`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### Giữ thức ${kq.length} trường — ${kq.length - hong.length} đạt\n\n` +
      kq.map(k => `- ${k.dat ? '✅' : k.ngu ? '😴' : '❌'} ${k.ten} — ${k.mo_ta}`).join('\n') + '\n');
  }
  try { await baoIssue(kq); } catch (e) { console.log(`⚠  Không báo được issue: ${e.message}`); }

  // Có trường hỏng thì BÁO HỎNG hẳn (đỏ trên tab Actions). Im lặng đúng là cái ta
  // sợ nhất — CSDL ngủ mất mà không ai hay.
  if (hong.length) process.exit(1);
})();
