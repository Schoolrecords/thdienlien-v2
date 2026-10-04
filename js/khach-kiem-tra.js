// ============================================================
// khach-kiem-tra.js — TÀI KHOẢN KHÁCH CÓ HẠN cho đoàn kiểm tra / đánh giá ngoài (sql/82)
// Sổ dự án mục 121.3.
//   1. Thẻ Quản trị "🧾 Khách kiểm tra": BGH cấp (email · họ tên · đoàn · từ ngày · đến ngày,
//      tối đa 60 ngày), gia hạn, thu hồi.
//   2. window.KHACH_XEM.mo(may, info, dangXuat): màn CHỈ XEM danh mục minh chứng cho khách
//      còn hạn — supabase-ket-noi.js gọi khi tài khoản đăng nhập bị 'khoa' mà khach_toi() có.
// Khách KHÔNG vào được app (tài khoản luôn 'khoa', sql/82) — màn này đọc qua khach_ho_so().
// Quyền mở TỆP trên Drive: Apps Script KhachKiemTra.gs (thêm/gỡ người xem theo danh sách).
// ============================================================
(function () {
  'use strict';

  function t(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function link(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; }
  function ngay(d) { if (!d) return ''; var p = String(d).slice(0, 10).split('-'); return p.length === 3 ? (+p[2]) + '/' + (+p[1]) + '/' + p[0] : d; }
  function homNayISO() {
    var d = new Date(Date.now() + 7 * 3600 * 1000); // giờ Việt Nam
    return d.toISOString().slice(0, 10);
  }
  function congNgay(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function baoLoi(e) {
    var m = (e && e.message) || String(e || '');
    if (/khach_kiem_tra|does not exist|schema cache|PGRST20/i.test(m)) m = 'Trường chưa chạy tệp sql/82-khach-kiem-tra.sql. ' + m;
    window.hopHoi ? window.hopHoi({ tieuDe: 'Không thực hiện được', moTa: m, bieuTuong: '⚠️', nutOK: 'Đóng', nutHuy: 'Đóng' }) : alert(m);
  }

  // ══════════ 1. THẺ QUẢN TRỊ ══════════
  var HOP = null;
  function ve(hop) {
    HOP = hop;
    hop.innerHTML = '<div class="the-thong-bao">Đang tải danh sách khách…</div>';
    window.MAY_CHU.from('khach_kiem_tra').select('*').order('het_han', { ascending: false }).then(function (r) {
      if (r.error) {
        hop.innerHTML = '<div class="the-thong-bao"><b>Chưa bật tài khoản khách.</b><br>Trường cần chạy tệp <code>sql/82-khach-kiem-tra.sql</code> trên Supabase một lần. Chi tiết: ' + t(r.error.message) + '</div>';
        return;
      }
      veDs(r.data || []);
    }, baoLoi);
  }
  function tinhTrang(k) {
    var hn = homNayISO();
    if (k.thu_hoi) return '<span class="ckq-chip ckq-ko">Đã thu hồi</span>';
    if (hn > k.het_han) return '<span class="ckq-chip ckq-ko">Hết hạn</span>';
    if (hn < k.tu_ngay) return '<span class="ckq-chip ckq-cho">Chưa tới ngày</span>';
    return '<span class="ckq-chip ckq-tot">Đang hiệu lực</span>';
  }
  function veDs(ds) {
    var hn = homNayISO();
    HOP.innerHTML = '<div class="ckq-khu">' +
      '<div class="ckq-dau"><div><h3>🧾 Tài khoản khách kiểm tra</h3>' +
      '<p>Cho đoàn kiểm tra, đoàn đánh giá ngoài <b>xem danh mục minh chứng</b> trong thời gian làm việc (tối đa 60 ngày mỗi lần cấp). ' +
      'Khách đăng nhập bằng Gmail của họ tại địa chỉ trường, <b>chỉ thấy</b> danh sách hồ sơ minh chứng và đường dẫn; không vào được Điều hành, Lớp học, danh sách cán bộ, học sinh. ' +
      'Hết hạn hoặc thu hồi là mất quyền ngay. Quyền mở tệp trên Drive do Apps Script <b>KhachKiemTra.gs</b> thêm/gỡ theo danh sách này.</p></div></div>' +
      '<div class="ckq-soan"><div class="ckq-soan-dau"><h3>Cấp tài khoản khách</h3></div><div class="ckq-luoi">' +
      '<div class="ckq-o"><label>Gmail của khách</label><input id="kk-email" type="email" placeholder="Gmail của thành viên đoàn"></div>' +
      '<div class="ckq-o"><label>Họ và tên</label><input id="kk-ten" type="text"></div>' +
      '<div class="ckq-o"><label>Đoàn / cơ quan</label><input id="kk-dv" type="text" placeholder="Đoàn đánh giá ngoài Sở GD&ĐT Nghệ An"></div>' +
      '<div class="ckq-o"><label>Từ ngày</label><input id="kk-tu" type="date" value="' + hn + '"></div>' +
      '<div class="ckq-o"><label>Đến hết ngày (≤ 60 ngày)</label><input id="kk-den" type="date" value="' + congNgay(hn, 7) + '" max="' + congNgay(hn, 60) + '"></div>' +
      '<div class="ckq-o"><label>Ghi chú</label><input id="kk-gc" type="text" placeholder="Số quyết định thành lập đoàn…"></div>' +
      '</div><div class="ckq-chan"><button type="button" class="nut-chinh" id="kk-cap">➕ Cấp quyền</button><span class="ckq-bao" id="kk-bao"></span></div></div>' +
      '<div class="ckq-soan"><div class="ckq-soan-dau"><h3>Danh sách khách</h3><div>Gửi khách địa chỉ: <b>' + t(location.origin) + '</b></div></div>' +
      (ds.length ? '<div class="ckq-bang-cuon"><table class="ckq-bang"><thead><tr><th>Gmail</th><th>Họ tên</th><th>Đoàn / cơ quan</th><th>Hiệu lực</th><th>Tình trạng</th><th></th></tr></thead><tbody>' +
        ds.map(function (k) {
          return '<tr><td>' + t(k.email) + '</td><td>' + t(k.ho_ten) + '</td><td>' + t(k.don_vi) + '</td><td>' + ngay(k.tu_ngay) + ' – ' + ngay(k.het_han) + '</td><td>' + tinhTrang(k) + '</td>' +
            '<td style="white-space:nowrap">' + (k.thu_hoi ? '' : '<button type="button" class="nut-phu" data-kk-gh="' + k.id + '">Gia hạn 7 ngày</button> <button type="button" class="nut-phu ckq-nguy" data-kk-th="' + k.id + '">Thu hồi</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="ckq-goi-y">Chưa cấp tài khoản khách nào.</div>') + '</div></div>';

    document.getElementById('kk-cap').addEventListener('click', cap);
    Array.prototype.slice.call(HOP.querySelectorAll('[data-kk-th]')).forEach(function (b) {
      b.addEventListener('click', function () {
        window.hopHoi({ tieuDe: 'Thu hồi tài khoản khách?', moTa: 'Khách mất quyền xem ngay. Quyền xem tệp trên Drive được gỡ ở lần chạy Apps Script kế tiếp.', nutOK: 'Thu hồi', nutHuy: 'Thôi', nguyHiem: true })
          .then(function (ok) { if (ok) window.MAY_CHU.from('khach_kiem_tra').update({ thu_hoi: true }).eq('id', +b.getAttribute('data-kk-th')).then(function (r) { r.error ? baoLoi(r.error) : ve(HOP); }); });
      });
    });
    Array.prototype.slice.call(HOP.querySelectorAll('[data-kk-gh]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = ds.filter(function (x) { return x.id === +b.getAttribute('data-kk-gh'); })[0];
        var moi = congNgay(homNayISO() > k.het_han ? homNayISO() : k.het_han, 7);
        var tu = homNayISO() > k.het_han ? homNayISO() : k.tu_ngay;
        window.MAY_CHU.from('khach_kiem_tra').update({ het_han: moi, tu_ngay: tu }).eq('id', k.id).then(function (r) { r.error ? baoLoi(r.error) : ve(HOP); });
      });
    });
  }
  function cap() {
    var g = function (id) { return String(document.getElementById(id).value || '').trim(); };
    var email = g('kk-email').toLowerCase();
    var bao = document.getElementById('kk-bao');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { bao.textContent = '⚠️ Gmail chưa đúng.'; return; }
    if (!g('kk-den') || g('kk-den') < g('kk-tu')) { bao.textContent = '⚠️ Ngày hết hạn phải sau ngày bắt đầu.'; return; }
    bao.textContent = 'Đang cấp…';
    window.MAY_CHU.from('khach_kiem_tra').insert({ email: email, ho_ten: g('kk-ten') || null, don_vi: g('kk-dv') || null,
      tu_ngay: g('kk-tu'), het_han: g('kk-den'), ghi_chu: g('kk-gc') || null })
      .then(function (r) {
        if (r.error) { bao.textContent = ''; baoLoi(/check/i.test(r.error.message) ? 'Hạn tối đa 60 ngày mỗi lần cấp, và ngày hết hạn phải sau ngày bắt đầu.' : r.error); return; }
        if (window.notify) window.notify('Đã cấp quyền khách cho ' + email);
        ve(HOP);
      }, baoLoi);
  }

  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'kk', ten: '🧾 Khách kiểm tra', ve: ve });

  // ══════════ 2. MÀN XEM CỦA KHÁCH ══════════
  var TT = { co: 'Đã có', dang: 'Đang cập nhật', chua: 'Chưa có' };
  var DL = null, LOC = { tc: '', q: '' }, INFO = null, THOAT = null;
  function moXem(may, info, dangXuat) {
    INFO = info; THOAT = dangXuat;
    var el = document.getElementById('ck-trang');
    if (!el) { el = document.createElement('div'); el.id = 'ck-trang'; el.className = 'ck-trang'; document.body.appendChild(el); }
    document.body.classList.add('ck-mo');
    el.innerHTML = '<div class="ck-khung" style="padding:40px 20px">Đang tải danh mục minh chứng…</div>';
    Promise.resolve(may.rpc('khach_ho_so')).then(function (r) {
      if (r.error) { el.innerHTML = '<div class="ck-khung" style="padding:40px 20px">' + t(r.error.message) + '</div>'; return; }
      DL = r.data; veXem();
    });
  }
  function veXem() {
    var el = document.getElementById('ck-trang'), C = window.CAU_HINH || {};
    var q = LOC.q.toLowerCase();
    var ds = (DL.ho_so || []).filter(function (h) {
      return (!LOC.tc || (h.tieu_chi || []).indexOf(LOC.tc) >= 0) &&
        (!q || (h.ma + ' ' + h.ten).toLowerCase().indexOf(q) >= 0);
    });
    var nhom = [], theo = {};
    ds.forEach(function (h) { var k = h.hop; if (!theo[k]) { theo[k] = []; nhom.push(h); } theo[k].push(h); });
    var co = (DL.ho_so || []).filter(function (h) { return h.tinh_trang === 'co'; }).length;
    el.innerHTML =
      '<div class="ck-dai-thu">Tài khoản khách: <b>' + t(INFO.ho_ten || INFO.email) + '</b>' + (INFO.don_vi ? ' · ' + t(INFO.don_vi) : '') +
      ' · chỉ xem minh chứng · hiệu lực đến hết ngày <b>' + ngay(INFO.het_han) + '</b></div>' +
      '<div class="ck-thanh"><div class="ck-khung"><div><b>Hồ sơ minh chứng</b> · ' + t(C.TEN_TRUONG || '') + '</div>' +
      '<button class="ck-nut-dn" type="button" id="kx-thoat">↩ Đăng xuất</button></div></div>' +
      '<main class="ck-than"><div class="ck-khung">' +
      '<div class="ck-dau-muc"><h2>Danh mục hồ sơ minh chứng</h2><div class="ck-phu-de">' + (DL.ho_so || []).length + ' hồ sơ · ' + co +
      ' đã có minh chứng. Bấm "Mở" để xem thư mục/tệp trên Google Drive (đăng nhập Drive bằng đúng Gmail này).</div></div>' +
      '<div class="kx-loc"><select id="kx-tc"><option value="">Tất cả tiêu chí (TT 57/2026)</option>' +
      (DL.tieu_chi || []).map(function (c) { return '<option value="' + t(c.ma) + '"' + (c.ma === LOC.tc ? ' selected' : '') + '>Tiêu chí ' + t(c.ma) + ' — ' + t(c.ten) + '</option>'; }).join('') +
      '</select><input id="kx-q" type="search" placeholder="Tìm theo mã hoặc tên hồ sơ…" value="' + t(LOC.q) + '"></div>' +
      (nhom.length ? nhom.map(function (g) {
        return '<details class="ck-hop" open><summary><b>' + t(g.ten_hop || g.hop) + '</b><span>' + theo[g.hop].length + ' hồ sơ</span></summary>' +
          '<div class="ck-cuon"><table><thead><tr><th>Mã</th><th class="ck-trai">Tên hồ sơ</th><th class="ck-trai">Tiêu chí</th><th class="ck-trai">Tình trạng</th><th></th></tr></thead><tbody>' +
          theo[g.hop].map(function (h) {
            var u = link(h.link);
            return '<tr><td>' + t(h.ma) + '</td><td class="ck-trai">' + t(h.ten) + '</td><td class="ck-trai">' + t((h.tieu_chi || []).join(', ')) + '</td>' +
              '<td class="ck-trai">' + t(TT[h.tinh_trang] || h.tinh_trang) + '</td><td>' +
              (u ? '<a class="ck-xem" href="' + t(u) + '" target="_blank" rel="noopener">Mở ›</a>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div></details>';
      }).join('') : '<p class="ck-ghi-chu">Không có hồ sơ khớp bộ lọc.</p>') +
      '</div></main>';
    document.getElementById('kx-thoat').onclick = function () { if (THOAT) THOAT(); };
    document.getElementById('kx-tc').onchange = function () { LOC.tc = this.value; veXem(); };
    var o = document.getElementById('kx-q');
    o.oninput = function () { LOC.q = this.value; var vt = this.selectionStart; veXem(); var n = document.getElementById('kx-q'); n.focus(); n.setSelectionRange(vt, vt); };
  }
  window.KHACH_XEM = { mo: moXem };
})();
