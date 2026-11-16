// ============================================================
// tcqg-eduqa.js — ĐƯA MÀN TRƯỜNG CHUẨN QUỐC GIA KHỚP PHẦN MỀM EduQA
// (bdclgd.vn — phần mềm tự đánh giá TT57 của Sở, tập huấn 16/11/2026)
//
// Bản gốc ở app mầm non (quantriso-mamnon-web); tiểu học chép sang 16/11/2026 —
// sửa thì sửa cả hai. Thầy Chung chốt 16/11/2026: màn TCQG trùng EduQA thì "làm cho chuẩn":
// app là nơi hội đồng SOẠN, EduQA là nơi NỘP. Không bỏ màn, mà nói đúng
// tên mục của EduQA và chuyển nội dung sang không phải gõ lại.
//
// Đối chiếu ô nhập trên EduQA ngày 16/11/2026 (tài khoản tiểu học, chỉ đọc):
//   4.1 Bối cảnh và đặc điểm      : KT-XH địa phương · Thuận lợi · Khó khăn · Đặc điểm người học
//   4.2 Quá trình thực hiện TĐG   : a) Lập kế hoạch · b) Tổ chức thực hiện · c) Kiểm tra, phân tích · d) Tổng hợp và xác nhận
//   4.3 Minh chứng                : Nhập từ Excel (js/xuat-minh-chung-eduqa.js)
//   4.4 Đánh giá tiêu chí         : từng tiêu chí, Mức 1 / Mức 2: "Mô tả hiện trạng" + chèn minh chứng + "Đánh giá: Đạt"
//       Đánh giá chung tiêu chuẩn : Điểm mạnh nổi bật · Điểm hạn chế trọng tâm và nguyên nhân cốt lõi ·
//                                   a) Xu hướng 03 năm · b) Vấn đề trọng tâm ưu tiên cải tiến
//   4.5 Kết luận chung            : Khái quát · a) Với Sở · b) Với UBND · c) Với tổ chức, cá nhân liên quan
//   4.6 Kế hoạch cải tiến         : bảng Tiêu chuẩn · Tiêu chí · Đánh giá hiện trạng · Hạn chế · Nguyên nhân
// Các cột CSDL của app đã khớp từng ô (cùng gốc Biểu 1, Biểu 2 Phụ lục V TT57)
// — tệp này KHÔNG đổi CSDL, chỉ ghép chữ và đặt tên mục.
//
// 🔴 Máy KHÔNG viết hộ: "Mô tả hiện trạng" ghép đúng các đoạn hội đồng đã gõ
//    theo từng nội hàm, nối mã minh chứng đã gắn vào cuối đoạn. Ô trống vẫn trống.
// 🔴 Trên EduQA, ô "Đánh giá: Đạt" do người có thẩm quyền tự tích — gói xuất
//    chỉ ghi kết quả hội đồng đã chấm trong app để đối chiếu.
// ============================================================
(function () {
  'use strict';

  var GOC = 'https://bdclgd.vn/self-assessment/self-assessment-info/';
  var MUC = {
    '3': { ten: '3. Cơ sở dữ liệu nhà trường (3.1–3.5)', url: 'https://bdclgd.vn/self-assessment/school-data/general-info' },
    '4.1': { ten: '4.1 Bối cảnh và đặc điểm', url: GOC + 'context-characteristics' },
    '4.2': { ten: '4.2 Quá trình thực hiện TĐG', url: GOC + 'purpose-scope-process' },
    '4.3': { ten: '4.3 Minh chứng', url: GOC + 'evidence' },
    '4.4': { ten: '4.4 Đánh giá tiêu chí', url: GOC + 'criteria-evaluation' },
    '4.5': { ten: '4.5 Kết luận chung', url: GOC + 'standard-summary' },
    '4.6': { ten: '4.6 Kế hoạch cải tiến chất lượng giáo dục', url: GOC + 'improvement-plan' }
  };
  // Ô văn xuôi của bao_cao_tdg theo mục EduQA (nam_thanh_lap thuộc 3.1 CSDL nhà trường)
  var O_BC = [
    ['4.1', 'kt_xh', 'Điều kiện kinh tế - xã hội địa phương'],
    ['4.1', 'thuan_loi', 'Thuận lợi'],
    ['4.1', 'kho_khan', 'Khó khăn'],
    ['4.1', 'dac_diem_nguoi_hoc', 'Đặc điểm người học'],
    ['4.2', 'lap_ke_hoach', 'a) Lập kế hoạch TĐG'],
    ['4.2', 'to_chuc_thuc_hien', 'b) Tổ chức thực hiện'],
    ['4.2', 'kiem_tra_phan_tich', 'c) Kiểm tra, phân tích'],
    ['4.2', 'tong_hop_xac_nhan', 'd) Tổng hợp và xác nhận kết quả tự đánh giá'],
    ['4.5', 'khai_quat', 'Khái quát về mức độ đáp ứng tiêu chuẩn chất lượng giáo dục'],
    ['4.5', 'kn_so', 'a) Với Sở Giáo dục và Đào tạo'],
    ['4.5', 'kn_ubnd', 'b) Với Ủy ban nhân dân'],
    ['4.5', 'kn_khac', 'c) Với tổ chức, cá nhân liên quan (nếu có)']
  ];
  var O_DGTC = [
    ['diem_manh', 'Điểm mạnh nổi bật'],
    ['han_che_nguyen_nhan', 'Điểm hạn chế trọng tâm và nguyên nhân cốt lõi'],
    ['xu_huong_3_nam', 'a) Phân tích chung về xu hướng chất lượng của Tiêu chuẩn trong 03 năm học liên tiếp'],
    ['van_de_uu_tien', 'b) Các vấn đề trọng tâm cần ưu tiên cải tiến ở tiêu chuẩn']
  ];

  function thoat(s) { return window.thoatHTML(s); }
  function co(s) { return !!(s && String(s).trim()); }

  // ── Ghép "Mô tả hiện trạng" của một mức ──
  // Có danh mục nội hàm: mỗi nội hàm đã viết thành một đoạn, mã minh chứng
  // đã gắn nối cuối đoạn trong ngoặc tròn (bỏ mã đã có sẵn trong chữ).
  // Không có nội hàm: lấy ô văn xuôi hien_trang_m1/m2.
  function moTa(d, ma, muc) {
    var dsNH = (d.noiHam && d.noiHam[ma + '|' + muc]) || [];
    if (dsNH.length) {
      return dsNH.map(function (n) {
        var h = d.htNh[n.id];
        if (!h || !co(h.hien_trang)) return '';
        var chu = h.hien_trang.trim();
        var them = (h.ma_minh_chung || []).filter(function (m) { return chu.indexOf(m) < 0; });
        return chu + (them.length ? ' (' + them.join(', ') + ')' : '');
      }).filter(Boolean).join('\n\n');
    }
    var t = (d.tieuChi || []).filter(function (x) { return x.code === ma; })[0];
    return t ? String((muc === 1 ? t.htM1 : t.htM2) || '').trim() : '';
  }

  // ── Chép vào bộ nhớ tạm ──
  function chep(chu, nhan) {
    if (!co(chu)) { window.notify('Ô này chưa có nội dung để chép.'); return; }
    var xong = function () {
      window.notify('📋 Đã chép ' + (nhan || 'nội dung') + ' (' + chu.length + ' ký tự). Mở ô tương ứng trên EduQA rồi bấm Ctrl+V.');
    };
    var hong = function () {
      window.notify('Trình duyệt không cho chép tự động — bôi đen nội dung rồi bấm Ctrl+C.');
    };
    // Chép kiểu cũ TRƯỚC, ngay trong cú bấm: navigator.clipboard có lúc treo
    // lời hứa (thẻ không được chọn, chờ cấp quyền) mà không báo gì — người
    // dùng bấm xong không biết đã chép chưa (thử 16/11/2026).
    var o = document.createElement('textarea');
    o.value = chu; o.setAttribute('readonly', '');
    o.style.position = 'fixed'; o.style.left = '-9999px';
    document.body.appendChild(o); o.select();
    var duoc = false;
    try { duoc = document.execCommand('copy'); } catch (e) { duoc = false; }
    document.body.removeChild(o);
    if (duoc) { xong(); return; }
    if (navigator.clipboard && window.isSecureContext) {
      // Lời hứa treo quá 2 giây thì coi như không chép được, báo cho người dùng.
      var daBao = false;
      var mot = function (f) { return function () { if (!daBao) { daBao = true; f(); } }; };
      navigator.clipboard.writeText(chu).then(mot(xong), mot(hong));
      setTimeout(mot(hong), 2000);
    } else hong();
  }

  window.tcqgChepMoTa = function (ma, muc) {
    if (!window.duLieuTuDanhGia) return;
    chep(moTa(window.duLieuTuDanhGia(), ma, muc), 'Mô tả hiện trạng tiêu chí ' + ma + ' Mức ' + muc);
  };

  // Nút "📋 Chép" cạnh từng ô văn xuôi: chép đúng chữ đang có trong ô
  // (kể cả chữ vừa gõ chưa rời ô) — ủy nhiệm vì các khối vẽ lại nhiều lần.
  document.addEventListener('click', function (e) {
    var nut = e.target.closest && e.target.closest('[data-chep-o]');
    if (!nut) return;
    e.preventDefault();
    var o = nut.closest('.hs-o');
    var vao = o && o.querySelector('textarea,input');
    chep(vao ? vao.value : '', '"' + nut.getAttribute('data-chep-o') + '"');
  });

  // HTML nút chép + nhãn mục EduQA — tcqg.js gọi khi vẽ nhãn ô
  window.TCQG_EDUQA = {
    MUC: MUC, O_BC: O_BC, O_DGTC: O_DGTC,
    nutChep: function (nhan) {
      return ' <button type="button" class="nut-chep-eduqa" data-chep-o="' + thoat(nhan) +
        '" title="Chép nội dung ô này để dán vào EduQA">📋 Chép</button>';
    },
    nhan: function (muc) {
      var m = MUC[muc];
      return m ? '<a class="nhan-eduqa" href="' + m.url + '" target="_blank" rel="noopener" ' +
        'title="Mở mục này trên EduQA">EduQA ' + muc + '</a>' : '';
    },
    moTa: function (ma, muc) { return window.duLieuTuDanhGia ? moTa(window.duLieuTuDanhGia(), ma, muc) : ''; },
    ve: ve
  };

  // ══════════ KHỐI "NỘP LÊN EduQA" ══════════
  // Bảng sáu mục EduQA: app đã soạn tới đâu, bấm sang đâu. Đếm ô đã có chữ —
  // không đánh giá chất lượng nội dung, không suy mức.
  function ve() {
    var goc = document.getElementById('kd-eduqa');
    if (!goc || !window.duLieuTuDanhGia) return;
    // Vẽ lại sau mỗi lần lưu để số đếm đúng — giữ nguyên trạng thái mở/đóng.
    var dangMo = !!goc.querySelector('.eduqa-hop.open');
    var d = window.duLieuTuDanhGia();
    var bc = d.bc || {};
    function demBC(muc) {
      var ds = O_BC.filter(function (o) { return o[0] === muc && o[1] !== 'kn_khac'; });
      return ds.filter(function (o) { return co(bc[o[1]]); }).length + '/' + ds.length + ' ô';
    }
    var soMC = 0;
    try {
      var daCo = {};
      (window.HO_SO || []).forEach(function (h) {
        if (h.tt !== 'da_dong' && h.tc && h.tc.length && /^MC\.\d\.\d\.\d{2}$/.test(h.ma || '')) daCo[h.ma] = 1;
      });
      soMC = Object.keys(daCo).length;
    } catch (e) { soMC = 0; }
    var moTaCo = 0, cham = 0;
    (d.tieuChi || []).forEach(function (t) {
      if (co(moTa(d, t.code, 1))) moTaCo++;
      if (t.daCham) cham++;
    });
    var dg = 0;
    [1, 2, 3, 4].forEach(function (s) {
      var r = (d.dgtc || {})[s] || {};
      if (O_DGTC.every(function (o) { return co(r[o[0]]); })) dg++;
    });
    var tc = (d.tieuChi || []).length || 15;
    var dong = [
      ['3', '', 'Quản trị › thẻ “📊 Số liệu 3 năm” (số nhóm/lớp, công trình, đội ngũ, trẻ/học sinh 03 năm học)'],
      ['4.1', demBC('4.1'), 'Khối “Các mục viết bằng lời” cuối trang'],
      ['4.2', demBC('4.2'), 'Khối “Các mục viết bằng lời” cuối trang'],
      ['4.3', soMC + ' minh chứng', 'Nút “Xuất minh chứng cho EduQA” → trên EduQA bấm Nhập từ Excel'],
      ['4.4', moTaCo + '/' + tc + ' tiêu chí có mô tả Mức 1 · ' + cham + '/' + tc + ' đã chấm · ' + dg + '/4 đánh giá chung',
        'Mỗi tiêu chí: nút “Chép sang EduQA” ở từng mức; Đánh giá chung: chọn Tiêu chuẩn ở ô lọc'],
      ['4.5', demBC('4.5'), 'Khối “Các mục viết bằng lời” cuối trang'],
      ['4.6', '', 'Nút “Kế hoạch cải tiến” (mục IV Các vấn đề trọng tâm)']
    ];
    goc.innerHTML = '<div class="sub eduqa-hop' + (dangMo ? ' open' : '') + '"><div class="sub-head" role="button" ' +
      'onclick="this.parentNode.classList.toggle(\'open\')"><span class="fo">📤</span>' +
      '<b>Nộp lên EduQA — app soạn, EduQA nộp</b><span class="sub-arrow">▶</span></div>' +
      '<div class="sub-body" style="padding:12px 16px">' +
      '<p class="eduqa-giai">Mỗi ô của màn này ứng đúng một ô trên phần mềm EduQA của Sở (bdclgd.vn). ' +
      'Hội đồng soạn ở đây; khi xong, bấm <b>📋 Chép</b> rồi dán (Ctrl+V) vào ô cùng tên trên EduQA, ' +
      'hoặc tải <b>gói nội dung</b> để có đủ mọi ô trong một tệp. Ô “Đánh giá: Đạt” trên EduQA ' +
      'do người có thẩm quyền tự tích theo kết luận của Hội đồng.</p>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho eduqa-bang"><thead><tr>' +
      '<th>Mục trên EduQA</th><th>Đã soạn trong app</th><th>Lấy ở đâu</th></tr></thead><tbody>' +
      dong.map(function (r) {
        return '<tr><td><a href="' + MUC[r[0]].url + '" target="_blank" rel="noopener">' + thoat(MUC[r[0]].ten) + '</a></td>' +
          '<td>' + thoat(r[1] || '—') + '</td><td>' + thoat(r[2]) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="nut-vien" onclick="tcqgXuatGoiEduQA()">📦 Tải gói nội dung cho EduQA (Excel)</button>' +
      '<button class="nut-vien" onclick="window.xuatMinhChungEduQA&&xuatMinhChungEduQA()">📤 Xuất minh chứng (mẫu 4.3)</button>' +
      '</div></div></div>';
  }

  // ══════════ GÓI NỘI DUNG (Excel) ══════════
  // Một trang, mỗi ô EduQA một dòng theo đúng thứ tự trên EduQA. Trường dán
  // tay theo tệp, hoặc đưa tệp cho Trợ lý Quản trị trường học (/eduqa) nhập
  // từng đợt có xác nhận.
  function khongDau(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function lapDong(d, vanDe) {
    var bc = d.bc || {}, ds = [];
    function them(muc, cho, o, nd, url) { ds.push([muc, cho, o, nd || '', url || MUC[muc.slice(0, 3)].url]); }
    O_BC.filter(function (o) { return o[0] === '4.1'; }).forEach(function (o) { them('4.1', '', o[2], bc[o[1]]); });
    O_BC.filter(function (o) { return o[0] === '4.2'; }).forEach(function (o) { them('4.2', '', o[2], bc[o[1]]); });
    var theoStd = {};
    (d.tieuChi || []).forEach(function (t) { (theoStd[t.std] = theoStd[t.std] || []).push(t); });
    Object.keys(theoStd).sort().forEach(function (s) {
      theoStd[s].forEach(function (t) {
        var kq = t.self >= 2 ? 'Hội đồng chấm: Đạt Mức 2' : t.self >= 1 ? 'Hội đồng chấm: Đạt Mức 1'
          : t.daCham ? 'Hội đồng chấm: Không đạt Mức 1' : 'Hội đồng chưa chấm';
        [1, 2].forEach(function (m) {
          them('4.4', 'Tiêu chí ' + t.code + ' — ' + t.name + (t.bb ? ' (bắt buộc)' : ''),
            'Mức ' + m + ' — Mô tả hiện trạng · ' + kq, moTa(d, t.code, m),
            MUC['4.4'].url + '/' + t.code + '?view=muc-' + m);
        });
      });
      var r = (d.dgtc || {})[s] || {};
      O_DGTC.forEach(function (o) { them('4.4', 'Tiêu chuẩn ' + s + ' — Đánh giá chung', o[1], r[o[0]]); });
    });
    O_BC.filter(function (o) { return o[0] === '4.5'; }).forEach(function (o) { them('4.5', '', o[2], bc[o[1]]); });
    (vanDe || []).forEach(function (v, i) {
      var cho = 'Vấn đề ' + (i + 1) + ' — Tiêu chuẩn ' + (v.tieu_chuan || '?') + (v.tieu_chi_ma ? ', tiêu chí ' + v.tieu_chi_ma : '');
      them('4.6', cho, 'Đánh giá hiện trạng', v.hien_trang);
      them('4.6', cho, 'Điểm hạn chế', v.han_che);
      them('4.6', cho, 'Nguyên nhân của hạn chế', v.nguyen_nhan);
    });
    return ds;
  }

  window.tcqgXuatGoiEduQA = function () {
    if (window.tcqgDuocXuat && !window.tcqgDuocXuat()) { window.notify(window.TCQG_CHU_CHAN_XUAT || 'Thầy cô không có quyền xuất.'); return; }
    if (!window.EXCEL_DEP || !window.duLieuTuDanhGia) { window.notify('Chưa tải xong, thầy cô thử lại sau ít giây.'); return; }
    var d = window.duLieuTuDanhGia();
    var nam = d.namHoc;
    var lay = window.MAY_CHU
      ? window.MAY_CHU.from('khct_van_de').select('*').eq('nam_hoc', nam).order('so_tt')
          .then(function (r) { return r.error ? null : (r.data || []); }, function () { return null; })
      : Promise.resolve([]);
    lay.then(function (vanDe) {
      var ds = lapDong(d, vanDe || []);
      var rows = [{ o: ['Mục EduQA', 'Tiêu chí / tiêu chuẩn', 'Ô nhập trên EduQA', 'Nội dung (dán vào ô)', 'Đường dẫn EduQA']
        .map(function (v) { return { v: v, k: 'dauW' }; }) }];
      ds.forEach(function (r) {
        rows.push({ o: [{ v: r[0], k: 'oG' }, { v: r[1], k: 'oL' }, { v: r[2], k: 'oL' },
          { v: r[3] || '(chưa soạn)', k: 'oL' }, { v: r[4], k: 'oL' }] });
      });
      var CH = window.CAU_HINH || {};
      var byte = window.EXCEL_DEP.tao({ sheets: [{ ten: 'Noi dung EduQA', cols: [10, 34, 34, 90, 40], rows: rows,
        in: { dongBang: 1, vuaNgang: true } }] });
      var ten = 'NOI-DUNG-EduQA-' + khongDau(CH.TEN_TRUONG || 'Truong') + '-' + String(nam || '').replace(/\D/g, '') + '.xlsx';
      var u = URL.createObjectURL(new Blob([byte], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      var a = document.createElement('a'); a.href = u; a.download = ten;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      var trong = ds.filter(function (r) { return !co(r[3]); }).length;
      window.notify('✅ Đã tạo ' + ten + ' — ' + ds.length + ' ô' + (trong ? ', ' + trong + ' ô chưa soạn' : '') +
        (vanDe === null ? '. Chưa đọc được Kế hoạch cải tiến nên thiếu mục 4.6' : '') + '.');
    });
  };

  // Cho kiểm thử ngoài trình duyệt
  window.__eduqaGoi = { moTa: moTa, lapDong: lapDong };
})();
