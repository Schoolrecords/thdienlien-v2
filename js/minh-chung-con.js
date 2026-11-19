// ============================================================
// minh-chung-con.js — MINH CHỨNG CỤ THỂ TRONG HỒ SƠ (TT57, bước 2 — 20/11/2026)
//
// Vì sao có: một hồ sơ trong kho là cả một tập (vd "Sổ nghị quyết và kế hoạch công tác").
// Phụ lục IV TT57 và danh mục mẫu 80 mã của Bộ (tập huấn 23/9/2026) đặt mã cho TỪNG VĂN BẢN
// chứng minh một ý — nhất là minh chứng MỨC 2 (đã rà soát, điều chỉnh, có kết quả trước – sau).
// Rà danh mục QC1 bản 7 (20/11/2026): đủ Mức 1 cho 15 tiêu chí nhưng thiếu minh chứng Mức 2 ở
// 1.3, 2.1, 3.1, 3.2, 4.1, 4.2 (bắt buộc). Không lập hồ sơ mới (TT57 Đ.8 k.2): Ban giám hiệu gắn
// văn bản ĐÃ CÓ trong hồ sơ, đặt mã MC riêng, ghi Mức 1/Mức 2 và năm học.
//
// Dữ liệu: bảng minh_chung (sql/93 tiểu học · MẦM NON/sql/minh-chung-con-mn.sql). Chưa chạy SQL
// → phần này ẩn, mọi thứ khác chạy như cũ. Mã cấp tiếp số lớn nhất của tiêu chí, tính CẢ hồ sơ
// và minh chứng đã đóng — mã đã dùng không cấp lại (PL IV II.1a: mỗi mã duy nhất).
//
// 🔑 BẢN TIỂU HỌC và BẢN MẦM NON chỉ khác bảng GOI_Y bên dưới. Sửa thì sửa cả hai.
// ============================================================
(function () {
  'use strict';

  // Gợi ý minh chứng MỨC 2 theo tiêu chí (tài liệu tập huấn TT57 của Bộ). Đây là GỢI Ý tên văn bản
  // cần tìm trong hồ sơ, không phải quy định — trường gắn văn bản thật đã có.
  var GOI_Y = {
    "1.1": [
      "Biên bản rà soát, điều chỉnh mục tiêu, kế hoạch theo kết quả thực hiện và dữ liệu"
    ],
    "1.2": [
      "Biên bản rà soát, điều chỉnh phân công khi thay đổi nhân sự (xử lý chồng chéo, bỏ sót, quá tải)"
    ],
    "1.3": [
      "Báo cáo rà soát, đối chiếu dữ liệu (cơ sở dữ liệu ngành, sổ điểm điện tử, học bạ số)",
      "Biên bản khắc phục sai lệch dữ liệu; điều chỉnh kế hoạch, nguồn lực theo dữ liệu"
    ],
    "1.4": [
      "Hồ sơ theo dõi thực hiện kế hoạch cải tiến (tối thiểu 02 lần/năm học)",
      "Minh chứng kết quả cải tiến (chỉ số trước – sau)"
    ],
    "2.1": [
      "Hồ sơ tự đánh giá, điều chỉnh hoạt động quản lý dựa trên dữ liệu, kết quả kiểm tra nội bộ"
    ],
    "2.2": [
      "Minh chứng điều chỉnh dạy học sau sinh hoạt chuyên môn, bồi dưỡng"
    ],
    "2.3": [
      "Hồ sơ rà soát, điều chỉnh phân công hoặc đề xuất bổ sung nhân sự hỗ trợ"
    ],
    "3.1": [
      "Minh chứng điều chỉnh kế hoạch giáo dục theo tiến độ, chuyên cần, kết quả học tập"
    ],
    "3.2": [
      "Minh chứng dùng kết quả đánh giá học sinh để điều chỉnh cách dạy và tác động đến học sinh"
    ],
    "3.3": [
      "Minh chứng điều chỉnh hoạt động giáo dục theo mức độ tham gia, phản hồi của học sinh"
    ],
    "3.4": [
      "Báo cáo theo dõi kết quả hỗ trợ học sinh và điều chỉnh biện pháp"
    ],
    "3.5": [
      "Phân tích tiến bộ của nhóm học sinh cần hỗ trợ qua các đợt đánh giá"
    ],
    "4.1": [
      "Minh chứng cải thiện cơ sở vật chất, thiết bị dựa trên dữ liệu tình trạng"
    ],
    "4.2": [
      "Phân tích sự cố, khảo sát và biện pháp phòng ngừa tái diễn"
    ],
    "4.3": [
      "Minh chứng phản hồi hai chiều với cha mẹ học sinh và tác động của nguồn lực huy động"
    ]
  };

  var MCC = [];                 // các dòng minh_chung đọc từ CSDL
  window.CO_BANG_MCC = false;   // CSDL đã có bảng minh_chung (sql/93) chưa
  function $(id) { return document.getElementById(id); }
  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s); }
  function laBGH() {
    var n = window.NGUOI_DUNG;
    return !!(n && (n.vai_tro === 'admin' || n.vai_tro === 'ban_giam_hieu'));
  }
  function soMa(a, b) {
    var x = String(a).split('.').slice(1).map(Number), y = String(b).split('.').slice(1).map(Number);
    for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] || 0) - (y[i] || 0);
    return 0;
  }

  // Đọc bảng — LUÔN resolve, kể cả khi kho chưa có bảng (lỗi 42P01 / PGRST205) hay RLS chặn.
  window.taiMinhChungCon = function () {
    var may = window.MAY_CHU;
    if (!may) return Promise.resolve();
    return Promise.resolve(may.from('minh_chung').select('*').order('ma')).then(function (r) {
      if (r && !r.error) { MCC = r.data || []; window.CO_BANG_MCC = true; }
      else { MCC = []; window.CO_BANG_MCC = false; }
    }, function () { MCC = []; window.CO_BANG_MCC = false; });
  };

  // Minh chứng cụ thể dạng giống phần tử HO_SO, để mọi danh sách minh chứng dùng chung.
  function hoSoCha(ma) { return (window.HO_SO || []).filter(function (h) { return h.ma === ma; })[0]; }
  function thanhMuc(m) {
    var cha = hoSoCha(m.ho_so_ma) || {};
    return {
      ma: m.ma, ten: m.ten, tc: m.tieu_chi || [], tt: 'co', link: m.link || '', hop: cha.hop || '',
      phuTrach: cha.phuTrach || '', laCon: true, cha: m.ho_so_ma || '', muc: m.muc || 1,
      nam: m.nam_hoc || '', dinhDang: m.dinh_dang || ''
    };
  }
  window.dsMinhChungCon = function (maCha) {
    return MCC.filter(function (m) { return m.trang_thai !== 'da_dong' && (!maCha || m.ho_so_ma === maCha); }).map(thanhMuc);
  };
  // Hồ sơ đang quản lý + minh chứng cụ thể — nguồn cho mọi danh sách minh chứng TT57.
  window.dsHoSoVaMCC = function () {
    var goc = window.HO_SO || [];   // bản tiểu học (bản mầm non lấy danh sách hồ sơ đang quản lý)
    return goc.concat(window.dsMinhChungCon());
  };

  // Mã tiếp theo của tiêu chí: lớn nhất trong hồ sơ (kể cả đã đóng) và minh chứng (kể cả đã bỏ) + 1.
  function maTiep(tc) {
    var dau = 'MC.' + tc + '.', lon = 0;
    (window.HO_SO || []).map(function (h) { return h.ma; }).concat(MCC.map(function (m) { return m.ma; }))
      .forEach(function (ma) {
        ma = String(ma || '');
        if (ma.indexOf(dau) === 0) { var n = parseInt(ma.slice(dau.length), 10); if (n > lon) lon = n; }
      });
    if (lon >= 99) return null;
    return dau + (lon + 1 < 10 ? '0' : '') + (lon + 1);
  }

  // ── Khối trong ô sửa hồ sơ ──
  var maCha = null;
  function dungKhoi() {
    if ($('hsOMCC')) return true;
    var loi = $('hsLoi');
    if (!loi) return false;
    var k = document.createElement('div');
    k.className = 'hs-o'; k.id = 'hsOMCC'; k.style.display = 'none';
    k.innerHTML = '<label>Minh chứng cụ thể trong hồ sơ này (TT57)</label>' +
      '<div class="goi-y">Gắn từng văn bản ĐÃ CÓ trong hồ sơ (biên bản rà soát, báo cáo kết quả trước – sau…) làm minh chứng riêng, ' +
      'có mã riêng — nhất là minh chứng <b>Mức 2</b>. Không lập văn bản mới chỉ để tự đánh giá.</div>' +
      '<div id="mccDs" style="margin:6px 0"></div>' +
      '<div id="mccThem" style="border:1px dashed #b9c3cc;border-radius:8px;padding:8px;margin-top:6px">' +
      '<label style="margin:0">Thêm minh chứng</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0">' +
      '<select id="mccTc" style="flex:1;min-width:150px"></select>' +
      '<select id="mccMuc" style="width:130px"><option value="2">Mức 2</option><option value="1">Mức 1</option></select>' +
      '<input id="mccNam" style="width:120px" placeholder="Năm học"></div>' +
      '<div id="mccGoiY" style="margin:0 0 6px"></div>' +
      '<input id="mccTen" placeholder="Tên văn bản, vd: Biên bản họp Hội đồng sư phạm ngày 08/01/2027 rà soát, điều chỉnh kế hoạch năm học">' +
      '<input id="mccLink" style="margin-top:6px" placeholder="Link tệp trên Drive (https://drive.google.com/file/d/…)">' +
      '<input id="mccDinhDang" style="margin-top:6px" placeholder="Nếu không có link: định dạng, nơi lưu (vd Bản giấy, tủ hồ sơ văn phòng)">' +
      '<div style="margin-top:6px;display:flex;gap:8px;align-items:center"><button type="button" class="nut-vien nho" id="mccLuu">＋ Gắn minh chứng</button>' +
      '<span id="mccBao" class="goi-y" style="margin:0"></span></div></div>';
    loi.parentNode.insertBefore(k, loi);
    $('mccTc').addEventListener('change', veGoiY);
    $('mccLuu').addEventListener('click', luu);
    $('mccDs').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-bo-mcc]');
      if (b) boMCC(b.getAttribute('data-bo-mcc'));
    });
    $('mccGoiY').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-goi-y]');
      if (!b) return;
      $('mccTen').value = b.getAttribute('data-goi-y');
      $('mccMuc').value = '2';
      $('mccTen').focus();
    });
    return true;
  }
  function veGoiY() {
    var ds = GOI_Y[$('mccTc').value] || [];
    $('mccGoiY').innerHTML = ds.length
      ? '<span class="goi-y" style="margin:0">Gợi ý Mức 2 (bấm để điền tên, rồi sửa theo văn bản thật): </span>' +
        ds.map(function (g) {
          return '<button type="button" class="nut-vien nho" style="margin:2px 4px 2px 0" data-goi-y="' + thoat(g) + '">' + thoat(g) + '</button>';
        }).join('')
      : '';
  }
  function veDs() {
    var ds = MCC.filter(function (m) { return m.ho_so_ma === maCha && m.trang_thai !== 'da_dong'; });
    $('mccDs').innerHTML = ds.length ? ds.map(function (m) {
      var ten = thoat(m.ma) + ' · Mức ' + (m.muc || 1) + ' · ' + thoat(m.ten) +
        ' <span class="goi-y" style="margin:0">(tiêu chí ' + thoat((m.tieu_chi || []).join(', ')) + (m.nam_hoc ? ' · ' + thoat(m.nam_hoc) : '') + ')</span>';
      return '<div style="padding:4px 0;border-bottom:1px solid #eef1f4">' +
        (m.link ? '<a href="' + thoat(m.link) + '" target="_blank" rel="noopener">' + ten + '</a>' : ten) +
        ' <button type="button" class="nut-vien nho" data-bo-mcc="' + thoat(m.ma) + '" title="Bỏ khỏi danh mục minh chứng (mã giữ lại, không cấp cho văn bản khác)">Bỏ</button></div>';
    }).join('') : '<div class="goi-y" style="margin:0">Chưa gắn minh chứng cụ thể nào.</div>';
  }
  function moKhoi(ma) {
    if (!dungKhoi()) return;
    maCha = ma;
    var hs = (window.HS_BAN_GHI || {})[ma] || {};
    var hien = window.CO_BANG_MCC && laBGH() && hs.trang_thai !== 'da_dong';
    $('hsOMCC').style.display = hien ? '' : 'none';
    if (!hien) return;
    var tcCha = hs.tieu_chi || [];
    var tatCa = (window.TIEU_CHI || []).map(function (t) { return t.ma; });
    var thu = tcCha.concat(tatCa.filter(function (t) { return tcCha.indexOf(t) < 0; }));
    $('mccTc').innerHTML = thu.map(function (t) {
      var tt = (window.TIEU_CHI || []).filter(function (x) { return x.ma === t; })[0] || {};
      return '<option value="' + thoat(t) + '">Tiêu chí ' + thoat(t) + (tt.batBuoc ? ' (bắt buộc)' : '') +
        (tcCha.indexOf(t) >= 0 ? '' : ' — khác hồ sơ') + '</option>';
    }).join('');
    $('mccMuc').value = '2';
    $('mccNam').value = (window.CAU_HINH || {}).NAM_HOC || '';
    $('mccTen').value = ''; $('mccLink').value = ''; $('mccDinhDang').value = ''; $('mccBao').textContent = '';
    veGoiY(); veDs();
  }

  function sauKhiDoi() {
    window.veTatCa && window.veTatCa();
    window.veLaiLopPhu && window.veLaiLopPhu();
    window.khoiDongTCQG && window.khoiDongTCQG();
  }

  function luu() {
    var ten = $('mccTen').value.trim(), link = $('mccLink').value.trim(), tc = $('mccTc').value;
    if (!ten) { $('mccBao').textContent = 'Ghi tên văn bản.'; return; }
    if (link && !/^https?:\/\//i.test(link)) { $('mccBao').textContent = 'Link phải bắt đầu bằng https://'; return; }
    if (!link && !$('mccDinhDang').value.trim()) { $('mccBao').textContent = 'Có link tệp, hoặc ghi nơi lưu bản giấy.'; return; }
    var nut = $('mccLuu');
    nut.disabled = true; $('mccBao').textContent = 'Đang lưu…';
    function guiLan(lan) {
      var ma = maTiep(tc);
      if (!ma) { nut.disabled = false; $('mccBao').textContent = 'Tiêu chí ' + tc + ' đã dùng hết số 99.'; return; }
      var dong = {
        ma: ma, ten: ten, ho_so_ma: maCha, tieu_chi: [tc], muc: +$('mccMuc').value || 1,
        nam_hoc: $('mccNam').value.trim() || null, link: link || null,
        dinh_dang: $('mccDinhDang').value.trim() || null,
        tao_boi: window.NGUOI_DUNG ? window.NGUOI_DUNG.id : null
      };
      window.MAY_CHU.from('minh_chung').insert(dong).select().single().then(function (r) {
        if (r.error && r.error.code === '23505' && lan < 3) {
          // Mã vừa bị người khác lấy (hai máy cùng thêm) → đọc lại rồi cấp số tiếp.
          return window.taiMinhChungCon().then(function () { guiLan(lan + 1); });
        }
        nut.disabled = false;
        if (r.error) { $('mccBao').textContent = 'Chưa lưu được: ' + r.error.message; return; }
        MCC.push(r.data);
        $('mccTen').value = ''; $('mccLink').value = ''; $('mccDinhDang').value = '';
        $('mccBao').textContent = 'Đã gắn ' + ma + '.';
        veDs(); sauKhiDoi();
      }, function (e) { nut.disabled = false; $('mccBao').textContent = 'Lỗi mạng: ' + (e && e.message || e); });
    }
    guiLan(1);
  }

  function boMCC(ma) {
    var m = MCC.filter(function (x) { return x.ma === ma; })[0];
    if (!m) return;
    window.MAY_CHU.from('minh_chung').update({ trang_thai: 'da_dong' }).eq('ma', ma).select().single().then(function (r) {
      if (r.error) { $('mccBao').textContent = 'Chưa bỏ được: ' + r.error.message; return; }
      m.trang_thai = 'da_dong';
      $('mccBao').textContent = 'Đã bỏ ' + ma + ' (mã giữ lại, không cấp cho văn bản khác).';
      veDs(); sauKhiDoi();
    });
  }

  // Nối vào ô sửa hồ sơ (hoso-sua.js nạp TRƯỚC tệp này).
  var goc = window.moSuaHoSo;
  if (typeof goc === 'function') {
    window.moSuaHoSo = function (ma) {
      var kq = goc.apply(this, arguments);
      try { moKhoi(ma); } catch (e) { /* khối phụ lỗi không được làm hỏng ô sửa */ }
      return kq;
    };
  }

  window.__mcc = { maTiep: maTiep, thanhMuc: thanhMuc, datMCC: function (ds) { MCC = ds; }, GOI_Y: GOI_Y };
})();
