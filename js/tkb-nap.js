// ============================================================
// tkb-nap.js — THẺ "🗓️ Thời khóa biểu" TRONG MÀN QUẢN TRỊ
//
// Thầy Chung chốt 14/9/2026 (sổ dự án 91.13): bỏ link sang app TKB riêng,
// trường tải tệp Smart Scheduler kết xuất lên đây. Luồng ba bước giống thẻ
// Nạp dữ liệu — KHÔNG BAO GIỜ GHI THẲNG:
//   1. Chọn tệp (hoặc tải mẫu 3 trang PCGD · TKB_LOP_SC · TKB_GV_SC để điền tay)
//      — MỖI PHÂN HIỆU MỘT TỆP (thầy Chung 14/9/2026, sql/66); máy đoán phân hiệu theo lớp
//   2. SOI THỬ: đếm lớp · tiết · giáo viên, báo trùng tiết, bảng GHÉP TÊN GỌI
//      → họ tên → tài khoản (không chắc thì bắt chọn tay, không đoán)
//   3. Ghi thành một PHIÊN BẢN (hàm tkb_nap — một giao dịch), công bố ngay
//      hoặc để nháp
//
// Đọc tệp: js/tkb-doc.js (thuần, đã thử trên tệp thật — thu-tkb-doc.js).
// Quyền: thẻ chỉ hiện với quản trị / BGH (quan-tri.js lọc); RLS máy chủ
// (sql/64) mới là hàng rào thật.
// Đăng ký thẻ qua window.qtTabPhu — KHÔNG sửa quan-tri.js.
// ============================================================
(function () {
  'use strict';

  window.qtTabPhu = window.qtTabPhu || [];
  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s); }
  function bao(s) { if (window.notify) window.notify(s); }

  var KQ = null;          // { tenTep, doc, ghep, taiKhoan, tenGoi, lopHoc, lopPhamVi }
  var DANG_GHI = false;
  var thuVien = null;
  // Phân hiệu (sql/66): mỗi phân hiệu nạp một tệp riêng. ds = co_so đang hoạt động,
  // coCot = CSDL đã có cột tkb_phien_ban.co_so_ma chưa, chon = '' (toàn trường) | mã cơ sở
  var CS = { ds: [], coCot: null, chon: '', daHoi: false };

  function napThuVien() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (thuVien) return thuVien;
    thuVien = new Promise(function (xong, hong) {
      var s = document.createElement('script');
      s.src = 'lib/xlsx.min.js?v=202608244';
      s.onload = function () { window.XLSX ? xong(window.XLSX) : hong(new Error('Tải được thư viện nhưng không dùng được.')); };
      s.onerror = function () { thuVien = null; hong(new Error('Không tải được thư viện đọc Excel (lib/xlsx.min.js). Kiểm tra mạng rồi thử lại.')); };
      document.head.appendChild(s);
    });
    return thuVien;
  }

  function may() { return window.MAY_CHU; }
  function ngayVN(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }
  function homNayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  // Lỗi "chưa có bảng" nói ra đúng việc phải làm, không để thầy cô đoán
  function loiBang(e) {
    var m = String((e && (e.message || e.details)) || e || '');
    if (/tkb_|relation .* does not exist|schema cache|Could not find/i.test(m)) {
      return 'Cơ sở dữ liệu của trường <b>chưa có bảng thời khóa biểu</b> — người phụ trách hệ thống cần chạy ' +
        '<code>sql/64-thoi-khoa-bieu.sql</code> một lần. <small>(' + thoat(m) + ')</small>';
    }
    return thoat(m || 'Lỗi không rõ.');
  }

  // ══════════════════════════════════════════════════════════════
  // VẼ THẺ
  // ══════════════════════════════════════════════════════════════
  function veTab(hop) {
    if (!may()) {
      hop.innerHTML = '<div class="the-thong-bao">Chế độ xem thử chưa nối cơ sở dữ liệu — không nạp được thời khóa biểu.</div>';
      return;
    }
    hop.innerHTML =
      '<div class="nhan-nho" style="margin:14px 0 12px">Thời khóa biểu <b>xếp trong Smart Scheduler</b>, rồi tải tệp kết xuất ' +
      '(<i>Hệ thống › Chuyển đổi dữ liệu sang Excel</i>) lên đây. Máy <b>xem trước</b>, ghép tên giáo viên với tài khoản, ' +
      'rồi mới hỏi có ghi hay không. Muốn đổi lịch thì sửa trong Smart Scheduler rồi tải lại — hệ thống <b>không sửa tay</b> ' +
      'từng tiết, để thời khóa biểu chỉ có một nguồn.</div>' +
      '<div class="dh-tieu-de">Các phiên bản đã nạp</div>' +
      '<div id="tkbn-ds"><div class="the-thong-bao">Đang tải…</div></div>' +
      '<div class="dh-tieu-de" style="margin-top:22px">Nạp tệp mới</div>' +
      '<div class="nap-buoc"><div class="nap-so">1</div><div class="nap-noi">' +
        '<span class="nap-nhan">Chọn tệp thời khóa biểu</span>' +
        '<input id="tkbn-tep" type="file" accept=".xls,.xlsx" class="nap-tep-that">' +
        '<label class="nap-nut-tep" for="tkbn-tep">📄 Chọn tệp Excel…</label>' +
        '<span id="tkbn-ten-tep" class="nap-ten-tep">Chưa chọn tệp nào</span>' +
        '<div class="nap-mach">Tệp gồm 3 trang <b>PCGD · TKB_LOP_SC · TKB_GV_SC</b> (sáng và chiều chung một trang), ' +
        '<b>mỗi phân hiệu một tệp</b>. Tệp Smart Scheduler kết xuất đủ 10 trang cũng đọc được. ' +
        'Trường không dùng Smart Scheduler thì ' +
        '<button type="button" class="nap-nut-mau" id="tkbn-mau">⬇️ Tải mẫu 3 trang</button><span id="tkbn-cs-vung"></span>, ' +
        'điền ô vàng: mỗi ô tiết ghi <code>Môn - Cô X</code>, trang PCGD ghi họ tên và phân công; trang TKB_GV_SC không bắt buộc.</div>' +
      '</div></div>' +
      '<div id="tkbn-ket"></div>';

    document.getElementById('tkbn-tep').addEventListener('change', chonTep);
    document.getElementById('tkbn-mau').addEventListener('click', taiMau);
    veDanhSach();
    napCoSo().then(veChonCoSo);
    if (KQ) veSoiThu();
  }

  // ── Phân hiệu: danh sách cơ sở + dò CSDL đã chạy sql/66 chưa ──
  function napCoSo() {
    if (CS.daHoi) return Promise.resolve();
    return Promise.all([
      may().from('co_so').select('ma,ten,so_tt').eq('hoat_dong', true).order('so_tt'),
      may().from('tkb_phien_ban').select('co_so_ma').limit(1)
    ]).then(function (r) {
      if (r[0] && r[0].error) return;            // lỗi mạng/phiên — lần sau hỏi lại
      var e = r[1].error;
      // Chỉ coi là "chưa chạy sql/66" khi lỗi ĐÚNG là thiếu cột; lỗi khác để lần sau hỏi lại
      if (e && !(e.code === '42703' || /co_so_ma/i.test(String(e.message || '')))) return;
      CS.ds = r[0].data || [];
      CS.coCot = !e;
      CS.daHoi = true;
    }, function () { /* lỗi mạng — không nhớ, lần sau hỏi lại */ });
  }
  function nhieuCoSo() { return CS.ds.length > 1; }
  function tenCoSo(ma) {
    if (!ma) return 'Toàn trường';
    var c = CS.ds.filter(function (x) { return x.ma === ma; })[0];
    return c ? c.ten : ma;
  }
  // gia = '' | mã cơ sở | null (chưa chọn — hiện dòng "— chọn —")
  function htmlChonCoSo(id, gia) {
    return '<select id="' + id + '" class="nap-chon" style="max-width:280px">' +
      (gia === null ? '<option value="?" selected>— chọn phân hiệu —</option>' : '') +
      '<option value=""' + (gia === '' ? ' selected' : '') + '>Toàn trường (một tệp cho mọi lớp)</option>' +
      CS.ds.map(function (c) {
        return '<option value="' + thoat(c.ma) + '"' + (gia === c.ma ? ' selected' : '') + '>' + thoat(c.ten) + '</option>';
      }).join('') + '</select>';
  }
  // Ô chọn ở bước 1 CHỈ dùng cho nút "Tải mẫu" — phân hiệu của tệp nạp chọn riêng từng tệp (KQ.coSo)
  function veChonCoSo() {
    var vung = document.getElementById('tkbn-cs-vung');
    if (!vung || !nhieuCoSo()) return;
    vung.innerHTML = ' cho ' + htmlChonCoSo('tkbn-cs-1', CS.mau || '');
    document.getElementById('tkbn-cs-1').addEventListener('change', function (e) { CS.mau = e.target.value; });
  }
  function docLopCuaBan(ids) {
    var m = {};
    if (!ids.length) return Promise.resolve(m);
    var co = 1000;
    function trang(tu) {
      return may().from('tkb_tiet').select('phien_ban_id,lop').in('phien_ban_id', ids)
        .order('phien_ban_id').order('lop').order('thu').order('buoi').order('tiet')
        .range(tu, tu + co - 1).then(function (r) {
          if (r.error) throw r.error;
          (r.data || []).forEach(function (x) { (m[x.phien_ban_id] = m[x.phien_ban_id] || {})[x.lop] = 1; });
          return (r.data || []).length === co ? trang(tu + co) : m;
        });
    }
    return trang(0);
  }
  // Người nạp đổi phân hiệu của tệp: GIỮ ngày/năm/kỳ/công bố và tài khoản đã chọn tay
  function doiCoSo(ma) {
    if (!KQ || KQ.doc.loi.length || ma === '?') return;
    var giu = {};
    ['tkbn-ngay', 'tkbn-nam', 'tkbn-ky'].forEach(function (id) { var o = document.getElementById(id); if (o) giu[id] = o.value; });
    var cb = document.getElementById('tkbn-cong-bo');
    if (cb) giu.congBo = cb.checked;
    var tay = {};
    KQ.ghep.forEach(function (g) { if (g.cachEmail === 'chon-tay') tay[g.nhan] = g.email; });
    KQ.coSo = ma || '';
    KQ.xacNhan = true;
    KQ.ghep = ghepTheoCoSo();
    KQ.ghep.forEach(function (g) {
      if (Object.prototype.hasOwnProperty.call(tay, g.nhan)) { g.email = tay[g.nhan]; g.cachEmail = tay[g.nhan] ? 'chon-tay' : ''; }
    });
    KQ.giu = giu;
    veSoiThu();
  }
  // Khoá nhớ tên gọi: bản phân hiệu thêm tiền tố mã cơ sở — "Cô Linh" hai phân hiệu là hai người
  function khoaTenGoi(nhan) { return KQ.coSo ? KQ.coSo + '|' + nhan : nhan; }
  function ghepTheoCoSo() {
    var daLuu = {}, cs = KQ.coSo;
    (KQ.tenGoi || []).forEach(function (x) {
      var k = String(x.gv_nhan || '');
      if (cs) { if (k.indexOf(cs + '|') === 0) daLuu[k.slice(cs.length + 1)] = x; }
      else if (!/^[^|]+\|/.test(k)) daLuu[k] = x;
    });
    return window.TKB_DOC.ghepTen(KQ.doc, KQ.taiKhoan, daLuu);
  }

  // ── Danh sách phiên bản ──
  function veDanhSach() {
    var vung = document.getElementById('tkbn-ds');
    if (!vung) return;
    // select('*'): trường chưa chạy sql/66 chưa có cột co_so_ma — vẫn liệt kê được
    Promise.all([
      may().from('tkb_phien_ban').select('*')
        .order('ap_dung_tu', { ascending: false }).order('id', { ascending: false }).limit(300),
      napCoSo()
    ]).then(function (a) {
        var r = a[0];
        if (r.error) { vung.innerHTML = '<div class="hd-kiem do">' + loiBang(r.error) + '</div>'; return; }
        var ds = r.data || [];
        if (!ds.length) {
          vung.innerHTML = '<div class="the-thong-bao">Chưa nạp thời khóa biểu nào. Chọn tệp ở bước dưới.</div>';
          return;
        }
        var homNay = homNayISO();
        // Đang dùng = bản tham gia TKB hôm nay (mỗi phân hiệu một bản — cùng luật với js/tkb-xem.js)
        var dung = window.TKB_XEM && window.TKB_XEM.phienBanNgay ? window.TKB_XEM.phienBanNgay(ds, homNay) : null;
        var idDung = {};
        (dung ? (dung.thanhPhan || [dung]) : []).forEach(function (x) { idDung[x.id] = 1; });
        var coPH = nhieuCoSo() || ds.some(function (p) { return p.co_so_ma; });
        vung.innerHTML = '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
          '<th>Áp dụng từ</th>' + (coPH ? '<th>Phân hiệu</th>' : '') + '<th>Năm học · kỳ</th><th>Quy mô</th><th>Tệp</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
          ds.map(function (p) {
            var tt = p.cong_bo
              ? (idDung[p.id] ? '<b style="color:var(--ok)">● Đang dùng hôm nay</b>'
                : (p.ap_dung_tu > homNay ? '<span style="color:var(--chinh)">● Đã công bố, chờ tới ngày</span>' : '<span class="mo">Bản cũ</span>'))
              : '<span style="color:var(--canh)">● Bản nháp — CBGV chưa thấy</span>';
            return '<tr data-id="' + p.id + '">' +
              '<td><b>' + ngayVN(p.ap_dung_tu) + '</b></td>' +
              (coPH ? '<td>' + thoat(tenCoSo(p.co_so_ma)) + '</td>' : '') +
              '<td>' + thoat(p.nam_hoc) + (p.hoc_ky ? ' · HK' + p.hoc_ky : '') + '</td>' +
              '<td>' + p.so_lop + ' lớp · ' + p.so_tiet + ' tiết · ' + p.so_giao_vien + ' GV</td>' +
              '<td><small>' + thoat(p.ten_tep || '') + '<br>' + thoat(p.email_nap || '') + ' · ' +
                new Date(p.nap_luc).toLocaleString('vi-VN') + '</small></td>' +
              '<td>' + tt + '</td>' +
              '<td style="white-space:nowrap">' +
                (p.cong_bo
                  ? '<button class="dh-nut-nho" data-hanh="go">Gỡ công bố</button>'
                  : '<button class="dh-nut-nho" data-hanh="cong-bo">Công bố</button> ' +
                    '<button class="dh-nut-nho" data-hanh="xoa">Xoá</button>') +
              '</td></tr>';
          }).join('') + '</tbody></table></div>';
        DS_BAN = ds;
        Array.prototype.slice.call(vung.querySelectorAll('[data-hanh]')).forEach(function (b) {
          b.addEventListener('click', function () { hanhDong(+b.closest('tr').getAttribute('data-id'), b.getAttribute('data-hanh'), b); });
        });
      }, function (e) { vung.innerHTML = '<div class="hd-kiem do">' + loiBang(e) + '</div>'; });
  }
  var DS_BAN = [];

  // Công bố bản nháp của một phân hiệu: soát trùng tên lớp y như lúc nạp (soát vòng 2)
  function soatCongBo(id) {
    var p = DS_BAN.filter(function (x) { return x.id === id; })[0];
    if (!p || !p.co_so_ma) return Promise.resolve(null);
    var khac = banConHieuLuc(DS_BAN.filter(function (x) { return x.id !== id; }), p.ap_dung_tu)
      .filter(function (x) { return x.co_so_ma && x.co_so_ma !== p.co_so_ma; });
    if (!khac.length) return Promise.resolve(null);
    return docLopCuaBan([id].concat(khac.map(function (x) { return x.id; }))).then(function (m) {
      var cua = m[id] || {}, loi = [];
      khac.forEach(function (x) {
        var trung = Object.keys(m[x.id] || {}).filter(function (l) { return cua[l]; });
        if (trung.length) loi.push(tenCoSo(x.co_so_ma) + ' (áp dụng từ ' + ngayVN(x.ap_dung_tu) + '): ' + trung.slice(0, 10).join(', '));
      });
      return loi.length ? 'Chưa công bố — tên lớp trùng với bản đang dùng của ' + loi.join('; ') +
        '. Hai phân hiệu không được cùng tên lớp.' : null;
    });
  }

  function hanhDong(id, hanh, nut) {
    if (hanh === 'cong-bo' && !nut.dataset.daSoat) {
      nut.disabled = true;
      soatCongBo(id).then(function (loi) {
        nut.disabled = false;
        if (loi) { bao(loi); return; }
        nut.dataset.daSoat = '1';
        hanhDong(id, hanh, nut);
      }, function (e) { nut.disabled = false; bao('Không soát được trùng lớp: ' + ((e && e.message) || e)); });
      return;
    }
    delete nut.dataset.daSoat;
    var hoi = hanh === 'xoa' ? 'Xoá hẳn bản nháp này? Bản nháp chưa ai thấy, xoá không ảnh hưởng giáo viên.'
      : hanh === 'go' ? 'Gỡ công bố? Giáo viên sẽ không thấy bản này nữa; ngày đó dùng bản công bố liền trước (nếu có).'
      : 'Công bố bản này? Mọi CBGV sẽ thấy thời khóa biểu từ ngày áp dụng.';
    var xn = window.hopHoi ? window.hopHoi(hoi, { tieuDe: 'Thời khóa biểu', nutOK: hanh === 'xoa' ? 'Xoá' : 'Đồng ý' })
      : Promise.resolve(window.confirm(hoi));
    xn.then(function (ok) {
      if (!ok) return;
      nut.disabled = true;
      var lenh = hanh === 'xoa'
        ? may().from('tkb_phien_ban').delete().eq('id', id).eq('cong_bo', false).select('id')
        : may().from('tkb_phien_ban').update({ cong_bo: hanh === 'cong-bo', cong_bo_luc: hanh === 'cong-bo' ? new Date().toISOString() : null })
            .eq('id', id).select('id');
      lenh.then(function (r) {
        if (r.error || !r.data || !r.data.length) {
          nut.disabled = false;
          bao('Không lưu được: ' + (r.error ? r.error.message : 'máy chủ không ghi dòng nào (thiếu quyền?)'));
          return;
        }
        bao(hanh === 'xoa' ? 'Đã xoá bản nháp.' : hanh === 'go' ? 'Đã gỡ công bố.' : '✅ Đã công bố thời khóa biểu.');
        if (window.TKB_XEM && window.TKB_XEM.xoaBoNho) window.TKB_XEM.xoaBoNho();
        veDanhSach();
      }, function (e) { nut.disabled = false; bao('Không gọi được máy chủ: ' + ((e && e.message) || e)); });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHỌN TỆP → ĐỌC → SOI THỬ
  // ══════════════════════════════════════════════════════════════
  function chonTep(ev) {
    var f = ev.target.files && ev.target.files[0];
    if (!f) return;
    document.getElementById('tkbn-ten-tep').textContent = f.name;
    var ket = document.getElementById('tkbn-ket');
    ket.innerHTML = '<div class="the-thong-bao">Đang đọc tệp…</div>';
    KQ = null;
    Promise.all([napThuVien(), f.arrayBuffer()]).then(function (a) {
      var XLSX = a[0];
      var wb = XLSX.read(new Uint8Array(a[1]), { type: 'array' });
      var trang = {};
      wb.SheetNames.forEach(function (n) {
        trang[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true });
      });
      var doc = window.TKB_DOC.docTep(trang);
      var nam = doc.tieuDe.namHoc || (window.CAU_HINH && window.CAU_HINH.NAM_HOC) || '';
      return Promise.all([
        may().from('moi_tai_khoan').select('email,ho_ten,chuc_vu,co_so_ma,la_ky_thuat').order('ho_ten'),
        may().from('tkb_ten_goi').select('gv_nhan,email,ho_ten'),
        may().from('lop_hoc').select('lop,co_so_ma').eq('nam_hoc', nam),
        may().from('tkb_phien_ban').select('*').eq('cong_bo', true),
        napCoSo()
      ]).then(function (r) {
        if (r[1].error) throw r[1].error;
        if (r[3].error) throw r[3].error;
        var tk = (r[0].data || []).filter(function (t) { return !t.la_ky_thuat; });
        var lopHoc = {};
        (r[2].data || []).forEach(function (x) { lopHoc[x.lop] = x.co_so_ma || ''; });
        // Phân hiệu gắn với TỪNG TỆP (KQ.coSo), không nhớ từ tệp trước — nhớ sang thì tệp phân hiệu B
        // có thể bị ghi thành bản của A và thay mất A (agent soát 14/9/2026 bắt được).
        // Trường một cơ sở: luôn toàn trường, khỏi hỏi. Nhiều cơ sở: máy đoán được mới điền, không thì bắt chọn.
        KQ = { tenTep: f.name, doc: doc, taiKhoan: tk, tenGoi: r[1].data || [], lopHoc: lopHoc, banCongBo: r[3].data || [],
          lopCuaBan: {}, ghep: [], coSo: '', xacNhan: CS.daHoi && !nhieuCoSo(), coSoDoan: '' };
        if (doc.loi.length) { veSoiThu(); return; }
        if (nhieuCoSo()) {
          var dem = {};
          doc.lop.forEach(function (l) { var c = lopHoc[l.ten]; if (c) dem[c] = (dem[c] || 0) + 1; });
          var tot = Object.keys(dem).sort(function (a, b) { return dem[b] - dem[a]; })[0];
          if (tot && dem[tot] === doc.lop.length) { KQ.coSoDoan = tot; KQ.coSo = tot; KQ.xacNhan = true; }
        }
        KQ.ghep = ghepTheoCoSo();
        // Lớp của các bản đã công bố còn có thể có hiệu lực từ mốc trở đi — để chặn hai phân hiệu trùng tên lớp
        var moc = homNayISO();
        if (doc.tieuDe.apDungTu && doc.tieuDe.apDungTu < moc) moc = doc.tieuDe.apDungTu;
        KQ.mocSoat = moc;
        var ids = banConHieuLuc(KQ.banCongBo, moc).map(function (p) { return p.id; });
        return docLopCuaBan(ids).then(function (m) { KQ.lopCuaBan = m; veSoiThu(); });
      });
    }).catch(function (e) {
      ket.innerHTML = '<div class="hd-kiem do"><b>Không đọc được tệp.</b><br>' + loiBang(e) + '</div>';
    });
  }

  var CACH = {
    'phan-cong': ['xanh', 'khớp phân công'], 'chu-nhiem': ['xanh', 'chủ nhiệm'], 'ten-goi': ['vang', 'theo tên gọi'],
    'da-luu': ['xanh', 'đã ghép lần trước'], 'ho-ten': ['xanh', 'trùng họ tên'], 'trung-ten': ['do', 'trùng tên — chọn tay'],
    'chon-tay': ['xanh', 'chọn tay']
  };
  function chip(ma) {
    var c = CACH[ma];
    if (!c) return '<span class="tkb-chip do">chưa ghép</span>';
    return '<span class="tkb-chip ' + c[0] + '">' + c[1] + '</span>';
  }

  function veSoiThu() {
    var ket = document.getElementById('tkbn-ket');
    if (!ket || !KQ) return;
    var d = KQ.doc;
    if (d.loi.length) {
      ket.innerHTML = '<div class="hd-kiem do"><b>Chưa ghi gì — tệp có lỗi:</b><br>' + d.loi.map(thoat).join('<br>') + '</div>';
      return;
    }
    var namNay = (window.CAU_HINH && window.CAU_HINH.NAM_HOC) || '';
    var giu = KQ.giu || {};             // giá trị người nạp đã sửa trước khi đổi phân hiệu
    var nam = giu['tkbn-nam'] !== undefined ? giu['tkbn-nam'] : (d.tieuDe.namHoc || namNay);
    var ngay = giu['tkbn-ngay'] !== undefined ? giu['tkbn-ngay'] : (d.tieuDe.apDungTu || homNayISO());
    var ky = giu['tkbn-ky'] !== undefined ? +giu['tkbn-ky'] : (d.tieuDe.hocKy === 2 ? 2 : 1);
    var coBuocCS = nhieuCoSo();
    var gv = KQ.ghep;
    var thieuEmail = gv.filter(function (g) { return !g.email; }).length;
    var theoTen = {};
    KQ.taiKhoan.forEach(function (t) { theoTen[t.email] = t; });

    var html =
      '<div class="hd-kiem xanh" style="margin-top:14px"><b>Đã đọc xong — chưa ghi gì vào hệ thống.</b><br>' +
      'Tệp <b>' + thoat(KQ.tenTep) + '</b>' + (d.tieuDe.truong ? ' · ' + thoat(d.tieuDe.truong) : '') + '</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri"><tbody>' +
      dong('Đọc được', '<b>' + d.lop.length + '</b> lớp · <b>' + d.tiet.length + '</b> tiết · <b>' + d.nhan.length + '</b> giáo viên' +
        (d.coThu7 ? ' · <b>có học thứ Bảy</b>' : '')) +
      dong('Đối chiếu lưới giáo viên', d.coTrangGV ? (d.lech ? '<b style="color:var(--canh)">' + d.lech + ' tiết lệch</b> — máy lấy theo lưới lớp' : '✅ khớp từng tiết') : 'trang giáo viên không có hoặc chưa điền — bỏ qua (không bắt buộc)') +
      dong('Giáo viên trùng tiết', d.trungGV.length ? '<b style="color:var(--thieu)">' + d.trungGV.length + ' chỗ</b><br><small>' +
        d.trungGV.slice(0, 5).map(thoat).join('<br>') + (d.trungGV.length > 5 ? '<br>…' : '') + '</small>' : '✅ không có') +
      '</tbody></table></div>' +
      (d.nhac.length ? '<div class="hd-kiem vang">' + d.nhac.map(thoat).join('<br>') + '</div>' : '') +

      (coBuocCS ?
        '<div class="nap-buoc"><div class="nap-so">2</div><div class="nap-noi">' +
          '<span class="nap-nhan">Tệp này của phân hiệu nào?</span>' +
          '<div class="tkb-hang-o">' + htmlChonCoSo('tkbn-cs-2', KQ.xacNhan ? KQ.coSo : null) + '</div>' +
          '<div class="nap-mach">' + (KQ.coSoDoan && KQ.coSoDoan === KQ.coSo ? '✅ Máy đoán theo danh sách lớp năm học: cả ' + d.lop.length +
            ' lớp trong tệp thuộc <b>' + thoat(tenCoSo(KQ.coSo)) + '</b>. ' :
            (!KQ.xacNhan ? '<b style="color:var(--canh)">Máy chưa đoán được</b> (lớp trong tệp chưa khai đủ ở danh sách lớp năm học) — chọn rõ phân hiệu. ' : '')) +
          'Mỗi phân hiệu nạp một tệp; màn xem tự ghép các phân hiệu thành thời khóa biểu toàn trường. ' +
          'Nạp lại tệp của một phân hiệu chỉ thay lớp của phân hiệu đó.</div>' +
        '</div></div>' : '') +

      '<div class="nap-buoc"><div class="nap-so">' + (coBuocCS ? 3 : 2) + '</div><div class="nap-noi">' +
        '<span class="nap-nhan">Áp dụng từ ngày · năm học · học kỳ</span>' +
        '<div class="tkb-hang-o">' +
        '<input type="date" id="tkbn-ngay" class="nap-chon" value="' + thoat(ngay) + '">' +
        '<input type="text" id="tkbn-nam" class="nap-chon" value="' + thoat(nam) + '" placeholder="2026-2027" style="max-width:130px">' +
        '<select id="tkbn-ky" class="nap-chon" style="max-width:120px">' +
          '<option value="1"' + (ky === 2 ? '' : ' selected') + '>Học kỳ 1</option>' +
          '<option value="2"' + (ky === 2 ? ' selected' : '') + '>Học kỳ 2</option></select>' +
        '</div>' +
        '<div class="nap-mach">' + (d.tieuDe.apDungTu ? 'Máy lấy ngày trong dòng "Thực hiện từ ngày…" của tệp.' :
          '<b>Tệp không ghi ngày áp dụng</b> — chọn ngày thời khóa biểu này bắt đầu dùng.') +
        (d.tieuDe.namHoc && namNay && d.tieuDe.namHoc !== namNay ? ' <b style="color:var(--canh)">Tệp ghi năm học ' +
          thoat(d.tieuDe.namHoc) + ', năm học hiện hành là ' + thoat(namNay) + ' — kiểm lại có xuất nhầm tệp cũ không.</b>' : '') +
        '</div></div></div>' +

      '<div class="nap-buoc"><div class="nap-so">' + (coBuocCS ? 4 : 3) + '</div><div class="nap-noi">' +
        '<span class="nap-nhan">Ghép tên gọi trong tệp với tài khoản</span>' +
        '<div class="nap-mach">Ghép đúng thì giáo viên mở app là thấy ngay "TKB của tôi". ' +
        (thieuEmail ? '<b style="color:var(--canh)">' + thieuEmail + ' người chưa ghép được tài khoản</b> — chọn tay ở cột cuối; ' +
          'để trống thì thời khóa biểu vẫn ghi đủ, chỉ người đó chưa thấy mục "của tôi".' : '✅ Ghép đủ tất cả.') +
        ' Chọn tay một lần là máy nhớ cho các lần nạp sau.</div>' +
      '</div></div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho tkb-bang-ghep"><thead><tr>' +
      '<th>Tên gọi trong tệp</th><th>Họ tên (trang PCGD)</th><th>Số tiết</th><th>Tài khoản</th></tr></thead><tbody>' +
      gv.map(function (g, i) {
        var tk = g.email ? theoTen[g.email] : null;
        return '<tr' + (g.email ? '' : ' class="dong-cho"') + '>' +
          '<td><b>' + thoat(g.nhan) + '</b>' + (g.lopCN ? '<br><small>CN ' + thoat(g.lopCN) + '</small>' : '') + '</td>' +
          '<td>' + (g.hoTen ? thoat(g.hoTen) + '<br>' + chip(g.cachTen) : '<span class="tkb-chip do">không tìm thấy</span>') + '</td>' +
          '<td class="so">' + g.soTiet + '</td>' +
          '<td><select data-i="' + i + '" class="tkbn-chon-tk"><option value="">— chưa ghép —</option>' +
          KQ.taiKhoan.map(function (t) {
            return '<option value="' + thoat(t.email) + '"' + (t.email === g.email ? ' selected' : '') + '>' +
              thoat(t.ho_ten) + (t.chuc_vu ? ' · ' + thoat(t.chuc_vu) : '') + '</option>';
          }).join('') + '</select>' + (g.email ? '<br>' + chip(g.cachEmail) : (g.cachEmail === 'trung-ten' ? '<br>' + chip('trung-ten') : '')) +
          (tk ? '' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +

      '<div id="tkbn-kiem-cs"></div>' +
      '<div class="nap-hanh-dong" style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">' +
      '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="tkbn-cong-bo"' + (giu.congBo === false ? '' : ' checked') + '> Công bố ngay cho mọi CBGV</label>' +
      '<button class="nut-chinh" id="tkbn-ghi">📥 Ghi thời khóa biểu (' + d.tiet.length + ' tiết)</button>' +
      '<button class="dh-nut-nho" id="tkbn-huy">Huỷ</button></div>' +
      '<div id="tkbn-tien" style="margin-top:12px"></div>';

    ket.innerHTML = html;
    KQ.giu = null;
    var cs2 = document.getElementById('tkbn-cs-2');
    if (cs2) cs2.addEventListener('change', function () { doiCoSo(cs2.value); });
    document.getElementById('tkbn-ngay').addEventListener('change', veKiemCoSo);
    Array.prototype.slice.call(ket.querySelectorAll('.tkbn-chon-tk')).forEach(function (s) {
      s.addEventListener('change', function () {
        if (!KQ) return;
        var g = KQ.ghep[+s.getAttribute('data-i')];
        g.email = s.value; g.cachEmail = s.value ? 'chon-tay' : '';
        s.closest('tr').classList.toggle('dong-cho', !s.value);
      });
    });
    document.getElementById('tkbn-ghi').addEventListener('click', ghi);
    document.getElementById('tkbn-huy').addEventListener('click', function () { KQ = null; window.veQuanTri(); });
    veKiemCoSo();
  }
  function dong(a, b) { return '<tr><td style="white-space:nowrap">' + a + '</td><td>' + b + '</td></tr>'; }

  // ── Soát phân hiệu trước khi ghi. chan = không cho ghi · nhac = cho ghi, nói rõ hệ quả ──
  // Các bản đã công bố còn có thể có hiệu lực từ ngày moc trở đi: bản đang dùng ngày đó + mọi bản áp dụng sau
  function banConHieuLuc(ds, moc) {
    var ra = [], co = {};
    var dung = window.TKB_XEM && window.TKB_XEM.phienBanNgay ? window.TKB_XEM.phienBanNgay(ds, moc) : null;
    (dung ? (dung.thanhPhan || [dung]) : []).concat((ds || []).filter(function (p) { return p.cong_bo && p.ap_dung_tu > moc; }))
      .forEach(function (p) { if (!co[p.id]) { co[p.id] = 1; ra.push(p); } });
    return ra;
  }
  function kiemCoSo(ngay) {
    var chan = [], nhac = [], d = KQ.doc, cs = KQ.coSo;
    // Không hỏi được danh sách cơ sở (mạng/phiên) thì KHÔNG coi là trường một cơ sở — ghi nhầm thành
    // bản toàn trường sẽ che mất các phân hiệu khác (soát vòng 2)
    if (!CS.daHoi) {
      chan.push('Chưa đọc được danh sách phân hiệu của trường (lỗi mạng hoặc hết phiên đăng nhập?) — tải lại trang rồi chọn lại tệp.');
      return { chan: chan, nhac: nhac };
    }
    if (!KQ.xacNhan) {
      chan.push('Chọn <b>tệp này của phân hiệu nào</b> ở bước 2 (hoặc Toàn trường nếu tệp có mọi lớp).');
      return { chan: chan, nhac: nhac };
    }
    if (cs && CS.coCot !== true) {
      chan.push(CS.coCot === false
        ? 'Cơ sở dữ liệu của trường <b>chưa nâng cấp để nạp theo phân hiệu</b> — người phụ trách hệ thống chạy ' +
          '<code>sql/66-tkb-theo-phan-hieu.sql</code> một lần. Trong lúc chờ chỉ nạp được bản Toàn trường.'
        : 'Chưa kiểm được cơ sở dữ liệu đã nâng cấp nạp theo phân hiệu chưa (lỗi mạng?) — tải lại trang rồi thử lại.');
      return { chan: chan, nhac: nhac };
    }
    var dsLop = d.lop.map(function (l) { return l.ten; });
    // Lớp trong tệp mà danh sách lớp năm học ghi thuộc phân hiệu KHÁC
    if (cs) {
      var lech = dsLop.filter(function (l) { return KQ.lopHoc[l] && KQ.lopHoc[l] !== cs; });
      if (lech.length) {
        nhac.push('<b>' + lech.length + ' lớp</b> trong tệp (' + thoat(lech.slice(0, 8).join(', ')) + (lech.length > 8 ? '…' : '') +
          ') đang thuộc phân hiệu khác trong danh sách lớp năm học — kiểm lại chọn đúng phân hiệu chưa.');
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay || '')) return { chan: chan, nhac: nhac };
    if (KQ.mocSoat && ngay < KQ.mocSoat) {
      nhac.push('Ngày áp dụng sớm hơn ' + ngayVN(KQ.mocSoat) + ' — máy chỉ soát trùng tên lớp từ ngày đó trở đi.');
    }
    var coTap = {};
    dsLop.forEach(function (l) { coTap[l] = 1; });
    banConHieuLuc(KQ.banCongBo, ngay).forEach(function (p) {
      var pv = p.co_so_ma || '';
      if (pv === cs) return;                              // cùng phạm vi: bản mới thay bản cũ
      var trung = Object.keys(KQ.lopCuaBan[p.id] || {}).filter(function (l) { return coTap[l]; });
      var khi = p.ap_dung_tu > ngay ? 'sẽ áp dụng từ ' : 'áp dụng từ ';
      if (!pv) {
        if (trung.length) nhac.push('Bản <b>Toàn trường</b> ' + khi + ngayVN(p.ap_dung_tu) + ' có ' + trung.length + ' lớp này — ' +
          (p.ap_dung_tu > ngay ? 'từ ngày đó bản toàn trường sẽ thay lại cả trường.' :
            'sau khi ghi, các lớp đó lấy theo tệp ' + thoat(tenCoSo(cs)) + ', lớp phân hiệu khác giữ nguyên.'));
        return;
      }
      if (!cs) {
        nhac.push('Có bản riêng của <b>' + thoat(tenCoSo(pv)) + '</b> (' + khi + ngayVN(p.ap_dung_tu) + '). ' +
          (p.ap_dung_tu > ngay ? 'Từ ngày đó, lớp của phân hiệu ấy lấy theo bản riêng.' :
            'Ghi bản <b>Toàn trường</b> này sẽ THAY cả bản đó — nếu tệp chỉ của một phân hiệu thì chọn phân hiệu ở bước 2.'));
        return;
      }
      if (trung.length) {
        chan.push('Tên lớp <b>trùng</b> với bản của <b>' + thoat(tenCoSo(pv)) + '</b> (' + khi + ngayVN(p.ap_dung_tu) + '): ' +
          thoat(trung.slice(0, 10).join(', ')) + (trung.length > 10 ? '…' : '') +
          '. Hai phân hiệu không được cùng tên lớp — đặt lại tên lớp trong Smart Scheduler ' +
          'cho khớp danh sách lớp của trường (ví dụ 1A-DĐ) rồi xuất lại tệp, hoặc kiểm lại có chọn nhầm phân hiệu không.');
      }
    });
    return { chan: chan, nhac: nhac };
  }
  function veKiemCoSo() {
    if (!KQ || KQ.doc.loi.length) return;
    var vung = document.getElementById('tkbn-kiem-cs');
    var nutGhi = document.getElementById('tkbn-ghi');
    var o = document.getElementById('tkbn-ngay');
    var k = kiemCoSo(o ? o.value : '');
    if (vung) vung.innerHTML = (k.chan.length ? '<div class="hd-kiem do" style="margin-top:12px"><b>Chưa ghi được:</b><br>' + k.chan.join('<br>') + '</div>' : '') +
      (k.nhac.length ? '<div class="hd-kiem vang" style="margin-top:12px">' + k.nhac.join('<br>') + '</div>' : '');
    if (nutGhi) nutGhi.disabled = k.chan.length > 0;
  }

  // ══════════════════════════════════════════════════════════════
  // GHI
  // ══════════════════════════════════════════════════════════════
  function ghi() {
    if (DANG_GHI || !KQ) return;
    var d = KQ.doc;
    var ngay = document.getElementById('tkbn-ngay').value;
    var nam = String(document.getElementById('tkbn-nam').value || '').trim();
    var ky = +document.getElementById('tkbn-ky').value;
    var congBo = document.getElementById('tkbn-cong-bo').checked;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) { bao('Chọn ngày áp dụng trước đã.'); return; }
    if (!/^\d{4}-\d{4}$/.test(nam)) { bao('Năm học ghi dạng 2026-2027.'); return; }
    var kiem = kiemCoSo(ngay);
    if (kiem.chan.length) { veKiemCoSo(); bao('Chưa ghi được — xem khung đỏ phía trên nút Ghi.'); return; }
    var cs = KQ.coSo;

    var emailCua = {}, tenCua = {};
    KQ.ghep.forEach(function (g) { emailCua[g.nhan] = g.email || ''; tenCua[g.nhan] = g; });
    var pcgd = d.pcgd;
    var p = {
      nam_hoc: nam, hoc_ky: ky, ap_dung_tu: ngay, ten_tep: KQ.tenTep,
      tieu_de: [d.tieuDe.truong, cs ? tenCoSo(cs) : '', d.tieuDe.namHoc, d.tieuDe.hocKy ? 'HK' + d.tieuDe.hocKy : ''].filter(Boolean).join(' · '),
      cong_bo: congBo,
      tiet: d.tiet.map(function (x) {
        return { lop: x.lop, thu: x.thu, buoi: x.buoi, tiet: x.tiet, mon: x.mon, gv_nhan: x.nhan, gv_email: emailCua[x.nhan] || '' };
      }),
      giao_vien: KQ.ghep.map(function (g) {
        var pc = g.pcgdIdx >= 0 ? pcgd[g.pcgdIdx] : null;
        return { gv_nhan: g.nhan, ho_ten: g.hoTen || '', email: g.email || '', lop_cn: g.lopCN || (pc ? pc.cn : ''),
          phan_cong: pc ? pc.phanCong : '', so_tiet: g.soTiet, so_tiet_pcgd: pc ? pc.soTiet : null };
      }),
      // Chỉ nhớ những cặp CHẮC: chọn tay hoặc đã ghép qua họ tên / lần trước
      ten_goi: KQ.ghep.filter(function (g) { return g.email; }).map(function (g) {
        return { gv_nhan: khoaTenGoi(g.nhan), email: g.email, ho_ten: g.hoTen || '' };
      })
    };
    // Chỉ gửi co_so_ma khi CSDL đã có cột (sql/66); bản toàn trường gửi null cho rõ
    if (CS.coCot) p.co_so_ma = cs || null;
    var hoi = 'Ghi thời khóa biểu ' + (cs ? tenCoSo(cs) + ' — ' : (nhieuCoSo() ? 'TOÀN TRƯỜNG — ' : '')) +
      d.lop.length + ' lớp · ' + d.tiet.length + ' tiết, áp dụng từ ' + ngayVN(ngay) + '?\n\n' +
      (congBo ? '· CÔNG BỐ NGAY — mọi CBGV thấy từ ngày áp dụng.\n' : '· Để BẢN NHÁP — chỉ quản trị thấy, công bố sau.\n') +
      '· Bản đang dùng (nếu có) giữ nguyên để tra lại.\n' +
      (KQ.ghep.filter(function (g) { return !g.email; }).length ? '· ' + KQ.ghep.filter(function (g) { return !g.email; }).length + ' giáo viên chưa ghép tài khoản.\n' : '');
    var xn = window.hopHoi ? window.hopHoi(hoi, { tieuDe: 'Ghi thời khóa biểu', nutOK: 'Ghi' }) : Promise.resolve(window.confirm(hoi));
    xn.then(function (ok) {
      if (!ok) return;
      DANG_GHI = true;
      var nut = document.getElementById('tkbn-ghi'); nut.disabled = true;
      var tien = document.getElementById('tkbn-tien');
      tien.innerHTML = '<div class="the-thong-bao">Đang ghi…</div>';
      may().rpc('tkb_nap', { p: p }).then(function (r) {
        DANG_GHI = false;
        if (r.error) {
          nut.disabled = false;
          tien.innerHTML = '<div class="hd-kiem do"><b>Chưa ghi được.</b><br>' + loiBang(r.error) +
            '<br>Hàm ghi chạy trong một giao dịch nên <b>không có gì ghi dở</b> — sửa xong bấm ghi lại.</div>';
          return;
        }
        tien.innerHTML = '<div class="hd-kiem xanh"><b>Xong.</b> Đã ghi phiên bản thời khóa biểu áp dụng từ ' + ngayVN(ngay) +
          (congBo ? ' và công bố cho mọi CBGV.' : ' dưới dạng bản nháp.') +
          ' Xem ở màn <b>Điều hành › Thời khóa biểu</b>.</div>';
        KQ = null;
        var nutXong = document.getElementById('tkbn-ghi');
        if (nutXong) nutXong.remove();
        if (window.TKB_XEM && window.TKB_XEM.xoaBoNho) window.TKB_XEM.xoaBoNho();
        veDanhSach();
      }, function (e) {
        DANG_GHI = false; nut.disabled = false;
        tien.innerHTML = '<div class="hd-kiem do"><b>Không gọi được máy chủ.</b><br>' + thoat((e && e.message) || e) + '</div>';
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // TẢI MẪU — đúng 10 trang như Smart Scheduler, điền sẵn lớp + giáo viên
  // ══════════════════════════════════════════════════════════════
  function taiVe(byte, ten) {
    var blob = new Blob([byte], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var u = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = u; a.download = ten;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  function taiMau() {
    if (!window.EXCEL_DEP || !window.TKB_DOC) { bao('Chưa nạp được bộ tạo tệp — tải lại trang rồi thử lại.'); return; }
    var nut = document.getElementById('tkbn-mau'); if (nut) nut.disabled = true;
    var nam = (window.CAU_HINH && window.CAU_HINH.NAM_HOC) || '';
    var cs = CS.mau || '';
    var opt = { tenTruong: (window.CAU_HINH && window.CAU_HINH.TEN_TRUONG) || '', phanHieu: cs ? tenCoSo(cs) : '', namHoc: nam, hocKy: 1 };
    Promise.all([
      may().from('lop_hoc').select('lop,co_so_ma').eq('nam_hoc', nam),
      may().from('moi_tai_khoan').select('ho_ten,vai_tro,la_ky_thuat,co_so_ma').order('ho_ten')
    ]).then(function (r) {
      // Mẫu của một phân hiệu: chỉ lớp + người của phân hiệu đó (chưa khai thì để lớp mẫu / cả trường)
      var dsLop = (r[0].data || []).filter(function (x) { return !cs || x.co_so_ma === cs; });
      var lop = dsLop.map(function (x) { return String(x.lop); }).sort(function (a, b) { return a.localeCompare(b, 'vi', { numeric: true }); });
      if (lop.length) opt.lop = lop;
      var nguoi = (r[1].data || []).filter(function (t) { return !t.la_ky_thuat && t.vai_tro !== 'nhan_vien'; });
      var nguoiCS = cs ? nguoi.filter(function (t) { return t.co_so_ma === cs; }) : nguoi;
      opt.giaoVien = (nguoiCS.length ? nguoiCS : nguoi).map(function (t) { return { hoTen: t.ho_ten }; });
    }, function () {}).then(function () {
      var m = window.TKB_DOC.mauTep(opt);
      taiVe(window.EXCEL_DEP.tao(m), m.ten);
      bao('✅ Đã tải ' + m.ten + ' — điền ô vàng rồi chọn lại tệp đó.');
    }).catch(function (e) { bao('Không tạo được tệp mẫu: ' + ((e && e.message) || e)); })
      .then(function () { if (nut) nut.disabled = false; });
  }

  window.qtTabPhu.push({ ma: 'tkb', ten: '🗓️ Thời khóa biểu', ve: veTab });
})();
