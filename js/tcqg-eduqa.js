// ============================================================
// tcqg-eduqa.js — ĐƯA MÀN TRƯỜNG CHUẨN QUỐC GIA KHỚP PHẦN MỀM EduQA
// (bdclgd.vn — phần mềm tự đánh giá TT57 của Sở, tập huấn 16/11/2026)
//
// 🔑 BẢN GỐC Ở APP MẦM NON (quantriso-mamnon-web). App tiểu học chép nguyên
//    tệp này, chỉ khác hàm dsHoSo() (tiểu học đọc window.HO_SO). Sửa thì sửa
//    cả hai, chép sang bằng tay (hai app tách mã — quyết định của thầy Chung).
//
// Thầy Chung chốt 16/11/2026: màn TCQG trùng EduQA thì "làm cho chuẩn":
// APP SOẠN + GIỮ BẢN GỐC, EduQA NỘP. Không bỏ màn, mà nói đúng tên mục của
// EduQA và chuyển nội dung sang không phải gõ lại.
//
// Đối chiếu ô nhập trên EduQA 16/11/2026 (tiểu học: TH Quảng Châu 1; mầm non:
// MN Quảng Châu 3 — chỉ đọc):
//   2.1 Mục đích · Phạm vi · Công cụ TĐG (ô chữ)   2.4 Tập huấn: Thời gian · Thành phần · Nội dung
//   2.5 Dự kiến nguồn lực: từng tiêu chí (nguồn lực cần huy động · thời điểm)
//   2.6 Dự kiến thuê chuyên gia (không thuê cũng nêu rõ)   2.7 Thời gian và nội dung hoạt động (bảng)
//   3.x Cơ sở dữ liệu nhà trường → thẻ Quản trị "📊 Số liệu 3 năm"
//   4.1 Bối cảnh · 4.2 Quá trình · 4.3 Minh chứng (Nhập từ Excel) · 4.4 từng tiêu chí, Mức 1/2:
//       "Mô tả hiện trạng" + chèn minh chứng + "Đánh giá: Đạt"; Đánh giá chung từng tiêu chuẩn
//   4.5 Kết luận chung · 4.6 Kế hoạch cải tiến · 4.7 Danh mục viết tắt (bảng)
// Phần 4.x khớp cột CSDL sẵn có. Phần 2.x (trước đây app không có ô) và dấu
// "đã chép sang EduQA" lưu trong so_lieu_bao_cao, mã dòng 'tdg.*' và 'eduqa.*'
// (năm học, co_so_ma NULL) — KHÔNG cần chạy SQL; RLS bảng này: chỉ admin/BGH ghi.
//
// 🔴 Máy KHÔNG viết hộ: "Mô tả hiện trạng" ghép đúng các đoạn hội đồng đã gõ
//    theo từng nội hàm, nối mã minh chứng đã gắn vào cuối đoạn. Ô trống vẫn trống.
// 🔴 Trên EduQA, ô "Đánh giá: Đạt" do người có thẩm quyền tự tích.
// 🔴 Báo cáo NỘP CHÍNH THỨC xuất ở EduQA 6.2; bản Word của app là bản nháp
//    nội bộ / đối chiếu (thầy giao "chọn phương án tối ưu" 16/11/2026).
// 🔴 Chia sẻ minh chứng cho đoàn thẩm định: KHÔNG bật "Bất kỳ ai có đường
//    liên kết" (hồ sơ có dữ liệu cá nhân) — chia sẻ Người xem cho Gmail đoàn.
//    App không đọc được quyền chia sẻ của Google Drive, nên chỉ đếm link có/thiếu.
// ============================================================
(function () {
  'use strict';

  var NGAY_DOI_CHIEU = '16/11/2026';
  var GOC = 'https://bdclgd.vn/self-assessment/self-assessment-info/';
  var GOC2 = 'https://bdclgd.vn/self-assessment/planning/';
  var MUC = {
    '2': { ten: '2. Kế hoạch tự đánh giá (2.1, 2.4–2.7)', url: GOC2 + 'purpose-scope-tools' },
    '3': { ten: '3. Cơ sở dữ liệu nhà trường (3.1–3.5)', url: 'https://bdclgd.vn/self-assessment/school-data/general-info' },
    '4.1': { ten: '4.1 Bối cảnh và đặc điểm', url: GOC + 'context-characteristics' },
    '4.2': { ten: '4.2 Quá trình thực hiện TĐG', url: GOC + 'purpose-scope-process' },
    '4.3': { ten: '4.3 Minh chứng', url: GOC + 'evidence' },
    '4.4': { ten: '4.4 Đánh giá tiêu chí', url: GOC + 'criteria-evaluation' },
    '4.5': { ten: '4.5 Kết luận chung', url: GOC + 'standard-summary' },
    '4.6': { ten: '4.6 Kế hoạch cải tiến chất lượng giáo dục', url: GOC + 'improvement-plan' },
    '4.7': { ten: '4.7 Danh mục viết tắt', url: GOC + 'abbreviations' }
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
  // Ô mục 2 + 4.7 (lưu so_lieu_bao_cao 'tdg.<ma>'): [mục, mã, nhãn EduQA, gợi ý, đường dẫn]
  var O_KH = [
    ['2.1', '21_muc_dich', 'I. Mục đích TĐG', '', GOC2 + 'purpose-scope-tools'],
    ['2.1', '21_pham_vi', 'II. Phạm vi TĐG', '', GOC2 + 'purpose-scope-tools'],
    ['2.1', '21_cong_cu', 'III. Công cụ TĐG', 'Ví dụ: Phụ lục I TT 57/2026 (15 tiêu chí, 2 mức); phiếu đánh giá tiêu chí; bảng mã minh chứng…', GOC2 + 'purpose-scope-tools'],
    ['2.4', '24_thoi_gian', 'Tập huấn — Thời gian', '', GOC2 + 'professional-training'],
    ['2.4', '24_thanh_phan', 'Tập huấn — Thành phần', '', GOC2 + 'professional-training'],
    ['2.4', '24_noi_dung', 'Tập huấn — Nội dung, chương trình tập huấn', '', GOC2 + 'professional-training'],
    ['2.6', '26_chuyen_gia', 'Dự kiến thuê chuyên gia', 'Không thuê cũng ghi rõ, ví dụ: Nhà trường không thuê chuyên gia.', GOC2 + 'expert-hiring'],
    ['2.7', '27_lich', 'Thời gian và nội dung hoạt động', 'Mỗi dòng một hoạt động: Thời gian | Nội dung hoạt động', GOC2 + 'activity-schedule'],
    ['4.7', '47_viet_tat', 'Danh mục viết tắt', 'Mỗi dòng một cụm: VIẾT TẮT = cụm từ đầy đủ (ví dụ: TĐG = Tự đánh giá)', GOC + 'abbreviations']
  ];

  function thoat(s) { return window.thoatHTML(s); }
  function co(s) { return !!(s && String(s).trim()); }
  function laQT() {
    var u = window.NGUOI_DUNG;
    return !!u && ['admin', 'ban_giam_hieu'].indexOf(u.vai_tro) >= 0;
  }
  // Danh sách hồ sơ đang quản lý (bản mầm non đọc hàm danh sách hồ sơ riêng).
  function dsHoSo() { return (window.dsHoSoVaMCC ? window.dsHoSoVaMCC() : window.HO_SO) || []; }   // bản tiểu học — kèm minh chứng cụ thể
  function banGhi(ma) { return (window.HS_BAN_GHI && window.HS_BAN_GHI[ma]) || {}; }

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

  // ══════════ LƯU PHỤ (so_lieu_bao_cao): ô mục 2 + dấu "đã chép" ══════════
  var PHU = { nam: null, kh: {}, dau: {}, dangTai: null, loi: false };
  function namDL() { return window.duLieuTuDanhGia ? window.duLieuTuDanhGia().namHoc : ''; }
  function taiPhu(nam) {
    // 🔴 Hỏi "đang tải" TRƯỚC (vá 18/11/2026, QC1 đơ trang): taiPhu đặt PHU.nam
    // ngay khi bắt đầu tải, nên hỏi "đã có năm này" trước thì giữa lúc tải nó trả
    // Promise.resolve() → ve() thấy dangTai còn đó lại gọi taiPhu().then(ve) →
    // vòng microtask vô tận, chiếm luồng chính nên lần tải không bao giờ xong.
    if (PHU.dangTai && PHU.nam === nam) return PHU.dangTai;
    if (PHU.nam === nam && !PHU.loi) return Promise.resolve();
    PHU.nam = nam; PHU.kh = {}; PHU.dau = {}; PHU.loi = false;
    if (!window.MAY_CHU || !nam) return Promise.resolve();
    function doc(tien) {
      return window.MAY_CHU.from('so_lieu_bao_cao').select('ma_dong,gia_tri')
        .eq('nam_hoc', nam).is('co_so_ma', null).like('ma_dong', tien + '%');
    }
    PHU.dangTai = Promise.all([doc('tdg.'), doc('eduqa.')])
      .then(function (kq) {
        PHU.dangTai = null;
        if (kq[0].error || kq[1].error) { PHU.loi = true; return; }
        (kq[0].data || []).concat(kq[1].data || []).forEach(function (x) {
          if (x.ma_dong.indexOf('tdg.') === 0) PHU.kh[x.ma_dong.slice(4)] = x.gia_tri || '';
          else PHU.dau[x.ma_dong.slice(6)] = x.gia_tri || '';
        });
      }, function () { PHU.dangTai = null; PHU.loi = true; });
    return PHU.dangTai;
  }
  // Khoá duy nhất (nam_hoc, ma_dong, co_so_ma) NULLS NOT DISTINCT → update rồi insert, không upsert.
  function ghiDong(nam, k, gt) {
    var may = window.MAY_CHU;
    if (!gt) {
      return may.from('so_lieu_bao_cao').delete().eq('nam_hoc', nam).eq('ma_dong', k).is('co_so_ma', null)
        .then(function (r) { if (r.error) throw r.error; });
    }
    var ban = { gia_tri: gt, cap_nhat_luc: new Date().toISOString(), cap_nhat_boi: window.NGUOI_DUNG ? window.NGUOI_DUNG.id : null };
    return may.from('so_lieu_bao_cao').update(ban).eq('nam_hoc', nam).eq('ma_dong', k).is('co_so_ma', null).select()
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data && r.data.length) return;
        ban.nam_hoc = nam; ban.ma_dong = k;
        return may.from('so_lieu_bao_cao').insert(ban).select().then(function (r2) {
          if (r2.error) throw r2.error;
          if (!r2.data || !r2.data.length) throw new Error('máy chủ không ghi dòng nào — kiểm tra quyền');
        });
      });
  }
  function bam(s) {   // dấu vân tay nội dung (djb2) — chỉ để biết "đã sửa sau khi chép"
    s = String(s || '').replace(/\s+/g, ' ').trim();
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function homNay() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function trangThai(khoa, noiDung) {
    var v = PHU.dau[khoa];
    if (!v) return 'chua';
    return v.split('|')[1] === bam(noiDung) ? 'dong' : 'lech';
  }
  function danhDau(khoa, noiDung) {
    if (!khoa || !laQT() || !window.MAY_CHU) return;
    var nam = namDL(), gt = homNay() + '|' + bam(noiDung);
    PHU.dau[khoa] = gt;
    trangTri();
    ghiDong(nam, 'eduqa.' + khoa, gt).then(function () { ve(); }, function () { /* dấu phụ, lỗi không chặn việc chép */ });
  }

  // ── Chép vào bộ nhớ tạm ──
  function chep(chu, nhan, khoa) {
    if (!co(chu)) { window.notify('Ô này chưa có nội dung để chép.'); return; }
    var xong = function () {
      window.notify('📋 Đã chép ' + (nhan || 'nội dung') + ' (' + chu.length + ' ký tự). Mở ô tương ứng trên EduQA rồi bấm Ctrl+V.');
      danhDau(khoa, chu);
    };
    var hong = function () {
      window.notify('Trình duyệt không cho chép tự động — bôi đen nội dung rồi bấm Ctrl+C.');
    };
    // Chép kiểu cũ TRƯỚC, ngay trong cú bấm: navigator.clipboard có lúc treo
    // lời hứa (thẻ không được chọn, chờ cấp quyền) mà không báo gì (thử 16/11/2026).
    var o = document.createElement('textarea');
    o.value = chu; o.setAttribute('readonly', '');
    o.style.position = 'fixed'; o.style.left = '-9999px';
    document.body.appendChild(o); o.select();
    var duoc = false;
    try { duoc = document.execCommand('copy'); } catch (e) { duoc = false; }
    document.body.removeChild(o);
    if (duoc) { xong(); return; }
    if (navigator.clipboard && window.isSecureContext) {
      var daBao = false;
      var mot = function (f) { return function () { if (!daBao) { daBao = true; f(); } }; };
      navigator.clipboard.writeText(chu).then(mot(xong), mot(hong));
      setTimeout(mot(hong), 2000);
    } else hong();
  }

  window.tcqgChepMoTa = function (ma, muc) {
    if (!window.duLieuTuDanhGia) return;
    chep(moTa(window.duLieuTuDanhGia(), ma, muc), 'Mô tả hiện trạng tiêu chí ' + ma + ' Mức ' + muc, '44.' + ma + '.' + muc);
  };

  // Nút "📋 Chép" cạnh từng ô văn xuôi: chép đúng chữ đang có trong ô
  // (kể cả chữ vừa gõ chưa rời ô) — ủy nhiệm vì các khối vẽ lại nhiều lần.
  document.addEventListener('click', function (e) {
    var nut = e.target.closest && e.target.closest('[data-chep-o]');
    if (!nut) return;
    e.preventDefault();
    var o = nut.closest('.hs-o');
    var vao = o && o.querySelector('textarea,input');
    chep(vao ? vao.value : '', '"' + nut.getAttribute('data-chep-o') + '"', nut.getAttribute('data-eduqa-khoa'));
  });

  // ── Gắn trạng thái lên các nút Chép đang hiện (vẽ lại nhiều lần nên quét lại) ──
  function noiDungCuaNut(nut) {
    var k = nut.getAttribute('data-eduqa-khoa') || '';
    if (k.indexOf('44.') === 0 && window.duLieuTuDanhGia) {
      var p = k.split('.');   // 44.<tc a>.<tc b>.<mức>
      return moTa(window.duLieuTuDanhGia(), p[1] + '.' + p[2], +p[3]);
    }
    var o = nut.closest('.hs-o'), vao = o && o.querySelector('textarea,input');
    return vao ? vao.value : '';
  }
  function trangTri() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-eduqa-khoa]'), function (nut) {
      var k = nut.getAttribute('data-eduqa-khoa'), tt = trangThai(k, noiDungCuaNut(nut));
      var v = PHU.dau[k] ? PHU.dau[k].split('|')[0] : '';
      // 🔴 CHỈ ghi khi khác (vá 16/11/2026): gán textContent dù trùng chữ vẫn tạo
      // childList mutation → MutationObserver gọi lại trangTri sau 120 ms → lặp
      // vô tận, trang báo "Không phản hồi" (QC1).
      nut.classList.toggle('da-chep', tt === 'dong');
      nut.classList.toggle('lech', tt === 'lech');
      var tieuDe = tt === 'dong' ? 'Đã chép sang EduQA ngày ' + v + ' — nội dung chưa đổi.'
        : tt === 'lech' ? 'Đã sửa SAU lần chép ngày ' + v + ' — chép lại và dán đè trên EduQA cho khớp.'
        : 'Chưa chép sang EduQA.';
      if (nut.title !== tieuDe) nut.title = tieuDe;
      var nhan = nut.getAttribute('data-nhan') || nut.textContent;
      if (!nut.getAttribute('data-nhan')) nut.setAttribute('data-nhan', nhan);
      var chu = tt === 'dong' ? '✓ ' + nhan.replace(/^📋\s*/, '') : tt === 'lech' ? '⚠ ' + nhan.replace(/^📋\s*/, '') + ' lại' : nhan;
      if (nut.textContent !== chu) nut.textContent = chu;
    });
    var xbc = document.querySelector('#kd-thanh .nut-xuat-bc');
    if (xbc) xbc.title = 'Bản nháp nội bộ để hội đồng đọc, góp ý. Báo cáo nộp chính thức xuất trên EduQA (mục 6.2 Báo cáo TĐG).';
  }
  var hen = null;
  function henTrangTri() { clearTimeout(hen); hen = setTimeout(trangTri, 120); }
  document.addEventListener('DOMContentLoaded', function () {
    var man = document.getElementById('mh-chuanqg');
    if (man && window.MutationObserver) new MutationObserver(henTrangTri).observe(man, { childList: true, subtree: true });
  });
  document.addEventListener('input', function (e) {   // gõ trong ô có nút Chép → cập nhật dấu ngay
    if (e.target.closest && e.target.closest('#mh-chuanqg .hs-o')) henTrangTri();
  });

  window.TCQG_EDUQA = {
    MUC: MUC, O_BC: O_BC, O_DGTC: O_DGTC, O_KH: O_KH,
    nutChep: function (nhan, khoa) {
      return ' <button type="button" class="nut-chep-eduqa" data-chep-o="' + thoat(nhan) + '"' +
        (khoa ? ' data-eduqa-khoa="' + thoat(khoa) + '"' : '') +
        ' title="Chép nội dung ô này để dán vào EduQA">📋 Chép</button>';
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
  function demChep(ds) {   // ds: [[khoa, noiDung]] → {co, dong, lech}
    var r = { co: 0, dong: 0, lech: 0 };
    ds.forEach(function (x) {
      if (!co(x[1])) return;
      r.co++;
      var t = trangThai(x[0], x[1]);
      if (t === 'dong') r.dong++; else if (t === 'lech') r.lech++;
    });
    return r;
  }
  function chuChep(r) {
    if (!r.co) return '—';
    return 'đã chép ' + r.dong + '/' + r.co + (r.lech ? ' · ⚠ ' + r.lech + ' ô sửa sau khi chép' : '');
  }
  function oKhoa(d) {   // mọi ô có nút Chép, theo mục: { '4.1': [[khoa, nd]], … }
    var bc = d.bc || {}, m = {};
    function them(muc, k, nd) { (m[muc] = m[muc] || []).push([k, nd || '']); }
    O_BC.forEach(function (o) { them(o[0], 'bc.' + o[1], bc[o[1]]); });
    (d.tieuChi || []).forEach(function (t) { [1, 2].forEach(function (mc) { them('4.4', '44.' + t.code + '.' + mc, moTa(d, t.code, mc)); }); });
    [1, 2, 3, 4].forEach(function (s) {
      var r = (d.dgtc || {})[s] || {};
      O_DGTC.forEach(function (o) { them('4.4', 'dg.' + s + '.' + o[0], r[o[0]]); });
    });
    O_KH.forEach(function (o) { them(o[0] === '4.7' ? '4.7' : '2', 'kh.' + o[1], PHU.kh[o[1]]); });
    return m;
  }
  function thongKeMinhChung() {
    var daCo = {}, ds = [];
    dsHoSo().forEach(function (h) {
      // Cùng cửa với tệp xuất EduQA (app.js laMinhChungTDG, 20/11/2026): bỏ hồ sơ Đảng/Đoàn, hồ sơ BGH chọn không dùng.
      if (!window.laMinhChungTDG(h) || !/^MC\.\d\.\d\.\d{2}$/.test(h.ma || '') || daCo[h.ma]) return;
      daCo[h.ma] = 1; ds.push(h);
    });
    var r = { tong: ds.length, link: 0, viTri: 0, thieu: [], chuaXong: 0 };
    ds.forEach(function (h) {
      var dd = co(banGhi(h.ma).dinh_dang);
      if (h.link) r.link++; else if (dd) r.viTri++; else r.thieu.push(h.ma);
      if (h.tt !== 'co') r.chuaXong++;
    });
    return r;
  }

  function ve() {
    var goc = document.getElementById('kd-eduqa');
    if (!goc || !window.duLieuTuDanhGia) return;
    // Bảng nộp chỉ cho người giữ bút (BGH + Thư ký hội đồng; mầm non: BGH) — 20/11/2026.
    if (!(window.tcqgDuocXuat ? window.tcqgDuocXuat() : laQT())) { goc.innerHTML = ''; return; }
    // Đang gõ trong khối này thì không vẽ lại (mất chữ đang gõ) — lần lưu sau vẽ.
    if (goc.contains(document.activeElement) && /TEXTAREA|INPUT/.test(document.activeElement.tagName)) return;
    var nam = namDL();
    if (PHU.nam !== nam || PHU.dangTai) { taiPhu(nam).then(function () { ve(); }); if (PHU.dangTai) return; }
    var moSub = {};
    Array.prototype.forEach.call(goc.querySelectorAll('[data-sub]'), function (x) { moSub[x.getAttribute('data-sub')] = x.classList.contains('open'); });
    var dangMo = !!goc.querySelector('.eduqa-hop.open');
    var d = window.duLieuTuDanhGia();
    var bc = d.bc || {};
    var ok = oKhoa(d);
    function demBC(muc) {
      var ds = O_BC.filter(function (o) { return o[0] === muc && o[1] !== 'kn_khac'; });
      return ds.filter(function (o) { return co(bc[o[1]]); }).length + '/' + ds.length + ' ô';
    }
    var mc = thongKeMinhChung();
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
    var khCo = O_KH.filter(function (o) { return o[0] !== '4.7' && co(PHU.kh[o[1]]); }).length;
    // ── BẢNG NỘP LÊN EduQA (20/11/2026, thầy Chung: "EduQA mờ nhạt, khó thấy") ──
    // Bảng tiến độ DUY NHẤT của trang, đặt đầu trang, luôn mở; mỗi dòng một mục EduQA đúng thứ tự trên
    // bdclgd.vn. Thay lưới 9 bước cũ (tên do app tự đặt) và khối gập "Nộp lên EduQA". Nút [Soạn] mở thẳng
    // chỗ viết (tcqg.js window.tcqgDi). Chỉ người giữ bút thấy: BGH + Thư ký hội đồng (một tài khoản EduQA/trường).
    function gopChep(ds) { return chuChep(demChep([].concat.apply([], ds.map(function (m) { return ok[m] || []; })))); }
    function demBCNhieu(ds) {
      var o = O_BC.filter(function (x) { return ds.indexOf(x[0]) >= 0 && x[1] !== 'kn_khac'; });
      return o.filter(function (x) { return co(bc[x[1]]); }).length + '/' + o.length + ' ô';
    }
    var tongKh = O_KH.filter(function (o) { return o[0] !== '4.7'; }).length;
    var hang = [
      { muc: '2', ten: '2. Kế hoạch tự đánh giá (2.1–2.7) · 4.7 Viết tắt', soan: khCo + '/' + tongKh + ' ô',
        chep: gopChep(['2', '4.7']), nut: [['Soạn', 'mo:kh'], ['Hội đồng (2.2, 2.3)', 'di:qt:hd']] },
      { muc: '3', ten: '3. Cơ sở dữ liệu — số liệu 03 năm học', soan: 'Thẻ Số liệu 3 năm', chep: '',
        nut: [['Soạn', 'di:qt:sl3']] },
      { muc: '4.1', ten: '4.1–4.2 Bối cảnh, quá trình tự đánh giá', soan: demBCNhieu(['4.1', '4.2']),
        chep: gopChep(['4.1', '4.2']), nut: [['Soạn', 'di:bc']] },
      { muc: '4.3', ten: '4.3 Minh chứng', soan: mc.tong + ' mã' + (mc.thieu.length ? ' · ⚠ ' + mc.thieu.length + ' chưa có link, nơi lưu' : ''),
        chep: 'Nhập từ Excel', nut: [['Xuất Excel', 'lam:xuatmc'], ['Kiểm link', 'mo:td']], thieu: mc.thieu.length > 0 },
      { muc: '4.4', ten: '4.4 Đánh giá từng tiêu chí, từng tiêu chuẩn',
        soan: moTaCo + '/' + tc + ' tiêu chí có mô tả · chấm ' + cham + '/' + tc + ' · chung ' + dg + '/4',
        chep: gopChep(['4.4']), nut: [['Soạn tiêu chí', 'di:tc'], ['Đánh giá chung', 'di:dg']] },
      { muc: '4.5', ten: '4.5 Kết luận chung', soan: demBC('4.5'), chep: gopChep(['4.5']), nut: [['Soạn', 'di:bc']] },
      { muc: '4.6', ten: '4.6 Kế hoạch cải tiến', soan: '', chep: '', nut: [['Soạn', 'di:qt:kh']] }
    ];
    var suaDuoc = laQT();
    function sub(id, tieuDe, than) {
      return '<div class="sub eduqa-con' + (moSub[id] ? ' open' : '') + '" data-sub="' + id + '"><div class="sub-head" role="button" ' +
        'onclick="this.parentNode.classList.toggle(\'open\')"><b>' + tieuDe + '</b><span class="sub-arrow">▶</span></div>' +
        '<div class="sub-body" style="padding:12px 14px">' + than + '</div></div>';
    }
    var khHtml = '<p class="eduqa-giai">Các ô EduQA mục 2 mà trước đây app chưa có chỗ ghi. Lưu theo năm học ' + thoat(nam) +
      '; chỉ Ban giám hiệu sửa được. Máy tự lưu khi rời ô. Mục 2.2, 2.3 (thành viên, phân công) lấy ở nút <b>Sửa hội đồng</b>.</p>' +
      O_KH.map(function (o) {
        return '<div class="hs-o"><label><span class="eduqa-ma">' + o[0] + '</span> ' + thoat(o[2]) +
          ' <a class="nhan-eduqa" href="' + o[4] + '" target="_blank" rel="noopener">EduQA ' + o[0] + '</a>' +
          window.TCQG_EDUQA.nutChep(o[2], 'kh.' + o[1]) + '</label>' +
          '<textarea class="eduqa-kh" data-kh="' + o[1] + '"' + (suaDuoc ? '' : ' disabled') +
          (o[3] ? ' placeholder="' + thoat(o[3]) + '"' : '') + '>' + thoat(PHU.kh[o[1]] || '') + '</textarea></div>';
      }).join('') +
      '<div class="nhan-nho" style="margin:14px 0 6px">2.5 Dự kiến các nguồn lực — từng tiêu chí</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho eduqa-bang"><thead><tr><th>Tiêu chí</th>' +
      '<th>Các nguồn lực cần huy động/cung cấp</th><th>Thời điểm huy động</th></tr></thead><tbody>' +
      (d.tieuChi || []).map(function (t) {
        return '<tr><td>' + t.code + '</td>' + ['nl', 'td'].map(function (c) {
          var k = '25_' + c + '_' + t.code;
          return '<td><input class="eduqa-kh" data-kh="' + k + '"' + (suaDuoc ? '' : ' disabled') + ' value="' + thoat(PHU.kh[k] || '') + '"></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><p class="tl-bao" id="eduqa-kh-bao"></p>';

    var tdHtml = '<p class="eduqa-giai">Đoàn thẩm định mở minh chứng bằng link trên EduQA. <b>Link không mở được = coi như thiếu minh chứng.</b></p>' +
      '<ul class="eduqa-ds">' +
      '<li><b>' + mc.link + '/' + mc.tong + '</b> minh chứng có link Drive</li>' +
      '<li><b>' + mc.viTri + '</b> không số hoá nhưng đã ghi vị trí lưu trữ (đúng Phụ lục IV mục II.3c)</li>' +
      '<li' + (mc.thieu.length ? ' class="thieu"' : '') + '><b>' + mc.thieu.length + '</b> thiếu cả link lẫn vị trí lưu trữ' +
      (mc.thieu.length ? ': ' + mc.thieu.slice(0, 40).join(', ') + (mc.thieu.length > 40 ? '…' : '') +
        ' — sửa hồ sơ (bút chì ✏️) → ô Link Drive hoặc ô Vị trí lưu trữ' : '') + '</li>' +
      (mc.chuaXong ? '<li><b>' + mc.chuaXong + '</b> minh chứng kho hồ sơ còn ghi “chưa có / đang cập nhật”</li>' : '') + '</ul>' +
      '<p class="eduqa-giai"><b>Chia sẻ cho đoàn:</b> chủ cây thư mục Drive của trường mở thư mục gốc hồ sơ → Chia sẻ → thêm Gmail của đoàn ' +
      'thẩm định (Sở cung cấp) với quyền <b>Người xem</b>, bỏ tích “Thông báo”. Làm MỘT lần ở thư mục gốc là mọi thư mục con mở được. ' +
      '🔴 Không bật “Bất kỳ ai có đường liên kết”: hồ sơ có dữ liệu cá nhân của trẻ, giáo viên. App không đọc được quyền chia sẻ của Drive, ' +
      'nên hãy nhờ một người ngoài trường (không thuộc danh sách chia sẻ) bấm thử vài link trước ngày thẩm định.</p>';

    var namCuoi = parseInt(String(nam).split('-')[1], 10);
    var conNgay = namCuoi ? Math.ceil((new Date(namCuoi, 5, 15) - new Date()) / 86400000) : null;
    function nutLam(n) { return '<button type="button" class="nut-vien nho" style="margin:2px 6px 2px 0" data-eduqa="' + n[1] + '">' + n[0] + '</button>'; }
    goc.innerHTML = '<div class="eduqa-nop" style="border:2px solid var(--chinh,#1f3b7a);border-radius:12px;padding:14px 16px;margin:0 0 16px;background:var(--nen-the,#fff)">' +
      '<div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;margin:0 0 6px">' +
      '<b style="font-size:17px">📤 Nộp lên EduQA — năm học ' + thoat(nam) + '</b>' +
      (conNgay === null ? '' : '<span style="font-size:13.5px' + (conNgay >= 0 && conNgay <= 30 ? ';color:#b42318;font-weight:600' : '') + '">' +
        (conNgay >= 0 ? 'Hội đồng thông qua, Hiệu trưởng phê duyệt trước 15/6 · còn ' + conNgay + ' ngày' : 'Hạn 15/6/' + namCuoi + ' đã qua') + '</span>') +
      '</div>' +
      '<p class="eduqa-giai" style="margin:0 0 10px">Mỗi dòng là một mục trên phần mềm EduQA (bdclgd.vn). Hội đồng soạn trong app; người giữ tài khoản ' +
      'bấm <b>📋 Chép</b> cạnh từng ô rồi dán vào ô cùng tên trên EduQA. <b>⚠</b> = ô bị sửa sau lần chép, phải dán lại. ' +
      'Báo cáo nộp chính thức xuất trên EduQA (mục 6.2).</p>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho eduqa-bang"><thead><tr>' +
      '<th>Mục trên EduQA</th><th>Đã soạn trong app</th><th>Đã chép sang EduQA</th><th></th></tr></thead><tbody>' +
      hang.map(function (r) {
        return '<tr><td><b>' + thoat(r.ten) + '</b></td>' +
          '<td' + (r.thieu ? ' class="thieu"' : '') + '>' + thoat(r.soan || '—') + '</td>' +
          '<td' + (/⚠/.test(r.chep) ? ' class="thieu"' : '') + '>' + thoat(r.chep || '—') + '</td>' +
          '<td style="white-space:nowrap">' + r.nut.map(nutLam).join('') +
          '<a href="' + MUC[r.muc].url + '" target="_blank" rel="noopener" style="font-size:13px">Mở EduQA ↗</a></td></tr>';
      }).join('') + '</tbody></table></div>' +
      (PHU.loi ? '<div class="hs-loi hien" style="margin:8px 0">Chưa đọc được phần lưu phụ (ô mục 2, dấu đã chép) — tải lại trang.</div>' : '') +
      sub('kh', '📝 Kế hoạch tự đánh giá — EduQA 2.1, 2.4, 2.5, 2.6, 2.7 và 4.7 (' + khCo + ' ô đã ghi)', khHtml) +
      sub('td', '🔎 Chuẩn bị cho đoàn thẩm định — link minh chứng (' + (mc.tong - mc.thieu.length) + '/' + mc.tong + ' mở được hoặc có nơi lưu)', tdHtml) +
      '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<button class="nut-vien" data-eduqa="lam:goi">📦 Tải gói nội dung cho EduQA (Excel)</button>' +
      '<span style="font-size:13px;color:var(--chu-mo,#5b6575)">Bản Word dùng nội bộ: ' +
      '<a href="javascript:void 0" data-eduqa="lam:nhap">bản nháp báo cáo (đọc soát)</a> · ' +
      '<a href="javascript:void 0" data-eduqa="lam:dmmc">danh mục minh chứng</a>' +
      (suaDuoc ? ' · <a href="javascript:void 0" data-eduqa="di:qt:cn">điều kiện công nhận (Điều 16)</a>' : '') +
      '</span></div></div>';
    goc.onclick = function (e) {   // gán, không addEventListener: vẽ lại không nhân đôi
      var b = e.target.closest && e.target.closest('[data-eduqa]');
      if (!b) return;
      e.preventDefault();
      var v = b.getAttribute('data-eduqa');
      if (v.indexOf('mo:') === 0) {
        var s = goc.querySelector('[data-sub="' + v.slice(3) + '"]');
        if (s) { s.classList.add('open'); if (s.scrollIntoView) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      } else if (v.indexOf('di:') === 0) { if (window.tcqgDi) window.tcqgDi(v.slice(3)); }
      else if (v === 'lam:xuatmc') { if (window.xuatMinhChungEduQA) window.xuatMinhChungEduQA(); }
      else if (v === 'lam:goi') { if (window.tcqgXuatGoiEduQA) window.tcqgXuatGoiEduQA(); }
      else if (v === 'lam:nhap') { if (window.xuatBaoCaoTuDanhGia) window.xuatBaoCaoTuDanhGia(); }
      else if (v === 'lam:dmmc') { if (window.xuatMinhChungTheoTieuChuan) window.xuatMinhChungTheoTieuChuan(); }
    };
    goc.onchange = function (e) {   // gán, không addEventListener: vẽ lại không nhân đôi lệnh lưu
      var o = e.target;
      if (!o.classList || !o.classList.contains('eduqa-kh')) return;
      var k = o.getAttribute('data-kh'), gt = o.value.trim(), n = namDL();
      ghiDong(n, 'tdg.' + k, gt).then(function () {
        if (gt) PHU.kh[k] = gt; else delete PHU.kh[k];
        var b = document.getElementById('eduqa-kh-bao'); if (b) b.textContent = '✓ Đã lưu';
        henTrangTri();
      }, function (er) { window.notify('Không lưu được: ' + (er.message || er) + ' Nội dung vẫn còn trong ô.'); });
    };
    trangTri();
  }

  // ══════════ GÓI NỘI DUNG (Excel) ══════════
  // Trang 1: mỗi ô EduQA một dòng theo đúng thứ tự trên EduQA. Trang 2: số liệu
  // 03 năm (mục 3) nếu có thẻ Số liệu 3 năm. Trường dán tay theo tệp, hoặc đưa
  // tệp cho Trợ lý Quản trị trường học (/eduqa) nhập từng đợt có xác nhận.
  function khongDau(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function lapDong(d, vanDe, kh) {
    var bc = d.bc || {}, ds = [];
    kh = kh || {};
    function them(muc, cho, o, nd, url) { ds.push([muc, cho, o, nd || '', url || (MUC[muc] || MUC[muc.slice(0, 3)] || MUC['2']).url]); }
    O_KH.filter(function (o) { return o[0] !== '4.7'; }).forEach(function (o) { them(o[0], '', o[2], kh[o[1]], o[4]); });
    (d.tieuChi || []).forEach(function (t) {
      var nl = kh['25_nl_' + t.code], td = kh['25_td_' + t.code];
      if (co(nl) || co(td)) {
        them('2.5', 'Tiêu chí ' + t.code, 'Các nguồn lực cần huy động/cung cấp', nl, GOC2 + 'resource-plan');
        them('2.5', 'Tiêu chí ' + t.code, 'Thời điểm huy động', td, GOC2 + 'resource-plan');
      }
    });
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
    them('4.7', '', 'Danh mục viết tắt (mỗi dòng: viết tắt = đầy đủ)', kh['47_viet_tat']);
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
    var soLieu = window.soLieu3NamDong ? window.soLieu3NamDong(nam).catch(function () { return null; }) : Promise.resolve(null);
    Promise.all([lay, soLieu, taiPhu(nam)]).then(function (kq) {
      var vanDe = kq[0], sl = kq[1];
      var ds = lapDong(d, vanDe || [], PHU.kh);
      var rows = [{ o: ['Mục EduQA', 'Tiêu chí / tiêu chuẩn', 'Ô nhập trên EduQA', 'Nội dung (dán vào ô)', 'Đường dẫn EduQA']
        .map(function (v) { return { v: v, k: 'dauW' }; }) }];
      ds.forEach(function (r) {
        rows.push({ o: [{ v: r[0], k: 'oG' }, { v: r[1], k: 'oL' }, { v: r[2], k: 'oL' },
          { v: r[3] || '(chưa soạn)', k: 'oL' }, { v: r[4], k: 'oL' }] });
      });
      var sheets = [{ ten: 'Noi dung EduQA', cols: [10, 34, 34, 90, 40], rows: rows, in: { dongBang: 1, vuaNgang: true } }];
      if (sl && sl.dong && sl.dong.length) {
        var r2 = [{ o: ['Mục EduQA', 'Số liệu'].concat(sl.ds, ['Ghi chú']).map(function (v) { return { v: v, k: 'dauW' }; }) }];
        sl.dong.forEach(function (x) {
          r2.push({ o: [{ v: x.muc, k: 'oG' }, { v: x.ten, k: 'oL' }].concat(x.v.map(function (v) { return { v: String(v == null ? '' : v), k: 'oG' }; }), [{ v: x.gc || '', k: 'oL' }]) });
        });
        sheets.push({ ten: 'So lieu 3 nam', cols: [10, 60, 14, 14, 14, 30], rows: r2, in: { dongBang: 1, vuaNgang: true } });
      }
      var CH = window.CAU_HINH || {};
      var byte = window.EXCEL_DEP.tao({ sheets: sheets });
      var ten = 'NOI-DUNG-EduQA-' + khongDau(CH.TEN_TRUONG || 'Truong') + '-' + String(nam || '').replace(/\D/g, '') + '.xlsx';
      var u = URL.createObjectURL(new Blob([byte], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      var a = document.createElement('a'); a.href = u; a.download = ten;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      var trong = ds.filter(function (r) { return !co(r[3]); }).length;
      window.notify('✅ Đã tạo ' + ten + ' — ' + ds.length + ' ô' + (trong ? ', ' + trong + ' ô chưa soạn' : '') +
        (sl && sl.dong ? ' · trang 2: ' + sl.dong.length + ' dòng số liệu 03 năm' : '') +
        (vanDe === null ? '. Chưa đọc được Kế hoạch cải tiến nên thiếu mục 4.6' : '') + '.');
    });
  };

  // Cho kiểm thử ngoài trình duyệt
  window.__eduqaGoi = { moTa: moTa, lapDong: lapDong, bam: bam, PHU: PHU, trangThai: trangThai, thongKeMinhChung: thongKeMinhChung };
})();
