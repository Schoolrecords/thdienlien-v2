// ============================================================
// tcqg-so-lieu.js — BIỂU "THÔNG TIN DỮ LIỆU" 03 NĂM HỌC (31/10/2026)
//
// TT 57/2026, Mẫu 1, Phần IV: báo cáo tự đánh giá kèm cơ sở dữ liệu theo biểu
// "Thông tin dữ liệu – trường phổ thông" (PL V). Đ16 k1b: công nhận chuẩn quốc
// gia cần dữ liệu ít nhất 3 năm học liên tiếp. Trước đây báo cáo chỉ ghi "nhà
// trường nộp kèm" vì chưa có màn nhập (rà ở tai-lieu/QUY-TRINH-TCQG-TT57.md).
//
// Thẻ Quản trị "📊 Số liệu 3 năm" và window.bangSoLieuTT57Word (báo cáo Biểu 1 gọi).
// Lưu ở so_lieu_bao_cao (nam_hoc, ma_dong, gia_tri) — chỉ BGH/quản trị ghi được.
//
// SỐ MÁY ĐẾM (sql/89 so_lieu_tt57 + danh bạ): lớp, học sinh, đúng độ tuổi; đội ngũ
// chỉ NĂM HIỆN TẠI (moi_tai_khoan không có cột năm — không suy cho năm cũ, thà để
// trống cho nhập còn hơn in số sai). Số máy đếm hiện mờ trong ô; gõ đè thì lấy số gõ.
// ============================================================
(function () {
  'use strict';

  function thoat(s) { return window.thoatHTML ? window.thoatHTML(s) : String(s == null ? '' : s); }
  function namHienTai() { return window.CAU_HINH.NAM_HOC || window.tinhNamHoc(window.CAU_HINH.MOC_DOI_NAM_HOC); }
  function baNam(nam) {
    var d = parseInt(String(nam).split('-')[0], 10);
    return [d - 2, d - 1, d].map(function (n) { return n + '-' + (n + 1); });
  }

  function khoi(tien, nhan) {
    return [1, 2, 3, 4, 5].map(function (k) { return { k: tien + k, ten: nhan + ' ' + k }; });
  }
  var PHONG = function (t) {
    return [{ k: t + '.a', muc: 'a', ten: 'Phòng kiên cố' }, { k: t + '.b', muc: 'b', ten: 'Phòng bán kiên cố' }, { k: t + '.c', muc: 'c', ten: 'Phòng tạm' }];
  };
  // Các nhóm theo đúng thứ tự, đúng tên dòng của biểu mẫu. cong: dòng tự cộng.
  var NHOM = [
    { ma: 'lop', ten: '1. Số lớp học', dong: khoi('lop.k', 'Khối lớp').concat([
      { k: 'lop.cong', ten: 'Cộng', dam: true, cong: ['lop.k1', 'lop.k2', 'lop.k3', 'lop.k4', 'lop.k5'] }]) },
    { ma: 'ct', ten: '2. Cơ cấu khối công trình của nhà trường', dong: [
      { k: 'ct.I', muc: 'I', ten: 'Phòng học, phòng học bộ môn và khối phục vụ học tập', dam: true,
        cong: ['ct.1.a', 'ct.1.b', 'ct.1.c', 'ct.2.a', 'ct.2.b', 'ct.2.c', 'ct.3.a', 'ct.3.b', 'ct.3.c'] },
      { k: 'ct.1', muc: '1', ten: 'Phòng học', cong: ['ct.1.a', 'ct.1.b', 'ct.1.c'] }].concat(PHONG('ct.1'), [
      { k: 'ct.2', muc: '2', ten: 'Phòng học bộ môn', cong: ['ct.2.a', 'ct.2.b', 'ct.2.c'] }], PHONG('ct.2'), [
      { k: 'ct.3', muc: '3', ten: 'Khối phục vụ học tập', cong: ['ct.3.a', 'ct.3.b', 'ct.3.c'] }], PHONG('ct.3'), [
      { k: 'ct.II', muc: 'II', ten: 'Khối phòng hành chính - quản trị', dam: true, cong: ['ct.h.1', 'ct.h.2', 'ct.h.3'] },
      { k: 'ct.h.1', muc: '1', ten: 'Phòng kiên cố' }, { k: 'ct.h.2', muc: '2', ten: 'Phòng bán kiên cố' }, { k: 'ct.h.3', muc: '3', ten: 'Phòng tạm' },
      { k: 'ct.III', muc: 'III', ten: 'Thư viện', dam: true },
      { k: 'ct.IV', muc: 'IV', ten: 'Các công trình, khối phòng chức năng khác (nếu có)', dam: true },
      { k: 'ct.cong', ten: 'Cộng', dam: true, cong: ['ct.I', 'ct.II', 'ct.III', 'ct.IV'] }]) },
    { ma: 'gv', ten: '3b. Số liệu giáo viên của 3 năm học gần nhất', dong: [
      { k: 'gv.tong', muc: '1', ten: 'Tổng số giáo viên' },
      { k: 'gv.lop', muc: '2', ten: 'Tỉ lệ giáo viên/lớp' },
      { k: 'gv.hs', muc: '3', ten: 'Tỉ lệ giáo viên/học sinh' },
      { k: 'gv.gioi', muc: '4', ten: 'Tổng số giáo viên dạy giỏi các cấp (nếu có)' },
      { k: 'gv.gioi_t', muc: '5', ten: 'Tổng số giáo viên dạy giỏi cấp tỉnh trở lên (nếu có)' }] },
    { ma: 'hs', ten: '4a. Học sinh — số liệu chung', dong: [
      { k: 'hs.tong', muc: '1', ten: 'Tổng số học sinh', dam: true },
      { k: 'hs.nu', ten: '- Nữ' }, { k: 'hs.dtts', ten: '- Dân tộc thiểu số' }].concat(khoi('hs.k', '- Khối lớp'), [
      { k: 'hs.moi', muc: '2', ten: 'Tổng số tuyển mới' },
      { k: 'hs.2b', muc: '3', ten: 'Học 2 buổi/ngày' },
      { k: 'hs.bt', muc: '4', ten: 'Bán trú' },
      { k: 'hs.nt', muc: '5', ten: 'Nội trú' },
      { k: 'hs.bq', muc: '6', ten: 'Bình quân số học sinh/lớp học' },
      { k: 'hs.dt', muc: '7', ten: 'Số lượng và tỉ lệ % đi học đúng độ tuổi' },
      { k: 'hs.dt_nu', ten: '- Nữ' }, { k: 'hs.dt_dtts', ten: '- Dân tộc thiểu số' },
      { k: 'hs.gioi', muc: '8', ten: 'Tổng số học sinh giỏi các cấp (nếu có)' },
      { k: 'hs.gioi_qg', muc: '9', ten: 'Tổng số học sinh giỏi quốc gia (nếu có)' },
      { k: 'hs.cs', muc: '10', ten: 'Tổng số học sinh thuộc đối tượng chính sách' },
      { k: 'hs.cs_nu', ten: '- Nữ' }, { k: 'hs.cs_dtts', ten: '- Dân tộc thiểu số' },
      { k: 'hs.hc', muc: '11', ten: 'Tổng số học sinh (trẻ em) có hoàn cảnh đặc biệt' }]) },
    { ma: 'pc', ten: '4b. Công tác phổ cập giáo dục tiểu học và kết quả giáo dục', dong: [
      { k: 'pc.6t', ten: 'Trong địa bàn tuyển sinh của trường tỉ lệ trẻ em 6 tuổi vào lớp 1' },
      { k: 'pc.ht', ten: 'Tỉ lệ học sinh hoàn thành chương trình lớp học' },
      { k: 'pc.11t', ten: 'Tỉ lệ học sinh 11 tuổi hoàn thành chương trình tiểu học' },
      { k: 'pc.14t', ten: 'Tỉ lệ trẻ em đến 14 tuổi hoàn thành chương trình tiểu học' }] }
  ];
  var CB_DONG = [['ht', 'Hiệu trưởng'], ['pht', 'Phó hiệu trưởng'], ['gv', 'Giáo viên'], ['ns', 'Nhân sự hỗ trợ giáo dục']];
  var CB_COT = [['tong', 'Tổng số'], ['nu', 'Nữ'], ['dt', 'Dân tộc'], ['cd', 'Chưa đạt chuẩn'], ['dc', 'Đạt chuẩn'], ['tc', 'Trên chuẩn']];
  var TT_O = [
    ['tt.ten_cu', 'Tên trước đây (nếu có)'], ['tt.nam_tl', 'Năm thành lập trường'],
    ['tt.loai', 'Loại hình (Công lập, Tư thục…)'], ['tt.chuan', 'Đạt chuẩn quốc gia năm, mức độ'],
    ['tt.diem', 'Số điểm trường'], ['tt.vung', 'Thuộc vùng khó khăn / đặc biệt khó khăn'], ['tt.web', 'Website']
  ];

  // ── Nạp: số đã lưu + số máy đếm ──
  function nap(nam) {
    var may = window.MAY_CHU, ds = baNam(nam);
    return Promise.all([
      may.from('so_lieu_bao_cao').select('nam_hoc,ma_dong,gia_tri').in('nam_hoc', ds),
      Promise.all(ds.map(function (n) { return may.rpc('so_lieu_tt57', { p_nam: n }); })),
      nam === namHienTai() ? may.from('moi_tai_khoan').select('*') : Promise.resolve({ data: null })
    ]).then(function (kq) {
      if (kq[0].error) throw kq[0].error;
      var luu = {}, tu = {}, thieuHam = false;
      (kq[0].data || []).forEach(function (r) { (luu[r.nam_hoc] = luu[r.nam_hoc] || {})[r.ma_dong] = r.gia_tri; });
      ds.forEach(function (n, i) {
        var r = kq[1][i];
        if (r.error) { thieuHam = true; tu[n] = {}; return; }
        tu[n] = doiSoDem(r.data || {});
      });
      demDoiNgu(kq[2].data, tu[nam], nam);
      return { nam: nam, ds: ds, luu: luu, tu: tu, thieuHam: thieuHam };
    });
  }
  function tiLe(a, b, so) { return (a && b) ? (a / b).toFixed(so).replace('.', ',') : ''; }
  function doiSoDem(v) {
    var o = {};
    if (!v.hs_tong) return o;   // app chưa có dữ liệu năm này: để trống, không ghi số 0
    [1, 2, 3, 4, 5].forEach(function (k) { o['lop.k' + k] = v['lop_k' + k]; o['hs.k' + k] = v['hs_k' + k]; });
    o['hs.tong'] = v.hs_tong; o['hs.nu'] = v.hs_nu; o['hs.dtts'] = v.hs_dtts;
    o['hs.bq'] = tiLe(v.hs_tong, v.lop_tong, 1);
    function pt(a, b) { return a + ' (' + tiLe(a * 100, b, 1) + '%)'; }
    o['hs.dt'] = pt(v.dt_sl, v.hs_tong);
    o['hs.dt_nu'] = v.hs_nu ? pt(v.dt_nu, v.hs_nu) : '';
    o['hs.dt_dtts'] = v.hs_dtts ? pt(v.dt_dtts, v.hs_dtts) : '';
    o._lop = v.lop_tong; o._hs = v.hs_tong;
    return o;
  }
  // Đội ngũ NĂM HIỆN TẠI: đúng luật danh bạ (window.nhomCBGV), một người hai Gmail đếm một
  function demDoiNgu(mtk, o, nam) {
    if (!mtk || !window.nhomCBGV || !o) return;
    var nguoi = {};
    mtk.forEach(function (m) {
      if (m.la_ky_thuat) return;
      nguoi[String(m.email_chinh || m.email || '').trim().toLowerCase()] = m;
    });
    var dem = { ht: 0, pht: 0, gv: 0, ns: 0 };
    Object.keys(nguoi).forEach(function (k) {
      var m = nguoi[k], nh = window.nhomCBGV(m), cv = String(m.chuc_vu || '').toLowerCase();
      if (nh === 'ban_giam_hieu') { if (/phó\s*hiệu/.test(cv)) dem.pht++; else dem.ht++; }
      else if (nh === 'giao_vien' || nh === 'to_truong') dem.gv++;
      else if (nh === 'nhan_vien') dem.ns++;
    });
    CB_DONG.forEach(function (d) { o['cb.' + d[0] + '.tong'] = dem[d[0]]; });
    o['gv.tong'] = dem.gv;
    o['gv.lop'] = tiLe(dem.gv, o._lop, 2);
    o['gv.hs'] = tiLe(dem.gv, o._hs, 3);
  }
  function giaTri(D, nam, k) {
    var l = (D.luu[nam] || {})[k];
    if (l !== undefined && l !== null && l !== '') return l;
    var t = (D.tu[nam] || {})[k];
    return t === undefined || t === null ? '' : t;
  }
  function tinhCong(D, nam, dong) {
    var tong = 0, co = false;
    dong.cong.forEach(function (k) {
      var ct = timDong(k), v = ct && ct.cong ? tinhCong(D, nam, ct) : giaTri(D, nam, k);
      var n = parseFloat(String(v).replace(',', '.'));
      if (!isNaN(n)) { tong += n; co = true; }
    });
    return co ? tong : '';
  }
  var BANG_DONG = {};
  NHOM.forEach(function (n) { n.dong.forEach(function (d) { BANG_DONG[d.k] = d; }); });
  function timDong(k) { return BANG_DONG[k]; }
  function hienThi(D, nam, d) { return d.cong ? tinhCong(D, nam, d) : giaTri(D, nam, d.k); }

  // ── Thẻ Quản trị ──
  function ve(hop) {
    hop.innerHTML = '<div class="nhan-nho" style="margin:14px 0">Đang tải số liệu…</div>';
    var nam = namHienTai();
    nap(nam).then(function (D) { veBang(hop, D); })
      .catch(function (e) { hop.innerHTML = '<div class="hs-loi hien">Không tải được số liệu: ' + thoat(e.message || e) + '</div>'; });
  }
  function oNhap(D, nam, k, tuDem) {
    var l = (D.luu[nam] || {})[k];
    return '<input class="sl-o" data-nam="' + nam + '" data-k="' + k + '" value="' + thoat(l == null ? '' : l) + '"' +
      (tuDem !== '' && tuDem != null ? ' placeholder="' + thoat(tuDem) + '" title="Số máy đếm từ dữ liệu app. Gõ đè nếu cần sửa."' : '') + '>';
  }
  function veBang(hop, D) {
    var cuoi = D.ds[2];
    function dauNam() { return D.ds.map(function (n) { return '<th>Năm học ' + n + '</th>'; }).join(''); }
    var h = '<div class="nhan-nho" style="margin:14px 0 10px">Biểu "Thông tin dữ liệu" kèm báo cáo tự đánh giá (Mẫu 1, TT 57/2026). ' +
      'Số <b>mờ</b> trong ô là máy đếm từ dữ liệu app; gõ đè nếu cần sửa. Máy tự lưu khi rời ô. Báo cáo tự đánh giá in biểu này ở cuối.</div>';
    if (D.thieuHam) h += '<div class="hs-loi hien" style="margin:0 0 10px">Cơ sở dữ liệu của trường chưa cài phần đếm tự động (sql/89), các ô vẫn nhập tay được.</div>';

    h += '<div class="tl-nhom sl-chung"><h4>Thông tin chung</h4>' + TT_O.map(function (o) {
      return '<label class="tl-o"><span class="tl-nhan">' + thoat(o[1]) + '</span>' + oNhap(D, cuoi, o[0]) + '</label>';
    }).join('') + '</div>';

    NHOM.forEach(function (n, i) {
      h += '<h4 class="sl-td">' + thoat(n.ten) + '</h4><div class="sl-cuon"><table class="sl-bang"><thead><tr><th class="sl-ten">Số liệu</th>' + dauNam() +
        '<th>Ghi chú</th></tr></thead><tbody>' + n.dong.map(function (d) {
          return '<tr' + (d.dam ? ' class="dam"' : '') + '><td class="sl-ten">' + (d.muc ? '<span class="sl-muc">' + d.muc + '</span> ' : '') + thoat(d.ten) + '</td>' +
            D.ds.map(function (nm) {
              if (d.cong) return '<td class="sl-tinh" data-tinh="' + d.k + '" data-nam="' + nm + '">' + thoat(tinhCong(D, nm, d)) + '</td>';
              return '<td>' + oNhap(D, nm, d.k, (D.tu[nm] || {})[d.k]) + '</td>';
            }).join('') +
            '<td>' + (d.cong ? '' : oNhap(D, cuoi, 'gc.' + d.k)) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      if (n.ma === 'ct') {
        h += '<h4 class="sl-td">3a. Cán bộ quản lý, giáo viên, nhân sự hỗ trợ giáo dục tại thời điểm tự đánh giá (' + cuoi + ')</h4>' +
          '<div class="sl-cuon"><table class="sl-bang"><thead><tr><th class="sl-ten"></th>' +
          CB_COT.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>' +
          CB_DONG.map(function (dg) {
            return '<tr><td class="sl-ten">' + dg[1] + '</td>' + CB_COT.map(function (c) {
              var k = 'cb.' + dg[0] + '.' + c[0];
              return '<td>' + oNhap(D, cuoi, k, (D.tu[cuoi] || {})[k]) + '</td>';
            }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>';
      }
    });
    h += '<h4 class="sl-td">5. Các số liệu khác (nếu có)</h4><textarea class="sl-o sl-khac" rows="3" data-nam="' + cuoi + '" data-k="khac">' +
      thoat((D.luu[cuoi] || {}).khac || '') + '</textarea><p class="tl-bao" id="sl-bao"></p>';
    hop.innerHTML = h;

    hop.onchange = function (e) {   // gán, không addEventListener: thẻ vẽ lại không nhân đôi lệnh lưu
      var o = e.target;
      if (!o.classList || !o.classList.contains('sl-o')) return;
      luu(D, o, hop);
    };
  }
  function luu(D, o, hop) {
    var nam = o.getAttribute('data-nam'), k = o.getAttribute('data-k'), gt = o.value.trim();
    var bang = window.MAY_CHU.from('so_lieu_bao_cao');
    var hua = gt
      ? bang.upsert({ nam_hoc: nam, ma_dong: k, gia_tri: gt }, { onConflict: 'nam_hoc,ma_dong' }).select()
      : bang.delete().eq('nam_hoc', nam).eq('ma_dong', k).select();
    var bao = hop.querySelector('#sl-bao');
    hua.then(function (r) {
      if (r.error) throw r.error;
      if (gt && (!r.data || !r.data.length)) throw new Error('máy chủ không ghi dòng nào — kiểm tra quyền');
      D.luu[nam] = D.luu[nam] || {};
      if (gt) D.luu[nam][k] = gt; else delete D.luu[nam][k];
      Array.prototype.forEach.call(hop.querySelectorAll('[data-tinh]'), function (c) {
        c.textContent = tinhCong(D, c.getAttribute('data-nam'), timDong(c.getAttribute('data-tinh')));
      });
      if (window.tcqgNapBuoc) window.tcqgNapBuoc();
      if (bao) bao.textContent = '✓ Đã lưu';
    }).catch(function (e) {
      window.notify('Không lưu được số liệu: ' + (e.message || e));
    });
  }

  // ── Bản in kèm báo cáo Biểu 1 ──
  var TR = "font-family:'Times New Roman',serif;";
  var O = 'border:1px solid #000;padding:3pt 5pt;font-size:11.5pt;' + TR;
  function theBang(dau, than) {
    return '<table style="width:100%;border-collapse:collapse;margin:0 0 8pt"><tr>' +
      dau.map(function (c) { return '<td style="' + O + 'font-weight:bold;text-align:center">' + c + '</td>'; }).join('') +
      '</tr>' + than + '</table>';
  }
  function tieuDe(s) { return '<p style="' + TR + 'font-size:12.5pt;font-weight:bold;margin:9pt 0 4pt">' + s + '</p>'; }
  window.bangSoLieuTT57Word = function (nam) {
    return nap(nam).then(function (D) {
      var C = window.CAU_HINH, cuoi = D.ds[2], gt = function (k) { return thoat(giaTri(D, cuoi, k)); };
      var h = '<br clear="all" style="page-break-before:always">' +
        '<p style="' + TR + 'text-align:center;font-size:13pt;font-weight:bold;margin:0">Phần I</p>' +
        '<p style="' + TR + 'text-align:center;font-size:13pt;font-weight:bold;margin:0">THÔNG TIN DỮ LIỆU</p>' +
        '<p style="' + TR + 'text-align:center;font-size:12pt;margin:0 0 8pt">(Đối với trường phổ thông)</p>' +
        '<p style="' + TR + 'font-size:12pt;margin:0 0 2pt">Tên trường (theo quyết định mới nhất): ' + thoat(C.TEN_TRUONG || '') + '</p>' +
        '<p style="' + TR + 'font-size:12pt;margin:0 0 2pt">Tên trước đây (nếu có): ' + gt('tt.ten_cu') + '</p>' +
        '<p style="' + TR + 'font-size:12pt;margin:0 0 6pt">Cơ quan quản lý: ' + thoat(C.CHU_QUAN_THUONG || '') + '</p>' +
        '<p style="' + TR + 'font-size:12pt;margin:0 0 6pt">Địa chỉ: ' + thoat(C.DIA_CHI_TRUONG || '') + ' · Hiệu trưởng: ' + thoat(C.HIEU_TRUONG || '') +
        ' · Điện thoại: ' + thoat(C.DIEN_THOAI || '') + ' · Website: ' + gt('tt.web') + '<br>Năm thành lập: ' + gt('tt.nam_tl') +
        ' · Loại hình: ' + gt('tt.loai') + ' · Đạt chuẩn quốc gia: ' + gt('tt.chuan') + ' · Số điểm trường: ' + gt('tt.diem') + ' · Vùng: ' + gt('tt.vung') + '</p>';
      NHOM.forEach(function (n) {
        h += tieuDe(n.ten) + theBang(['Số liệu'].concat(D.ds.map(function (x) { return 'Năm học ' + x; }), ['Ghi chú']),
          n.dong.map(function (d) {
            var st = d.dam ? 'font-weight:bold;' : '';
            return '<tr><td style="' + O + st + '">' + (d.muc ? d.muc + '. ' : '') + thoat(d.ten) + '</td>' +
              D.ds.map(function (nm) { return '<td style="' + O + st + 'text-align:center">' + thoat(hienThi(D, nm, d)) + '</td>'; }).join('') +
              '<td style="' + O + '">' + thoat(giaTri(D, cuoi, 'gc.' + d.k)) + '</td></tr>';
          }).join(''));
        if (n.ma === 'ct') {
          h += tieuDe('3a. Cán bộ quản lý, giáo viên, nhân sự hỗ trợ giáo dục tại thời điểm tự đánh giá') +
            theBang([''].concat(CB_COT.map(function (c) { return c[1]; })), CB_DONG.map(function (dg) {
              return '<tr><td style="' + O + '">' + dg[1] + '</td>' + CB_COT.map(function (c) {
                return '<td style="' + O + 'text-align:center">' + gt('cb.' + dg[0] + '.' + c[0]) + '</td>';
              }).join('') + '</tr>';
            }).join(''));
        }
      });
      var khac = (D.luu[cuoi] || {}).khac;
      if (khac) h += tieuDe('5. Các số liệu khác') + '<p style="' + TR + 'font-size:12pt;margin:0">' + thoat(khac) + '</p>';
      return h;
    });
  };
  // Đếm ô đã nhập cho thanh các bước
  window.tcqgDemSoLieu = function (nam) {
    return window.MAY_CHU.from('so_lieu_bao_cao').select('ma_dong', { count: 'exact', head: true }).eq('nam_hoc', nam)
      .then(function (r) { return r.error ? 0 : (r.count || 0); });
  };

  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'sl', ten: '📊 Số liệu 3 năm', ve: ve });
})();
