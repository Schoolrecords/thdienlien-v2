// ============================================================
// giu-supabase-thuc.js — ROBOT GIỮ CHO CSDL CÁC TRƯỜNG KHỎI NGỦ
//
// Supabase gói miễn phí cho dự án NGỦ sau 7 ngày không có request nào chạm
// tới cơ sở dữ liệu. Nghỉ hè hai tuần là trường vào thấy app báo mất kết nối.
// Tệp này chạy tự động trên GitHub Actions vài ngày một lần, gửi tới mỗi
// trường MỘT truy vấn nhẹ — đủ để đồng hồ đếm lùi của Supabase reset.
//
// ⚠️ ROBOT CHỈ GIỮ CHO KHỎI NGỦ, KHÔNG ĐÁNH THỨC ĐƯỢC.
//    Dự án đã ngủ rồi thì bắt buộc người có tài khoản vào Supabase bấm
//    "Resume project" — Supabase không mở đường tự động cho việc này.
//    Ngủ quá 1 năm là mất hẳn, không khôi phục.
//
// Danh sách trường KHÔNG viết trong tệp này: đọc thẳng cau-hinh/ma/*.json,
// nên cấp mã cho trường mới là robot tự biết, không ai phải nhớ sửa thêm.
// Trường chưa có CSDL riêng (hai ô DIA_CHI / KHOA_CONG_KHAI trống — đang ở
// chế độ xem thử) thì bỏ qua, không phải lỗi.
//
// Khoá công khai (anon key) vốn đã nằm trong kho mã công khai và chỉ mở đúng
// những gì RLS cho phép — nên tệp này KHÔNG cần bí mật nào của GitHub.
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');

const THU_MUC = path.join(__dirname, '..', '..', 'cau-hinh', 'ma');
const HET_GIO = 20000;   // 20 giây/trường: máy chủ đang ngái ngủ trả lời chậm

function docCauHinh() {
  if (!fs.existsSync(THU_MUC)) return [];
  return fs.readdirSync(THU_MUC)
    .filter(t => t.endsWith('.json'))
    .map(t => {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(THU_MUC, t), 'utf8'));
        return { tep: t, d };
      } catch (e) {
        console.log(`⚠  ${t}: đọc không được (${e.message})`);
        return null;
      }
    })
    .filter(Boolean)
    // Bí danh ({ "xem": "<mã chính>" }) trỏ về tệp khác — ping một lần là đủ,
    // ping cả bí danh thì cùng một trường bị gọi hai lần.
    .filter(x => !x.d.xem)
    .filter(x => x.d.DIA_CHI && x.d.KHOA_CONG_KHAI);
}

async function ping(x) {
  const ten = x.d.TEN_TRUONG || x.tep;
  const goc = String(x.d.DIA_CHI).replace(/\/+$/, '');
  // Truy vấn nhẹ nhất có thể mà VẪN chạm tới cơ sở dữ liệu: PostgREST phải mở
  // kết nối và hỏi Postgres thì Supabase mới tính là có hoạt động. Gọi mấy
  // đường /health thì không chạm CSDL, ping xong dự án vẫn ngủ như thường.
  const url = `${goc}/rest/v1/cau_hinh?select=khoa&limit=1`;
  const dieuKhien = new AbortController();
  const hen = setTimeout(() => dieuKhien.abort(), HET_GIO);
  try {
    const r = await fetch(url, {
      headers: {
        apikey: x.d.KHOA_CONG_KHAI,
        Authorization: `Bearer ${x.d.KHOA_CONG_KHAI}`
      },
      signal: dieuKhien.signal
    });
    // 200 hay 401 đều ĐẠT: cả hai đều chứng tỏ yêu cầu đã đi tới máy chủ của
    // trường. 401 chỉ là RLS không cho khách lạ đọc bảng đó — đúng như thiết kế.
    const dat = r.status < 500;
    console.log(`${dat ? '✅' : '❌'} ${ten} — HTTP ${r.status}`);
    return dat;
  } catch (e) {
    console.log(`❌ ${ten} — không gọi được: ${e.message}`);
    return false;
  } finally {
    clearTimeout(hen);
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
  for (const x of ds) kq.push(await ping(x));   // lần lượt, không dồn một lúc
  const hong = kq.filter(v => !v).length;
  console.log(`\n${kq.length - hong}/${kq.length} trường trả lời được.`);
  // Có trường không gọi được thì BÁO HỎNG hẳn, để GitHub gửi thư. Im lặng thì
  // đúng cái ta sợ nhất — CSDL ngủ mất mà không ai hay — lại xảy ra lặng lẽ.
  if (hong) process.exit(1);
})();
