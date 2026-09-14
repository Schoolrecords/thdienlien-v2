// ============================================================
// tkb-nap.js — THẺ "🗓️ Thời khóa biểu" TRONG MÀN QUẢN TRỊ
//
// Thầy Chung chốt 14/9/2026 (sổ dự án 91.13): bỏ link sang app TKB riêng,
// trường tải tệp Smart Scheduler kết xuất lên đây. Luồng ba bước giống thẻ
// Nạp dữ liệu — KHÔNG BAO GIỜ GHI THẲNG:
//   1. Chọn tệp (hoặc tải mẫu 10 trang y hệt Smart Scheduler để điền tay)
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

  var KQ = null;          // { tenTep, doc, ghep, taiKhoan }
  var DANG_GHI = false;
  var thuVien = null;

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
        '<span class="nap-nhan">Chọn tệp Smart Scheduler kết xuất</span>' +
        '<input id="tkbn-tep" type="file" accept=".xls,.xlsx" class="nap-tep-that">' +
        '<label class="nap-nut-tep" for="tkbn-tep">📄 Chọn tệp Excel…</label>' +
        '<span id="tkbn-ten-tep" class="nap-ten-tep">Chưa chọn tệp nào</span>' +
        '<div class="nap-mach">Tệp có 10 trang: PCGD · TKB_LOP_S · TKB_LOP_C · TKB_GV_S · … Trường không dùng Smart Scheduler thì ' +
        '<button type="button" class="nap-nut-mau" id="tkbn-mau">⬇️ Tải mẫu (đúng 10 trang như Smart Scheduler)</button>, ' +
        'điền ô vàng: mỗi ô tiết ghi <code>Môn - Cô X</code>, trang PCGD ghi họ tên và phân công.</div>' +
      '</div></div>' +
      '<div id="tkbn-ket"></div>';

    document.getElementById('tkbn-tep').addEventListener('change', chonTep);
    document.getElementById('tkbn-mau').addEventListener('click', taiMau);
    veDanhSach();
    if (KQ) veSoiThu();
  }

  // ── Danh sách phiên bản ──
  function veDanhSach() {
    var vung = document.getElementById('tkbn-ds');
    if (!vung) return;
    may().from('tkb_phien_ban')
      .select('id,nam_hoc,hoc_ky,ap_dung_tu,ten_tep,so_lop,so_tiet,so_giao_vien,cong_bo,email_nap,nap_luc')
      .order('ap_dung_tu', { ascending: false }).order('id', { ascending: false }).limit(30)
      .then(function (r) {
        if (r.error) { vung.innerHTML = '<div class="hd-kiem do">' + loiBang(r.error) + '</div>'; return; }
        var ds = r.data || [];
        if (!ds.length) {
          vung.innerHTML = '<div class="the-thong-bao">Chưa nạp thời khóa biểu nào. Chọn tệp ở bước dưới.</div>';
          return;
        }
        var homNay = homNayISO();
        var dangDung = ds.filter(function (p) { return p.cong_bo && p.ap_dung_tu <= homNay; })[0];
        vung.innerHTML = '<div class="cuon-ngang"><table class="bang-quan-tri nho"><thead><tr>' +
          '<th>Áp dụng từ</th><th>Năm học · kỳ</th><th>Quy mô</th><th>Tệp</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
          ds.map(function (p) {
            var tt = p.cong_bo
              ? (dangDung && dangDung.id === p.id ? '<b style="color:var(--ok)">● Đang dùng hôm nay</b>'
                : (p.ap_dung_tu > homNay ? '<span style="color:var(--chinh)">● Đã công bố, chờ tới ngày</span>' : '<span class="mo">Bản cũ</span>'))
              : '<span style="color:var(--canh)">● Bản nháp — CBGV chưa thấy</span>';
            return '<tr data-id="' + p.id + '">' +
              '<td><b>' + ngayVN(p.ap_dung_tu) + '</b></td>' +
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
        Array.prototype.slice.call(vung.querySelectorAll('[data-hanh]')).forEach(function (b) {
          b.addEventListener('click', function () { hanhDong(+b.closest('tr').getAttribute('data-id'), b.getAttribute('data-hanh'), b); });
        });
      }, function (e) { vung.innerHTML = '<div class="hd-kiem do">' + loiBang(e) + '</div>'; });
  }

  function hanhDong(id, hanh, nut) {
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
      return Promise.all([
        may().from('moi_tai_khoan').select('email,ho_ten,chuc_vu,co_so_ma,la_ky_thuat').order('ho_ten'),
        may().from('tkb_ten_goi').select('gv_nhan,email,ho_ten')
      ]).then(function (r) {
        if (r[1].error) throw r[1].error;
        var tk = (r[0].data || []).filter(function (t) { return !t.la_ky_thuat; });
        var daLuu = {};
        (r[1].data || []).forEach(function (x) { daLuu[x.gv_nhan] = x; });
        KQ = { tenTep: f.name, doc: doc, taiKhoan: tk, ghep: doc.loi.length ? [] : window.TKB_DOC.ghepTen(doc, tk, daLuu) };
        veSoiThu();
      });
    }).catch(function (e) {
      ket.innerHTML = '<div class="hd-kiem do"><b>Không đọc được tệp.</b><br>' + loiBang(e) + '</div>';
    });
  }

  var CACH = {
    'phan-cong': ['xanh', 'khớp phân công'], 'chu-nhiem': ['xanh', 'chủ nhiệm'], 'ten-goi': ['vang', 'theo tên gọi'],
    'da-luu': ['xanh', 'đã ghép lần trước'], 'ho-ten': ['xanh', 'trùng họ tên'], 'trung-ten': ['do', 'trùng tên — chọn tay']
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
    var nam = d.tieuDe.namHoc || namNay;
    var ngay = d.tieuDe.apDungTu || homNayISO();
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
      dong('Đối chiếu lưới giáo viên', d.coTrangGV ? (d.lech ? '<b style="color:var(--canh)">' + d.lech + ' tiết lệch</b> — máy lấy theo lưới lớp' : '✅ khớp từng tiết') : 'tệp không có trang TKB_GV — bỏ qua') +
      dong('Giáo viên trùng tiết', d.trungGV.length ? '<b style="color:var(--thieu)">' + d.trungGV.length + ' chỗ</b><br><small>' +
        d.trungGV.slice(0, 5).map(thoat).join('<br>') + (d.trungGV.length > 5 ? '<br>…' : '') + '</small>' : '✅ không có') +
      '</tbody></table></div>' +
      (d.nhac.length ? '<div class="hd-kiem vang">' + d.nhac.map(thoat).join('<br>') + '</div>' : '') +

      '<div class="nap-buoc"><div class="nap-so">2</div><div class="nap-noi">' +
        '<span class="nap-nhan">Áp dụng từ ngày · năm học · học kỳ</span>' +
        '<div class="tkb-hang-o">' +
        '<input type="date" id="tkbn-ngay" class="nap-chon" value="' + thoat(ngay) + '">' +
        '<input type="text" id="tkbn-nam" class="nap-chon" value="' + thoat(nam) + '" placeholder="2026-2027" style="max-width:130px">' +
        '<select id="tkbn-ky" class="nap-chon" style="max-width:120px">' +
          '<option value="1"' + (d.tieuDe.hocKy === 2 ? '' : ' selected') + '>Học kỳ 1</option>' +
          '<option value="2"' + (d.tieuDe.hocKy === 2 ? ' selected' : '') + '>Học kỳ 2</option></select>' +
        '</div>' +
        '<div class="nap-mach">' + (d.tieuDe.apDungTu ? 'Máy lấy ngày trong dòng "Thực hiện từ ngày…" của tệp.' :
          '<b>Tệp không ghi ngày áp dụng</b> — chọn ngày thời khóa biểu này bắt đầu dùng.') +
        (d.tieuDe.namHoc && namNay && d.tieuDe.namHoc !== namNay ? ' <b style="color:var(--canh)">Tệp ghi năm học ' +
          thoat(d.tieuDe.namHoc) + ', năm học hiện hành là ' + thoat(namNay) + ' — kiểm lại có xuất nhầm tệp cũ không.</b>' : '') +
        '</div></div></div>' +

      '<div class="nap-buoc"><div class="nap-so">3</div><div class="nap-noi">' +
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

      '<div class="nap-hanh-dong" style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">' +
      '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="tkbn-cong-bo" checked> Công bố ngay cho mọi CBGV</label>' +
      '<button class="nut-chinh" id="tkbn-ghi">📥 Ghi thời khóa biểu (' + d.tiet.length + ' tiết)</button>' +
      '<button class="dh-nut-nho" id="tkbn-huy">Huỷ</button></div>' +
      '<div id="tkbn-tien" style="margin-top:12px"></div>';

    ket.innerHTML = html;
    Array.prototype.slice.call(ket.querySelectorAll('.tkbn-chon-tk')).forEach(function (s) {
      s.addEventListener('change', function () {
        var g = KQ.ghep[+s.getAttribute('data-i')];
        g.email = s.value; g.cachEmail = s.value ? 'chon-tay' : '';
        s.closest('tr').classList.toggle('dong-cho', !s.value);
      });
    });
    document.getElementById('tkbn-ghi').addEventListener('click', ghi);
    document.getElementById('tkbn-huy').addEventListener('click', function () { KQ = null; window.veQuanTri(); });
  }
  function dong(a, b) { return '<tr><td style="white-space:nowrap">' + a + '</td><td>' + b + '</td></tr>'; }

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

    var emailCua = {}, tenCua = {};
    KQ.ghep.forEach(function (g) { emailCua[g.nhan] = g.email || ''; tenCua[g.nhan] = g; });
    var pcgd = d.pcgd;
    var p = {
      nam_hoc: nam, hoc_ky: ky, ap_dung_tu: ngay, ten_tep: KQ.tenTep,
      tieu_de: [d.tieuDe.truong, d.tieuDe.namHoc, d.tieuDe.hocKy ? 'HK' + d.tieuDe.hocKy : ''].filter(Boolean).join(' · '),
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
        return { gv_nhan: g.nhan, email: g.email, ho_ten: g.hoTen || '' };
      })
    };
    var hoi = 'Ghi thời khóa biểu ' + d.lop.length + ' lớp · ' + d.tiet.length + ' tiết, áp dụng từ ' + ngayVN(ngay) + '?\n\n' +
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
        document.getElementById('tkbn-ghi').remove();
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
    var opt = { tenTruong: (window.CAU_HINH && window.CAU_HINH.TEN_TRUONG) || '', namHoc: nam, hocKy: 1 };
    Promise.all([
      may().from('lop_hoc').select('lop').eq('nam_hoc', nam),
      may().from('moi_tai_khoan').select('ho_ten,vai_tro,la_ky_thuat').order('ho_ten')
    ]).then(function (r) {
      var lop = (r[0].data || []).map(function (x) { return String(x.lop); }).sort(function (a, b) { return a.localeCompare(b, 'vi', { numeric: true }); });
      if (lop.length) opt.lop = lop;
      opt.giaoVien = (r[1].data || []).filter(function (t) { return !t.la_ky_thuat && t.vai_tro !== 'nhan_vien'; })
        .map(function (t) { return { hoTen: t.ho_ten }; });
    }, function () {}).then(function () {
      var m = window.TKB_DOC.mauTep(opt);
      taiVe(window.EXCEL_DEP.tao(m), m.ten);
      bao('✅ Đã tải ' + m.ten + ' — điền ô vàng rồi chọn lại tệp đó.');
    }).catch(function (e) { bao('Không tạo được tệp mẫu: ' + ((e && e.message) || e)); })
      .then(function () { if (nut) nut.disabled = false; });
  }

  window.qtTabPhu.push({ ma: 'tkb', ten: '🗓️ Thời khóa biểu', ve: veTab });
})();
