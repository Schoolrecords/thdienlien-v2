// ============================================================
// xuat-minh-chung-eduqa.js — XUẤT DANH MỤC MINH CHỨNG SANG PHẦN MỀM EduQA
// (bdclgd.vn, mục 4.3 "Minh chứng" → nút "Nhập từ Excel")
//
// Vì sao có: Sở GDĐT Nghệ An tập huấn EduQA ngày 16/11/2026 (bản gốc ở app
// mầm non `quantriso-mamnon-web`; tiểu học chép sang cùng ngày — sửa thì sửa cả hai).
// Tự đánh giá TT57 chính thức nhập trên EduQA. Kho hồ sơ số của app đã có đủ
// mã minh chứng (MC.a.b.cc), tên và link Drive, nên trường xuất một lần là có
// cả danh mục, không phải gõ lại từng dòng.
//
// 🔑 KHUÔN TỆP = ĐÚNG tệp mẫu "Tải file mẫu" của EduQA (tải 16/11/2026):
//    một trang, dòng 1 là tiêu đề, ba cột A–C:
//      Mã minh chứng | Tên minh chứng | Ghi chú
//    Mã theo dạng MC.a.b.cc (a = tiêu chuẩn, b = tiêu chí, cc = 01–99).
//    🔴 Đừng thêm cột, đừng thêm trang, đừng chèn dòng tên trường lên trên:
//    bộ nhập của EduQA đọc theo mẫu của họ, lệch khuôn là nhập hỏng.
//
// Mẫu KHÔNG có cột đường link, nên link Drive đặt trong cột Ghi chú. Muốn
// link bấm được ngay trên EduQA thì dùng nút "Chèn liên kết" ở từng dòng.
//
// Một hồ sơ dùng cho nhiều tiêu chí (Phụ lục I cho phép) vẫn chỉ ra MỘT dòng,
// giữ mã gốc. Trên EduQA, ở màn chấm tiêu chí khác, chọn "Tiêu chuẩn: Tất cả"
// rồi chèn mã đó vào. Ghi chú nêu đủ các tiêu chí để trường biết chèn ở đâu.
// ============================================================
(function () {
  'use strict';

  var MA_HOP_LE = /^MC\.\d\.\d\.\d{2}$/;

  function khongDau(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function taiVe(blob, ten) {
    var u = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = u; a.download = ten;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }

  // So mã theo từng số (MC.1.2.10 sau MC.1.2.09), không theo chữ.
  function soMa(a, b) {
    var x = a.split('.').slice(1).map(Number), y = b.split('.').slice(1).map(Number);
    for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  }

  function ghiChu(h) {
    var phan = [];
    var tc = (h.tc || []).slice();
    if (tc.length > 1) phan.push('Dùng cho tiêu chí ' + tc.join(', ') + '.');
    if (h.tt !== 'co') phan.push('Kho hồ sơ: chưa hoàn thiện.');
    phan.push(h.link ? 'Đường dẫn: ' + h.link : 'Chưa gắn đường dẫn Drive.');
    return phan.join(' ');
  }

  // Trả về { dong: [...], boQua: [...] } — tách riêng để kiểm thử được.
  function lapDanhSach(hoSo) {
    var daCo = {}, dong = [], boQua = [];
    (hoSo || []).forEach(function (h) {
      if (!h || h.tt === 'da_dong' || !(h.tc && h.tc.length)) return;
      var ma = String(h.ma || '').trim();
      if (!MA_HOP_LE.test(ma)) { boQua.push(ma || '(trống)'); return; }
      if (daCo[ma]) return;
      daCo[ma] = true;
      dong.push({ ma: ma, ten: String(h.ten || '').trim(), ghiChu: ghiChu(h) });
    });
    dong.sort(function (a, b) { return soMa(a.ma, b.ma); });
    return { dong: dong, boQua: boQua };
  }

  function taoSheet(dong) {
    var rows = [{ o: [
      { v: 'Mã minh chứng', k: 'dauW' },
      { v: 'Tên minh chứng', k: 'dauW' },
      { v: 'Ghi chú', k: 'dauW' }
    ] }];
    dong.forEach(function (d) {
      rows.push({ o: [
        { v: d.ma, k: 'oG' },
        { v: d.ten, k: 'oL' },
        { v: d.ghiChu, k: 'oL' }
      ] });
    });
    // Tên trang giữ "Sheet1" như tệp mẫu của EduQA.
    return { ten: 'Sheet1', cols: [16, 70, 60], rows: rows, in: { dongBang: 1, vuaNgang: true } };
  }

  window.xuatMinhChungEduQA = function () {
    if (!window.EXCEL_DEP) { window.notify('Chưa tải xong bộ ghi Excel, thầy cô thử lại sau ít giây.'); return; }
    // Ban xuất văn bản chính thức của màn TCQG (tcqg.js duocXuat): BGH + người giữ bút hội đồng.
    if (window.tcqgDuocXuat && !window.tcqgDuocXuat()) { window.notify(window.TCQG_CHU_CHAN_XUAT || 'Thầy cô không có quyền xuất.'); return; }
    var ds = lapDanhSach(window.HO_SO || []);
    if (!ds.dong.length) {
      window.notify('Chưa có hồ sơ nào gắn tiêu chí TT57 để xuất. Đăng nhập rồi thử lại.');
      return;
    }
    var CH = window.CAU_HINH || {};
    var byte = window.EXCEL_DEP.tao({ sheets: [taoSheet(ds.dong)] });
    var nam = String(CH.NAM_HOC || '').replace(/\D/g, '');
    var ten = 'MINH-CHUNG-EduQA-' + khongDau(CH.TEN_TRUONG || 'Truong') + (nam ? '-' + nam : '') + '.xlsx';
    taiVe(new Blob([byte], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), ten);
    var thieuLink = ds.dong.filter(function (d) { return /Chưa gắn đường dẫn/.test(d.ghiChu); }).length;
    window.notify('✅ Đã tạo ' + ten + ' — ' + ds.dong.length + ' minh chứng' +
      (thieuLink ? ' (' + thieuLink + ' chưa có link Drive)' : '') +
      '. Trên EduQA: mục 4.3 Minh chứng → Nhập từ Excel. ' +
      'Người thẩm định chỉ mở được link khi thư mục minh chứng trên Drive đã chia sẻ cho họ.' +
      (ds.boQua.length ? ' Bỏ qua ' + ds.boQua.length + ' mã sai dạng MC.a.b.cc: ' + ds.boQua.join(', ') + '.' : ''));
  };

  // Cho kiểm thử ngoài trình duyệt
  window.__eduqa = { lapDanhSach: lapDanhSach, taoSheet: taoSheet };
})();
