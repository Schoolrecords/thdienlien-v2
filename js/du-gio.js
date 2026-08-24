// ============================================================
// du-gio.js — DỰ GIỜ – THĂM LỚP + KIỂM TRA NỘI BỘ
// Nằm trong thẻ "👀 Dự giờ – Kiểm tra" của module Điều hành.
//
// Hai việc quản lý chuyên môn thường xuyên nhất của Ban giám hiệu, và là hai
// việc ĐẺ RA MINH CHỨNG cho hộp hồ sơ TT57 lẫn Biểu 1 trường chuẩn — chỗ mà
// VNEDU và các phần mềm điều hành chung không đụng tới.
//
// ⚠️ VỀ BỘ TIÊU CHÍ CHẤM TIẾT DẠY:
//   Công văn 5555/BGDĐT-GDTrH là văn bản của cấp TRUNG HỌC (12 tiêu chí /
//   3 nhóm; tiêu chí 1–4 tối đa 1,0 điểm, 5–12 tối đa 2,0 điểm; tổng 20 điểm;
//   tiêu chí 6, 7, 10, 11 là trọng tâm). TIỂU HỌC không có mẫu phiếu bắt buộc
//   dùng chung toàn quốc. Nên app gieo sẵn KHUNG đúng thang điểm đó nhưng
//   ĐỂ TRỐNG lời văn từng tiêu chí — Ban giám hiệu chép vào đúng câu chữ của
//   phiếu trường đang dùng. KHÔNG tự chế lời văn của văn bản.
//
//   Phiếu dùng được ĐẦY ĐỦ ngay cả khi chưa điền rubric: phần bắt buộc là
//   người dạy / lớp / môn / tiết / nhận xét / xếp loại.
//
// ⚠️ KHÔNG ghi tên thật CBGV vào tệp này — repo công khai.
// ============================================================
(function () {
  'use strict';

  function $(s) { return document.querySelector(s); }
  function K() { return window.DH_KHO; }
  function thoat(s) { return K().thoat(s); }
  function nhay(s) { return K().nhay(s); }
  function ngayVN(s) { return K().ngayVN(s); }
  function laQT() { return K().laQT(); }
  function THAT() { return K().that(); }
  function DL() { return K().dl(); }
  function namHoc() { return K().nam() || (window.CAU_HINH && window.CAU_HINH.NAM_HOC) || ''; }

  var XEP_LOAI = { gioi: 'Giỏi', kha: 'Khá', trung_binh: 'Trung bình', chua_dat: 'Chưa đạt' };
  var XEP_MAU = { gioi: 'xanh', kha: 'xanh', trung_binh: 'vang', chua_dat: 'do' };
  var TT_KTNB = { ke_hoach: ['xam', 'Theo kế hoạch'], dang_lam: ['vang', 'Đang kiểm tra'], xong: ['xanh', 'Đã xong'] };

  // ════════════════════════════════════════════════════════════
  // KHO
  // ════════════════════════════════════════════════════════════
  var DS_DG = null;        // phiếu dự giờ của năm học
  var DS_KTNB = null;      // các đợt kiểm tra nội bộ
  var TIEU_CHI = [];       // danh mục tiêu chí chấm tiết dạy
  var TEN_NHOM = ['Kế hoạch và tài liệu dạy học',
    'Tổ chức hoạt động học cho học sinh', 'Hoạt động của học sinh'];
  var DINH_MUC_GV = 0, DINH_MUC_BGH = 0;
  var DA_NAP = '', DANG = false, LOI = '', CO_BANG = true, DANG_GUI = false;
  var SO_PHIEU_HIEN = 30;  // xem thêm 30 phiếu mỗi lần bấm
  var MO_TC = false;       // mở khung nhập cả bộ tiêu chí

  // Tiếng Việt dùng dấu PHẨY thập phân, và không in ".00" thừa
  function soVN(n) {
    if (n === null || n === undefined || n === '') return '';
    var s = Number(n).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',');
  }
  var MUC = 'dugio';       // 'dugio' | 'ktnb'
  var MO_PHIEU = false;    // mở khung ghi phiếu dự giờ
  var MO_DOT = false;      // mở khung thêm đợt kiểm tra
  var DIEM = {};           // điểm đang chấm: {so_tt: điểm}
  var XEM_PHIEU = null;    // id phiếu đang mở xem chi tiết
  var KT_SUA = null;       // id đợt kiểm tra đang mở khung ghi kết luận

  // ── Bản mẫu ──
  function duLieuMau() {
    var t = K().homNayISO();
    function lui(n) {
      var d = new Date(t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10));
      d.setDate(d.getDate() - n);
      return d.getFullYear() + '-' + K().pad2(d.getMonth() + 1) + '-' + K().pad2(d.getDate());
    }
    return {
      dg: [
        { id: 1, ngay: lui(2), buoi: 'sang', tiet: 2, lop: '1A', mon: 'Tiếng Việt',
          bai: 'Bài 12: Âm và chữ', gvTen: 'Cô Nguyễn Thị A. (mẫu)', gvEmail: 'mau0@mau',
          coSo: 'CS01', nguoiDu: 'Phó Hiệu trưởng (mẫu)', tongDiem: 17.5, xepLoai: 'gioi',
          uuDiem: 'Tổ chức hoạt động nhóm sinh động, học sinh tham gia đều.',
          hanChe: 'Thời gian phần luyện tập hơi ngắn.', deNghi: 'Cân đối lại thời lượng hai hoạt động cuối.', diem: {} },
        { id: 2, ngay: lui(5), buoi: 'chieu', tiet: 1, lop: '4A', mon: 'Toán',
          bai: 'Phân số bằng nhau', gvTen: 'Thầy Phạm Văn D. (mẫu)', gvEmail: 'mau2@mau',
          coSo: 'CS02', nguoiDu: 'Hiệu trưởng (mẫu)', tongDiem: 15, xepLoai: 'kha',
          uuDiem: 'Nắm chắc kiến thức, hệ thống bài rõ.',
          hanChe: 'Còn ít cơ hội cho học sinh tự phát hiện vấn đề.', deNghi: '', diem: {} }
      ],
      ktnb: [
        { id: 1, ten: 'Kiểm tra hồ sơ chuyên môn tổ khối 1', noiDung: 'Kế hoạch bài dạy, sổ theo dõi chất lượng',
          doiTuong: 'Tổ khối 1', coSo: null, tuNgay: lui(20), denNgay: lui(18),
          nguoiKT: 'Phó Hiệu trưởng (mẫu)', trangThai: 'xong',
          ketLuan: 'Hồ sơ đầy đủ, ký duyệt đúng hạn.', kienNghi: 'Bổ sung phần điều chỉnh sau bài dạy.', link: '' },
        { id: 2, ten: 'Kiểm tra công tác bán trú và vệ sinh an toàn', noiDung: '',
          doiTuong: 'Bộ phận phục vụ', coSo: 'CS01', tuNgay: lui(-7), denNgay: lui(-9),
          nguoiKT: 'Hiệu trưởng (mẫu)', trangThai: 'ke_hoach', ketLuan: '', kienNghi: '', link: '' }
      ]
    };
  }

  // ════════════════════════════════════════════════════════════
  // NẠP
  // ════════════════════════════════════════════════════════════
  function nap(nam) {
    DA_NAP = nam; DANG = true; LOI = '';

    if (!THAT()) {
      var m = duLieuMau();
      DS_DG = m.dg; DS_KTNB = m.ktnb;
      // Bản xem thử PHẢI có bộ tiêu chí, không thì khung chấm điểm — thứ trung
      // tâm của đợt C — biến mất và người xem tưởng chức năng chưa làm.
      // Lời văn dưới đây là MẪU MINH HOẠ, không phải trích văn bản nào.
      TIEU_CHI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (i) {
        return { soTt: i, nhom: i <= 4 ? 1 : i <= 8 ? 2 : 3,
          noiDung: 'Tiêu chí ' + i + ' (mẫu minh hoạ — nhà trường chép lời văn phiếu của mình vào)',
          diemToiDa: i <= 4 ? 1 : 2, trongTam: [6, 7, 10, 11].indexOf(i) >= 0 };
      });
      DINH_MUC_GV = 4; DINH_MUC_BGH = 20;
      CO_BANG = true; DANG = false;
      return;
    }

    var may = window.MAY_CHU;

    // Đọc phiếu dự giờ THEO TRANG 1000 dòng. Bản đầu .limit(1000): trường 40
    // giáo viên × định mức 18 tiết/năm + Ban giám hiệu là hơn 1000 phiếu một
    // năm học, PostgREST cắt im lặng ở dòng 1000 — bảng tổng hợp đếm THIẾU mà
    // không báo, cô nào có phiếu cũ nhất bị tính là chưa đủ định mức.
    // Sắp theo ngày rồi theo id để ranh giới trang ổn định: hai phiếu cùng
    // ngày mà chỉ sắp theo ngày thì thứ tự giữa hai lần hỏi có thể đảo,
    // một phiếu rơi vào cả hai trang hoặc rớt khỏi cả hai.
    function docHetDuGio() {
      var ra = [], tu = 0;
      function trang() {
        return may.from('du_gio').select('*').eq('nam_hoc', nam)
          .order('ngay', { ascending: false }).order('id', { ascending: false })
          .range(tu, tu + 999)
          .then(function (r) {
            if (r.error) return r;          // trả nguyên để nhánh dưới ném lỗi như cũ
            var d = r.data || [];
            ra = ra.concat(d);
            if (d.length < 1000) return { data: ra };
            tu += 1000;
            return trang();
          });
      }
      return trang();
    }

    Promise.all([
      docHetDuGio(),
      // Ban giám hiệu đọc bảng gốc (có kết luận, kiến nghị); người khác đọc
      // KHUNG NHÌN đã bỏ hai cột đó — kết luận về một tổ/cá nhân không phải
      // thứ cả trường đọc. Hàng rào thật nằm ở RLS, đây chỉ là chọn nguồn.
      may.from(laQT() ? 'ktnb_dot' : 'ktnb_ke_hoach')
        .select('*').eq('nam_hoc', nam).order('tu_ngay', { ascending: true }).limit(200),
      may.from('du_gio_tieu_chi').select('*').eq('dang_bat', true).order('so_tt'),
      may.from('cau_hinh').select('khoa, gia_tri').like('khoa', 'du\\_gio\\_%')
    ]).then(function (kq) {
      DANG = false;
      if (nam !== namHoc()) { DA_NAP = ''; K().veLai(); return; }
      if (kq[0].error) throw kq[0].error;
      if (kq[1].error) throw kq[1].error;
      CO_BANG = true;
      DS_DG = (kq[0].data || []).map(doiDG);
      DS_KTNB = (kq[1].data || []).map(doiKT);
      TIEU_CHI = kq[2].error ? [] : (kq[2].data || []).map(function (c) {
        return { soTt: c.so_tt, nhom: c.nhom, noiDung: c.noi_dung || '',
          diemToiDa: Number(c.diem_toi_da), trongTam: !!c.trong_tam };
      });
      DINH_MUC_GV = 0; DINH_MUC_BGH = 0;
      if (!kq[3].error) (kq[3].data || []).forEach(function (c) {
        if (c.khoa === 'du_gio_ten_nhom' && c.gia_tri) {
          var t = String(c.gia_tri).split('|');
          if (t.length === 3) TEN_NHOM = t;
        }
        if (c.khoa === 'du_gio_dinh_muc_gv') DINH_MUC_GV = parseInt(c.gia_tri, 10) || 0;
        if (c.khoa === 'du_gio_dinh_muc_bgh') DINH_MUC_BGH = parseInt(c.gia_tri, 10) || 0;
      });
      K().veLai();
    }).catch(function (e) {
      if (K().loiThieuBang(e)) { CO_BANG = false; LOI = ''; }
      else { LOI = 'Không đọc được dữ liệu dự giờ: ' + ((e && e.message) || e); }
      DS_DG = null; DS_KTNB = null; DANG = false;
      K().veLai();
    });
  }

  function doiDG(d) {
    return { id: d.id, ngay: d.ngay, buoi: d.buoi, tiet: d.tiet, lop: d.lop, mon: d.mon,
      bai: d.bai || '', gvTen: d.gv_ten, gvEmail: d.gv_email || '', coSo: d.co_so_ma,
      nguoiDu: d.nguoi_du_ten, nguoiDuId: d.nguoi_du_id,
      diem: d.diem || {}, tongDiem: d.tong_diem === null ? null : Number(d.tong_diem),
      xepLoai: d.xep_loai, uuDiem: d.uu_diem || '', hanChe: d.han_che || '', deNghi: d.de_nghi || '' };
  }
  function doiKT(d) {
    return { id: d.id, ten: d.ten, noiDung: d.noi_dung || '', doiTuong: d.doi_tuong || '',
      coSo: d.co_so_ma, tuNgay: d.tu_ngay, denNgay: d.den_ngay, nguoiKT: d.nguoi_kt_ten || '',
      trangThai: d.trang_thai, ketLuan: d.ket_luan || '', kienNghi: d.kien_nghi || '',
      link: d.link_drive || '' };
  }

  // ════════════════════════════════════════════════════════════
  // TỔNG HỢP — mọi con số đều TÍNH, không viết cứng
  // ════════════════════════════════════════════════════════════
  function chuanTen(t) { return String(t || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
  function khoaNg(email, ten) {
    return email ? 'e:' + String(email).trim().toLowerCase() : 't:' + chuanTen(ten);
  }
  // Dự giờ là việc của NGƯỜI ĐỨNG LỚP. Bảng công lấy cả bảo vệ, cấp dưỡng,
  // kế toán là đúng (ai cũng có ngày công); bảng dự giờ mà lấy cả thì đặt định
  // mức xong là app tô đỏ bác bảo vệ "chưa đủ 4 tiết" — vô nghĩa và mất mặt.
  function laNguoiDayHoc(g) {
    var cv = chuanTen(g.chucVu);
    if (!cv) return true;              // chưa khai chức vụ thì cứ tính là dạy học
    return /giáo viên|gv|tổ trưởng|tổ phó|hiệu trưởng|hiệu phó|phó hiệu trưởng|tổng phụ trách/.test(cv);
  }
  function tongHop() {
    var duocDu = {}, diDu = {}, thuTu = [];
    var dsGV = (DL().gvDs || []).filter(laNguoiDayHoc);

    function them(k, ten, email, coSo, trongDs) {
      if (duocDu[k]) return duocDu[k];
      duocDu[k] = { ten: ten, email: email || '', coSo: coSo || '', so: 0, loai: {}, trongDs: trongDs };
      thuTu.push(k);
      return duocDu[k];
    }
    // Gieo TOÀN BỘ người đứng lớp trước: ai CHƯA được dự tiết nào cũng phải có
    // dòng số 0 — đó mới là thứ Ban giám hiệu cần nhìn cuối năm.
    dsGV.forEach(function (g, i) {
      var k = khoaNg(g.email, g.ten);
      if (duocDu[k]) k = k + '#' + i;   // hai người trùng tên, chưa ai có email
      them(k, g.ten, g.email, g.coSo, true);
    });
    // Cầu nối theo TÊN cho phiếu ghi khi người đó chưa có email (bài học bảng
    // công). Tên trùng nhau thì bỏ cầu nối — thà tách hai dòng còn hơn cộng
    // tiết của người này sang người kia.
    var theoTen = {};
    dsGV.forEach(function (g) {
      var t = chuanTen(g.ten);
      if (!t) return;
      theoTen[t] = theoTen[t] === undefined ? khoaNg(g.email, g.ten) : null;
    });

    (DS_DG || []).forEach(function (d) {
      var k = khoaNg(d.gvEmail, d.gvTen);
      if (!duocDu[k]) {
        var k2 = theoTen[chuanTen(d.gvTen)];
        if (k2) k = k2;
      }
      // coSo của người CÓ trong danh sách giữ nguyên cơ sở công tác; chỉ người
      // lạ mới lấy cơ sở của tiết dạy (hai thứ đó khác nghĩa nhau)
      var n = them(k, d.gvTen, d.gvEmail, d.coSo, false);
      n.so++;
      if (d.xepLoai) n.loai[d.xepLoai] = (n.loai[d.xepLoai] || 0) + 1;

      var k3 = 't:' + chuanTen(d.nguoiDu);
      if (!diDu[k3]) diDu[k3] = { ten: d.nguoiDu, so: 0 };
      diDu[k3].so++;
    });

    function raMang(o) {
      return Object.keys(o).map(function (k) { return o[k]; }).sort(function (a, b) {
        return b.so - a.so || String(a.ten).localeCompare(String(b.ten), 'vi');
      });
    }
    // thuTu chứa MỌI khoá (them() đẩy vào cả khi gieo lẫn khi gặp người lạ)
    var ds = thuTu.map(function (k) { return duocDu[k]; }).sort(function (a, b) {
      return b.so - a.so || String(a.ten).localeCompare(String(b.ten), 'vi');
    });
    return { duocDu: ds, diDu: raMang(diDu), tong: (DS_DG || []).length };
  }

  // ════════════════════════════════════════════════════════════
  // VẼ
  // ════════════════════════════════════════════════════════════
  function chonNguoi(id, nhan) {
    return '<select class="dh-o-nhap" id="' + id + '" style="max-width:100%;margin-top:0">' +
      '<option value="">' + (nhan || '— chọn người —') + '</option>' +
      (DL().gvDs || []).map(function (g) {
        return '<option value="' + thoat(g.ten) + '" data-email="' + thoat(g.email || '') + '">' +
          thoat(g.ten) + (g.chucVu ? ' (' + thoat(g.chucVu) + ')' : '') + '</option>';
      }).join('') + '</select>';
  }

  function veKhungPhieu() {
    var nhieuCS = DL().coSo.length > 1;
    var coRubric = TIEU_CHI.filter(function (c) { return c.noiDung; }).length > 0;

    var oTieuChi = '';
    if (TIEU_CHI.length) {
      oTieuChi = '<div class="dh-tieu-de" style="margin-top:12px">Chấm theo tiêu chí ' +
        '<small>(' + soVN(tongDiemDang()) + '/' + tongToiDa() + ' điểm)</small></div>' +
        (coRubric ? '' :
          '<div class="hd-kiem vang" style="margin-top:0">Bộ tiêu chí <b>chưa có lời văn</b> — ' +
          'Ban giám hiệu chép nội dung ' + TIEU_CHI.length + ' tiêu chí từ phiếu dự giờ nhà trường đang dùng ' +
          'bằng nút <b>✎ Bộ tiêu chí</b>. Chưa điền thì vẫn chấm và lưu phiếu bình thường.</div>') +
        [1, 2, 3].map(function (n) {
          var ds = TIEU_CHI.filter(function (c) { return c.nhom === n; });
          if (!ds.length) return '';
          return '<div class="dg-nhom"><div class="dg-nhom-ten">' + thoat(TEN_NHOM[n - 1] || ('Nhóm ' + n)) + '</div>' +
            ds.map(function (c) {
              var moc = mocDiem(c.diemToiDa);
              return '<div class="dg-tc"><div class="dg-tc-tt">' +
                '<b>' + c.soTt + '.</b> ' + (c.noiDung ? thoat(c.noiDung) : '<i>(chưa điền nội dung)</i>') +
                (c.trongTam ? ' <span class="dg-trongtam">trọng tâm</span>' : '') + '</div>' +
                '<div class="dh-chon-hang">' + moc.map(function (d) {
                  return '<button class="chip-loc' + (DIEM[c.soTt] === d ? ' on' : '') +
                    '" onclick="DG.diem(' + c.soTt + ',' + d + ')">' + String(d).replace('.', ',') + '</button>';
                }).join('') + '</div></div>';
            }).join('') + '</div>';
        }).join('');
    }

    return '<div class="lt-khung">' +
      '<div class="dh-tieu-de" style="margin-top:0">＋ Ghi phiếu dự giờ</div>' +
      '<div class="dh-chon-hang" style="flex-wrap:wrap">' +
      '<input class="dh-o-nhap" type="date" id="dg-ngay" style="width:auto;max-width:100%;margin-top:0" value="' + K().homNayISO() + '">' +
      '<select class="dh-o-nhap" id="dg-buoi" style="width:auto;max-width:100%;margin-top:0">' +
      '<option value="sang">Sáng</option><option value="chieu">Chiều</option></select>' +
      '<input class="dh-o-nhap" id="dg-tiet" type="number" min="1" max="10" style="max-width:78px;margin-top:0" placeholder="Tiết">' +
      '</div>' +
      '<div class="dh-chon-hang" style="margin-top:8px;flex-wrap:wrap">' +
      chonNguoi('dg-gv', '— giáo viên dạy —') +
      '<input class="dh-o-nhap" id="dg-lop" style="max-width:96px;margin-top:0" placeholder="Lớp">' +
      '<input class="dh-o-nhap" id="dg-mon" style="max-width:150px;margin-top:0" placeholder="Môn">' +
      (nhieuCS
        ? '<select class="dh-o-nhap" id="dg-coso" style="width:auto;max-width:100%;margin-top:0">' +
          DL().coSo.map(function (c) {
            return '<option value="' + thoat(c.ma) + '">' + thoat(c.ten) + '</option>';
          }).join('') + '</select>'
        : '') +
      '</div>' +
      '<input class="dh-o-nhap" id="dg-bai" placeholder="Tên bài dạy">' +
      oTieuChi +
      '<div class="dh-tieu-de" style="margin-top:12px">Nhận xét</div>' +
      '<textarea class="dh-o-nhap" id="dg-uudiem" rows="2" placeholder="Ưu điểm…"></textarea>' +
      '<textarea class="dh-o-nhap" id="dg-hanche" rows="2" placeholder="Hạn chế…"></textarea>' +
      '<textarea class="dh-o-nhap" id="dg-denghi" rows="2" placeholder="Đề nghị / hướng khắc phục…"></textarea>' +
      '<div class="dh-chon-hang" style="margin-top:8px;flex-wrap:wrap">' +
      '<span style="font-size:13px;align-self:center">Xếp loại:</span>' +
      Object.keys(XEP_LOAI).map(function (x) {
        return '<button class="chip-loc' + (XL_CHON === x ? ' on' : '') + '" onclick="DG.xepLoai(\'' + x + '\')">' + XEP_LOAI[x] + '</button>';
      }).join('') + '</div>' +
      '<div class="dh-chon-hang" style="margin-top:10px">' +
      '<button class="dh-nut-nho" onclick="DG.luuPhieu()">💾 Lưu phiếu</button>' +
      '<button class="dh-nut-nho" onclick="DG.dong()">Đóng</button></div>' +
      '</div>';
  }

  var XL_CHON = null;
  // Công văn 5555 nêu ba mức (tối thiểu 0,5 · trung bình · tối đa), nhưng
  // 1,25 là con số không phiếu giấy nào chấm, còn 1,0 và 1,5 — hai mức hay
  // dùng nhất — lại không có. Nên chia đều theo bước 0,5 từ 0,5 tới tối đa,
  // và luôn chèn mức trung bình của văn bản để ai muốn theo đúng 5555 vẫn có.
  function mocDiem(toiDa) {
    var ds = [], d = 0.5;
    while (d < toiDa - 0.001) { ds.push(d); d += 0.5; }
    ds.push(toiDa);
    var tb = toiDa === 1 ? 0.75 : 1.25;
    if (tb < toiDa && ds.indexOf(tb) < 0) { ds.push(tb); ds.sort(function (a, b) { return a - b; }); }
    return ds;
  }
  function tongToiDa() {
    var s = 0;
    TIEU_CHI.forEach(function (c) { s += c.diemToiDa; });
    return s;
  }
  function tongDiemDang() {
    var s = 0;
    TIEU_CHI.forEach(function (c) { s += (DIEM[c.soTt] || 0); });
    return s;
  }

  // Ai được GHI phiếu — khớp policy dg_them (admin · BGH · tổ trưởng).
  // laQT() không bao tổ trưởng nên phải hỏi riêng vai trò.
  function ghiPhieuDuoc() {
    if (!THAT()) return true;                       // bản mẫu: cho xem thử đủ luồng
    var vt = (window.NGUOI_DUNG || {}).vai_tro;
    return vt === 'admin' || vt === 'ban_giam_hieu' || vt === 'to_truong';
  }

  function veDuGio() {
    var qt = laQT();

    // ⚠ Giáo viên thường CHỈ đọc được phiếu của chính mình (policy dg_doc), nên
    // dựng bảng tổng hợp toàn trường từ dữ liệu đã bị RLS cắt cụt là bịa số:
    // màn hình sẽ báo "1/45 CBGV đã được dự giờ" và 44 dòng số 0 tô đỏ. Tệ hơn,
    // xuất Word ra là một văn bản có Quốc hiệu và chỗ ký Hiệu trưởng, nội dung
    // sai toàn bộ. Người không phải BGH chỉ thấy phiếu của mình.
    if (!qt) {
      var cuaToi = (DS_DG || []);
      return '<div class="hd-kiem xanh" style="margin-top:0">Thầy cô xem được ' +
        '<b>phiếu dự giờ của chính mình</b> và phiếu do chính mình ghi. ' +
        'Bảng tổng hợp toàn trường là phần của Ban giám hiệu.</div>' +
        (ghiPhieuDuoc()
          ? '<div class="dh-chon-hang" style="margin:10px 0"><button class="dh-nut-nho" onclick="DG.moPhieu()">＋ Ghi phiếu dự giờ</button></div>'
          : '') +
        (MO_PHIEU ? veKhungPhieu() : '') +
        '<div class="dh-tieu-de">Phiếu liên quan tới tôi</div>' +
        (cuaToi.length ? cuaToi.map(dongPhieu).join('')
          : '<div class="the-thong-bao">Chưa có phiếu dự giờ nào liên quan tới thầy cô trong năm học này.</div>');
    }

    var th = tongHop();

    var theSo = '<div class="luoi-thong-ke dg-dai-so">' +
      '<div class="o-so"><div class="so trang">' + th.tong + '</div><div class="nhan">tiết đã dự · năm học ' + thoat(namHoc()) + '</div></div>' +
      '<div class="o-so"><div class="so xanh">' + th.duocDu.filter(function (x) { return x.so > 0; }).length +
      '/' + th.duocDu.length + '</div><div class="nhan">CBGV đã được dự giờ</div></div>' +
      (DINH_MUC_GV
        ? '<div class="o-so"><div class="so ' + (th.duocDu.filter(function (x) { return x.so < DINH_MUC_GV; }).length ? 'hong' : 'xanh') + '">' +
          th.duocDu.filter(function (x) { return x.so < DINH_MUC_GV; }).length +
          '</div><div class="nhan">người chưa đủ ' + DINH_MUC_GV + ' tiết</div></div>'
        : '') +
      '</div>';

    var bangNguoi = '<div class="dh-tieu-de">Ai đã được dự giờ</div>' +
      '<div class="cuon-ngang"><table class="bang-quan-tri nho bang-cong"><thead><tr>' +
      '<th class="cot-dinh" style="text-align:left">CBGV</th>' +
      '<th style="text-align:center">Số tiết</th>' +
      Object.keys(XEP_LOAI).map(function (x) { return '<th style="text-align:center">' + XEP_LOAI[x] + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      (th.duocDu.length
        ? th.duocDu.map(function (n) {
            var thieu = DINH_MUC_GV && n.so < DINH_MUC_GV;
            return '<tr><td class="cot-dinh"><b>' + thoat(n.ten) + '</b></td>' +
              '<td style="text-align:center"><b class="' + (thieu ? 'dh-do' : '') + '">' + n.so + '</b></td>' +
              Object.keys(XEP_LOAI).map(function (x) {
                return '<td style="text-align:center">' + (n.loai[x] || '') + '</td>';
              }).join('') + '</tr>';
          }).join('')
        : '<tr><td colspan="6">Chưa có dữ liệu nhân sự.</td></tr>') +
      '</tbody></table></div>' +
      (DINH_MUC_GV ? '' :
        '<div class="dh-ghi-chu-nho">Chưa đặt <b>định mức số tiết dự giờ</b> mỗi năm — app chỉ đếm, không nhắc ai thiếu. ' +
        (qt ? 'Bấm <b>✎ Định mức</b> để đặt.' : '') + '</div>');

    // "Ai ĐI dự bao nhiêu tiết" — đây chính là con số Ban giám hiệu bị hỏi khi
    // thanh tra: "đồng chí Hiệu trưởng dự bao nhiêu tiết trong năm?"
    var bangDiDu = th.diDu.length
      ? '<div class="dh-tieu-de" style="margin-top:16px">Ai đã đi dự giờ</div>' +
        th.diDu.map(function (n) {
          var thieu = DINH_MUC_BGH && n.so < DINH_MUC_BGH;
          return '<div class="dh-diem-hang" style="padding:8px 12px">' +
            '<span class="dh-cham ' + (thieu ? 'vang' : 'xanh') + '"></span>' +
            '<div class="tt"><b>' + thoat(n.ten) + '</b></div>' +
            '<b class="' + (thieu ? 'dh-do' : '') + '">' + n.so + ' tiết</b></div>';
        }).join('') +
        (DINH_MUC_BGH ? '' : '<div class="dh-ghi-chu-nho">Chưa đặt định mức số tiết Ban giám hiệu phải đi dự.</div>')
      : '';

    var soHien = DS_DG.length > SO_PHIEU_HIEN ? SO_PHIEU_HIEN : DS_DG.length;
    var dsPhieu = '<div class="dh-tieu-de" style="margin-top:16px">Phiếu dự giờ ' +
      '<small>(' + soHien + '/' + DS_DG.length + ')</small></div>' +
      (DS_DG.length
        ? DS_DG.slice(0, SO_PHIEU_HIEN).map(dongPhieu).join('') +
          (DS_DG.length > SO_PHIEU_HIEN
            ? '<div class="dh-chon-hang" style="margin-top:8px">' +
              '<button class="dh-nut-nho" onclick="DG.themPhieu()">Xem thêm ' +
              (DS_DG.length - SO_PHIEU_HIEN > 30 ? 30 : DS_DG.length - SO_PHIEU_HIEN) + ' phiếu nữa</button></div>'
            : '')
        : '<div class="the-thong-bao">Năm học này chưa ghi phiếu dự giờ nào.</div>');

    var nut = '<div class="dh-chon-hang" style="margin-top:12px;flex-wrap:wrap">' +
      (ghiPhieuDuoc() ? '<button class="dh-nut-nho" onclick="DG.moPhieu()">＋ Ghi phiếu dự giờ</button>' : '') +
      '<button class="dh-nut-nho" onclick="DG.wordTongHop()">📄 Xuất bảng tổng hợp</button>' +
      '<button class="dh-nut-nho" onclick="DG.suaTieuChi()">✎ Bộ tiêu chí</button>' +
      '<button class="dh-nut-nho" onclick="DG.suaDinhMuc()">✎ Định mức</button>' +
      '</div>' + (MO_TC ? veKhungTieuChi() : '') + (MO_PHIEU ? veKhungPhieu() : '');

    return theSo + bangNguoi + bangDiDu + dsPhieu + nut;
  }

  // Khung chép cả bộ tiêu chí — mỗi tiêu chí một ô, thêm ô sửa tên ba nhóm
  function veKhungTieuChi() {
    return '<div class="lt-khung">' +
      '<div class="dh-tieu-de" style="margin-top:0">✎ Bộ tiêu chí chấm tiết dạy</div>' +
      '<div class="dh-ghi-chu-nho" style="margin-top:0">Chép <b>đúng câu chữ</b> trong phiếu dự giờ ' +
      'nhà trường đang dùng. Hệ thống cố ý <b>không tự chế lời văn</b> của văn bản: khung điểm dưới đây ' +
      'theo cấu trúc Công văn 5555 (văn bản của cấp trung học), còn tiểu học thì mỗi trường một phiếu. ' +
      'Bỏ trống ô nào thì tiêu chí đó vẫn chấm được, chỉ là không có lời văn.</div>' +
      [1, 2, 3].map(function (n) {
        var ds = TIEU_CHI.filter(function (c) { return c.nhom === n; });
        if (!ds.length) return '';
        return '<div class="dg-nhom"><input class="dh-o-nhap" id="dg-nhom-' + n + '" ' +
          'style="margin-top:0;font-weight:700" value="' + thoat(TEN_NHOM[n - 1] || ('Nhóm ' + n)) + '">' +
          ds.map(function (c) {
            return '<div class="dg-tc"><div class="dg-tc-tt"><b>' + c.soTt + '.</b> ' +
              '<small>tối đa ' + soVN(c.diemToiDa) + ' điểm' +
              (c.trongTam ? ' · trọng tâm' : '') + '</small></div>' +
              '<textarea class="dh-o-nhap" id="dg-tc-' + c.soTt + '" rows="2" ' +
              'placeholder="Nội dung tiêu chí ' + c.soTt + '…">' + thoat(c.noiDung) + '</textarea></div>';
          }).join('') + '</div>';
      }).join('') +
      '<div class="dh-chon-hang" style="margin-top:10px">' +
      '<button class="dh-nut-nho" onclick="DG.luuTieuChi()">💾 Lưu bộ tiêu chí</button>' +
      '<button class="dh-nut-nho" onclick="DG.dong()">Đóng</button></div>' +
      '</div>';
  }

  // Một dòng phiếu — dùng chung cho màn Ban giám hiệu và màn giáo viên
  function dongPhieu(d) {
    var mo = XEM_PHIEU === d.id;
    var xoaDuoc = laQT();
    return '<div class="dh-diem-hang" style="flex-wrap:wrap">' +
      '<span class="dh-cham ' + (XEP_MAU[d.xepLoai] || 'xam') + '"></span>' +
      '<div class="tt"><b>' + thoat(d.gvTen) + ' — ' + thoat(d.mon) + ' · lớp ' + thoat(d.lop) + '</b>' +
      '<small>' + ngayVN(d.ngay) + ' · ' + (d.buoi === 'sang' ? 'sáng' : 'chiều') +
      (d.tiet ? ' tiết ' + d.tiet : '') +
      (d.coSo ? ' · ' + thoat(K().tenCoSo(d.coSo)) : '') +
      ' · người dự: ' + thoat(d.nguoiDu) + '</small>' +
      '<small>' + (d.xepLoai ? '<b>' + XEP_LOAI[d.xepLoai] + '</b>' : 'chưa xếp loại') +
      (d.tongDiem !== null && d.tongDiem !== undefined
        ? ' · ' + soVN(d.tongDiem) + (TIEU_CHI.length ? '/' + soVN(tongToiDa()) : '') + ' điểm' : '') + '</small>' +
      (mo
        ? '<div class="dg-chitiet">' +
          (d.bai ? '<div><b>Bài:</b> ' + thoat(d.bai) + '</div>' : '') +
          veDiemChiTiet(d) +
          (d.uuDiem ? '<div><b>Ưu điểm:</b> ' + thoat(d.uuDiem) + '</div>' : '') +
          (d.hanChe ? '<div><b>Hạn chế:</b> ' + thoat(d.hanChe) + '</div>' : '') +
          (d.deNghi ? '<div><b>Đề nghị:</b> ' + thoat(d.deNghi) + '</div>' : '') +
          '</div>'
        : '') +
      '</div>' +
      '<button class="dh-nut-nho" onclick="DG.xem(' + d.id + ')">' + (mo ? 'Thu gọn' : 'Xem') + '</button>' +
      '<button class="dh-nut-nho" onclick="DG.wordPhieu(' + d.id + ')">📄 Word</button>' +
      (xoaDuoc ? '<button class="dh-nut-nho nut-xoa-nd" onclick="DG.xoaPhieu(' + d.id + ')">Xóa</button>' : '') +
      '</div>';
  }
  // Điểm từng tiêu chí ngay trên màn, khỏi phải xuất Word mới xem được
  function veDiemChiTiet(d) {
    var ds = TIEU_CHI.filter(function (c) { return d.diem && d.diem[c.soTt] !== undefined; });
    if (!ds.length) return '';
    return '<div><b>Điểm tiêu chí:</b> ' + ds.map(function (c) {
      return c.soTt + ': ' + soVN(d.diem[c.soTt]);
    }).join(' · ') + '</div>';
  }

  function veKTNB() {
    var qt = laQT();
    var ds = DS_KTNB || [];
    var xong = ds.filter(function (d) { return d.trangThai === 'xong'; }).length;

    // Màu theo TIẾN ĐỘ, không phải theo "có kế hoạch hay không": lập 10 đợt
    // tháng 9 mà tháng 3 xong 0 đợt thì băng xanh "an tâm" là ru ngủ.
    var quaHan = ds.filter(function (d) {
      return d.trangThai !== 'xong' && d.denNgay && d.denNgay < K().homNayISO();
    }).length;
    var mau = !ds.length ? 'vang' : quaHan ? 'do' : (xong === ds.length ? 'xanh' : 'vang');
    var tomTat = '<div class="hd-kiem ' + mau + '" style="margin-top:0">' +
      'Kế hoạch kiểm tra nội bộ năm học <b>' + thoat(namHoc()) + '</b>: <b>' + ds.length +
      '</b> đợt, đã hoàn thành <b>' + xong + '</b>' +
      (quaHan ? ', <b class="dh-do">' + quaHan + ' đợt quá hạn chưa kết luận</b>' : '') + '. ' +
      'Mỗi đợt xong là một minh chứng cho hộp hồ sơ — ghi kết luận ngay tại đây, không phải về văn phòng soạn lại.</div>';

    var dong = ds.length
      ? ds.map(function (d) {
          var tt = TT_KTNB[d.trangThai] || TT_KTNB.ke_hoach;
          return '<div class="dh-diem-hang" style="flex-wrap:wrap"><span class="dh-cham ' + tt[0] + '"></span>' +
            '<div class="tt"><b>' + thoat(d.ten) + '</b>' +
            '<small>' + tt[1] +
            (d.doiTuong ? ' · ' + thoat(d.doiTuong) : '') +
            (d.coSo ? ' · ' + thoat(K().tenCoSo(d.coSo)) : '') +
            (d.tuNgay ? ' · ' + ngayVN(d.tuNgay) + (d.denNgay && d.denNgay !== d.tuNgay ? '–' + ngayVN(d.denNgay) : '') : '') +
            (d.nguoiKT ? ' · ' + thoat(d.nguoiKT) : '') + '</small>' +
            (d.noiDung ? '<small>' + thoat(d.noiDung) + '</small>' : '') +
            (d.ketLuan ? '<small><b>Kết luận:</b> ' + thoat(d.ketLuan) + '</small>' : '') +
            (d.kienNghi ? '<small><b>Kiến nghị:</b> ' + thoat(d.kienNghi) + '</small>' : '') +
            '</div>' +
            (qt
              ? '<button class="dh-nut-nho" onclick="DG.ktMo(' + d.id + ')">' +
                  (KT_SUA === d.id ? 'Đóng' : '✎ Kết luận') + '</button>' +
                (d.trangThai === 'ke_hoach'
                  ? '<button class="dh-nut-nho" onclick="DG.ktTrangThai(' + d.id + ', \'dang_lam\')">▶ Bắt đầu</button>'
                  : '') +
                '<button class="dh-nut-nho nut-xoa-nd" onclick="DG.ktXoa(' + d.id + ')">Xóa</button>'
              : '') +
            (qt && KT_SUA === d.id
              ? '<div class="lt-khung" style="flex:1 1 100%">' +
                '<textarea class="dh-o-nhap" id="kt-kl-' + d.id + '" rows="3" ' +
                'placeholder="Kết luận kiểm tra…">' + thoat(d.ketLuan) + '</textarea>' +
                '<textarea class="dh-o-nhap" id="kt-kn-' + d.id + '" rows="2" ' +
                'placeholder="Kiến nghị (để trống nếu không có)…">' + thoat(d.kienNghi) + '</textarea>' +
                '<div class="dh-chon-hang" style="margin-top:8px">' +
                '<button class="dh-nut-nho" onclick="DG.ktLuuKetLuan(' + d.id + ')">💾 Lưu kết luận</button>' +
                '<button class="dh-nut-nho" onclick="DG.ktMo(' + d.id + ')">Đóng</button></div></div>'
              : '') +
            '</div>';
        }).join('')
      : '<div class="the-thong-bao">Chưa lập kế hoạch kiểm tra nội bộ cho năm học này.</div>';

    var khung = MO_DOT
      ? '<div class="lt-khung">' +
        '<div class="dh-tieu-de" style="margin-top:0">＋ Thêm đợt kiểm tra</div>' +
        '<input class="dh-o-nhap" id="kt-ten" placeholder="Tên đợt (VD: Kiểm tra hồ sơ chuyên môn tổ khối 1)">' +
        '<input class="dh-o-nhap" id="kt-noidung" placeholder="Nội dung kiểm tra">' +
        '<div class="dh-chon-hang" style="margin-top:8px;flex-wrap:wrap">' +
        '<input class="dh-o-nhap" id="kt-doituong" style="max-width:180px;margin-top:0" placeholder="Đối tượng">' +
        chonNguoi('kt-nguoi', '— người kiểm tra —') +
        (DL().coSo.length > 1
          ? '<select class="dh-o-nhap" id="kt-coso" style="width:auto;max-width:100%;margin-top:0">' +
            '<option value="">Toàn trường</option>' +
            DL().coSo.map(function (c) {
              return '<option value="' + thoat(c.ma) + '">' + thoat(c.ten) + '</option>';
            }).join('') + '</select>'
          : '') +
        '</div>' +
        '<div class="dh-chon-hang" style="margin-top:8px;flex-wrap:wrap">' +
        '<label style="font-size:13px">Từ <input class="dh-o-nhap" type="date" id="kt-tu" style="width:auto;margin-top:0"></label>' +
        '<label style="font-size:13px">đến <input class="dh-o-nhap" type="date" id="kt-den" style="width:auto;margin-top:0"></label>' +
        '</div>' +
        '<div class="dh-chon-hang" style="margin-top:10px">' +
        '<button class="dh-nut-nho" onclick="DG.ktThem()">＋ Thêm đợt</button>' +
        '<button class="dh-nut-nho" onclick="DG.dong()">Đóng</button></div>' +
        '</div>'
      : '';

    var nut = qt
      ? '<div class="dh-chon-hang" style="margin-top:12px;flex-wrap:wrap">' +
        '<button class="dh-nut-nho" onclick="DG.moDot()">＋ Thêm đợt kiểm tra</button>' +
        '<button class="dh-nut-nho" onclick="DG.wordKTNB()">📄 Xuất kế hoạch (Word)</button>' +
        '</div>'
      : '';

    return tomTat + dong + nut + khung;
  }

  function veTat() {
    var nam = namHoc();
    if (!DANG && DA_NAP !== nam) nap(nam);

    var chonMuc = '<div class="dh-chon-hang" style="margin-bottom:10px">' +
      '<button class="chip-loc' + (MUC === 'dugio' ? ' on' : '') + '" onclick="DG.muc(\'dugio\')">👀 Dự giờ – thăm lớp</button>' +
      '<button class="chip-loc' + (MUC === 'ktnb' ? ' on' : '') + '" onclick="DG.muc(\'ktnb\')">🔎 Kiểm tra nội bộ</button>' +
      '</div>';

    if (!CO_BANG) {
      return '<div class="hd-kiem vang" style="margin-top:0">Chức năng Dự giờ – Kiểm tra nội bộ cần chạy ' +
        '<b>sql/33-du-gio-ktnb.sql</b> trên Supabase rồi tải lại trang. Các phần khác không bị ảnh hưởng.</div>';
    }
    if (LOI) {
      return chonMuc + '<div class="the-thong-bao">⚠ ' + thoat(LOI) +
        '<div class="dh-chon-hang" style="margin-top:10px">' +
        '<button class="dh-nut-nho" onclick="DG.thuLai()">↻ Thử lại</button></div></div>';
    }
    if (DANG || !DS_DG) return chonMuc + '<div class="the-thong-bao">Đang đọc dữ liệu…</div>';

    var nhan = THAT() ? '' :
      '<div class="hd-kiem vang" style="margin-top:0">🧪 <b>BẢN MẪU</b> — tên người, tên lớp và nhận xét ' +
      'dưới đây là giả định. Đăng nhập để dùng với dữ liệu thật của nhà trường.</div>';

    return chonMuc + nhan + (MUC === 'dugio' ? veDuGio() : veKTNB());
  }

  // ════════════════════════════════════════════════════════════
  // XUẤT WORD
  // ════════════════════════════════════════════════════════════
  function wordPhieu(id) {
    var W = window.WORD_TIEN_ICH;
    if (!W) { window.notify('Chưa nạp được bộ xuất Word.'); return; }
    var d = (DS_DG || []).filter(function (x) { return x.id === id; })[0];
    if (!d) return;

    var bangTC = '';
    if (TIEU_CHI.length) {
      var hang = '';
      [1, 2, 3].forEach(function (n) {
        var ds = TIEU_CHI.filter(function (c) { return c.nhom === n; });
        if (!ds.length) return;
        hang += '<tr><td colspan="3"><b>' + W.chan(TEN_NHOM[n - 1] || ('Nhóm ' + n)) + '</b></td></tr>';
        ds.forEach(function (c) {
          hang += '<tr><td class="giua">' + c.soTt + '</td><td>' + W.chan(c.noiDung) + '</td>' +
            '<td class="giua">' + W.chan(soVN(d.diem[c.soTt])) + '</td></tr>';
        });
      });
      bangTC = '<table class="co-dinh" style="margin-top:10pt"><thead><tr>' +
        '<th style="width:8%">TT</th><th style="width:74%">Tiêu chí</th><th style="width:18%">Điểm</th>' +
        '</tr></thead><tbody>' + hang + '</tbody></table>';
    }

    var than = W.theThuc() +
      '<p class="giua" style="margin-top:18pt"><b style="font-size:14pt">PHIẾU DỰ GIỜ</b></p>' +
      '<p class="giua" style="margin-top:2pt"><b>Năm học ' + W.chan(namHoc()) + '</b></p>' +
      '<p style="margin-top:12pt">Họ và tên giáo viên dạy: <b>' + W.chan(d.gvTen) + '</b></p>' +
      '<p>Môn: <b>' + W.chan(d.mon) + '</b> · Lớp: <b>' + W.chan(d.lop) + '</b>' +
      (d.tiet ? ' · Tiết: <b>' + d.tiet + '</b>' : '') +
      ' · Buổi: <b>' + (d.buoi === 'sang' ? 'Sáng' : 'Chiều') + '</b></p>' +
      (d.bai ? '<p>Tên bài dạy: <b>' + W.chan(d.bai) + '</b></p>' : '') +
      '<p>Ngày dự: <b>' + W.chan(ngayVN(d.ngay)) + '</b>' +
      (d.coSo ? ' · Địa điểm: <b>' + W.chan(K().tenCoSo(d.coSo)) + '</b>' : '') + '</p>' +
      '<p>Người dự giờ: <b>' + W.chan(d.nguoiDu) + '</b></p>' +
      bangTC +
      (d.tongDiem !== null && d.tongDiem !== undefined
        ? '<p style="margin-top:8pt">Tổng điểm: <b>' + W.chan(soVN(d.tongDiem)) + '</b>' +
          (TIEU_CHI.length ? '/' + soVN(tongToiDa()) : '') + '</p>' : '') +
      '<p style="margin-top:8pt"><b>Ưu điểm:</b> ' + W.chan(d.uuDiem || '…') + '</p>' +
      '<p><b>Hạn chế:</b> ' + W.chan(d.hanChe || '…') + '</p>' +
      '<p><b>Đề nghị:</b> ' + W.chan(d.deNghi || '…') + '</p>' +
      '<p style="margin-top:8pt">Xếp loại tiết dạy: <b>' + W.chan(XEP_LOAI[d.xepLoai] || '…') + '</b></p>' +
      // Phiếu dự giờ là HỒ SƠ CHUYÊN MÔN NỘI BỘ, không phải văn bản hành chính
      // phát hành ra ngoài — không ai đóng dấu tròn vào phiếu dự giờ. Dùng
      // khoiKy() mặc định sẽ bắt Hiệu trưởng "ký tên, đóng dấu" cả 40 tờ phiếu
      // của một học kỳ. Ngược lại thứ BẮT BUỘC phải có là chữ ký GIÁO VIÊN DẠY
      // (xác nhận đã nghe góp ý) — chính nó làm phiếu thành minh chứng.
      '<table style="border:none;width:100%;margin-top:16pt"><tr>' +
      '<td style="border:none;width:50%;text-align:center;font-size:12pt">' +
      '<b>GIÁO VIÊN DẠY</b><br><span class="nghieng">(Ký, ghi rõ họ tên)</span>' +
      '<div style="height:56pt"></div><b>' + W.chan(d.gvTen) + '</b></td>' +
      '<td style="border:none;width:50%;text-align:center;font-size:12pt">' +
      '<b>NGƯỜI DỰ GIỜ</b><br><span class="nghieng">(Ký, ghi rõ họ tên)</span>' +
      '<div style="height:56pt"></div><b>' + W.chan(d.nguoiDu) + '</b></td>' +
      '</tr></table>';

    W.taiVe(W.khungWord('Phiếu dự giờ ' + d.gvTen, than),
      'phieu-du-gio-' + d.ngay + '-' + String(d.lop).replace(/[^0-9A-Za-z]+/g, '') + '.doc');
  }

  function wordTongHop() {
    var W = window.WORD_TIEN_ICH;
    if (!W) { window.notify('Chưa nạp được bộ xuất Word.'); return; }
    // Giáo viên thường chỉ đọc được phiếu của mình (RLS), nên bảng tổng hợp
    // dựng ra sẽ SAI toàn bộ — mà nó lại là văn bản có Quốc hiệu và chỗ ký
    // Hiệu trưởng, trôi vào hồ sơ là tai hại.
    if (!laQT()) { window.notify('Chỉ Ban giám hiệu mới xuất được bảng tổng hợp toàn trường.'); return; }
    var th = tongHop();
    var nhieuCS = DL().coSo.length > 1;
    var hang = th.duocDu.map(function (n, i) {
      return '<tr><td>' + (i + 1) + '. ' + W.chan(n.ten) + '</td>' +
        (nhieuCS ? '<td class="giua">' + W.chan(K().tenCoSo(n.coSo)) + '</td>' : '') +
        '<td class="giua"><b>' + n.so + '</b></td>' +
        Object.keys(XEP_LOAI).map(function (x) {
          return '<td class="giua">' + (n.loai[x] || '') + '</td>';
        }).join('') + '</tr>';
    }).join('');

    var than = W.theThuc() +
      '<p class="giua" style="margin-top:18pt"><b style="font-size:14pt">TỔNG HỢP CÔNG TÁC DỰ GIỜ – THĂM LỚP</b></p>' +
      '<p class="giua" style="margin-top:2pt"><b>Năm học ' + W.chan(namHoc()) + '</b></p>' +
      '<p style="margin-top:12pt">Tổng số tiết đã dự: <b>' + th.tong + '</b>' +
      (DINH_MUC_GV ? ' · Định mức mỗi giáo viên: <b>' + DINH_MUC_GV + '</b> tiết/năm học' : '') + '.</p>' +
      '<table class="co-dinh"><thead><tr>' +
      '<th style="width:' + (nhieuCS ? 34 : 46) + '%">Họ và tên</th>' +
      (nhieuCS ? '<th style="width:14%">Cơ sở</th>' : '') +
      '<th style="width:12%">Số tiết</th>' +
      Object.keys(XEP_LOAI).map(function (x) {
        return '<th style="width:10%">' + W.chan(XEP_LOAI[x]) + '</th>';
      }).join('') + '</tr></thead><tbody>' + hang + '</tbody></table>' +
      W.khoiKy(null);

    W.taiVe(W.khungWord('Tổng hợp dự giờ ' + namHoc(), than, true),
      'tong-hop-du-gio-' + namHoc() + '.doc');
  }

  function wordKTNB() {
    var W = window.WORD_TIEN_ICH;
    if (!W) { window.notify('Chưa nạp được bộ xuất Word.'); return; }
    var ds = DS_KTNB || [];
    var hang = ds.length
      ? ds.map(function (d, i) {
          return '<tr><td class="giua">' + (i + 1) + '</td>' +
            '<td>' + W.chan(d.ten) + (d.noiDung ? '<br><i>' + W.chan(d.noiDung) + '</i>' : '') + '</td>' +
            '<td>' + W.chan(d.doiTuong) + (d.coSo ? '<br>' + W.chan(K().tenCoSo(d.coSo)) : '') + '</td>' +
            '<td class="giua">' + W.chan(d.tuNgay ? ngayVN(d.tuNgay) +
              (d.denNgay && d.denNgay !== d.tuNgay ? ' – ' + ngayVN(d.denNgay) : '') : '') + '</td>' +
            '<td>' + W.chan(d.nguoiKT) + '</td>' +
            '<td>' + W.chan(d.ketLuan) + (d.kienNghi ? '<br><i>' + W.chan(d.kienNghi) + '</i>' : '') + '</td></tr>';
        }).join('')
      : '<tr><td colspan="6" class="giua"><i>Chưa lập đợt kiểm tra nào.</i></td></tr>';

    var than = W.theThuc() +
      '<p class="giua" style="margin-top:18pt"><b style="font-size:14pt">KẾ HOẠCH KIỂM TRA NỘI BỘ</b></p>' +
      '<p class="giua" style="margin-top:2pt"><b>Năm học ' + W.chan(namHoc()) + '</b></p>' +
      '<table class="co-dinh" style="margin-top:12pt"><thead><tr>' +
      '<th style="width:6%">TT</th><th style="width:26%">Nội dung kiểm tra</th>' +
      '<th style="width:16%">Đối tượng</th><th style="width:16%">Thời gian</th>' +
      '<th style="width:14%">Người kiểm tra</th><th style="width:22%">Kết luận – kiến nghị</th>' +
      '</tr></thead><tbody>' + hang + '</tbody></table>' +
      W.khoiKy(null);

    W.taiVe(W.khungWord('Kế hoạch kiểm tra nội bộ ' + namHoc(), than, true),
      'ke-hoach-kiem-tra-noi-bo-' + namHoc() + '.doc');
  }

  // ════════════════════════════════════════════════════════════
  // THAO TÁC
  // ════════════════════════════════════════════════════════════
  function lamMoi() { DA_NAP = ''; LOI = ''; K().veLai(); }
  function o(id) { var e = $('#' + id); return e ? String(e.value || '').trim() : ''; }
  // ⚠ PHẢI dọn cả các ô CHỌN (dg-gv, dg-coso, kt-nguoi, kt-coso). Chúng nằm
  // trong oGiu nên veGiu() chủ động khôi phục giá trị cũ sau khi vẽ lại: bỏ
  // sót là dự ba tiết liền một buổi, lưu phiếu cô A xong thì các ô chữ trắng
  // nhưng ô "giáo viên dạy" VẪN đứng tên cô A — phiếu của cô B mang tên cô A.
  function donO() {
    ['dg-tiet', 'dg-lop', 'dg-mon', 'dg-bai', 'dg-uudiem', 'dg-hanche', 'dg-denghi',
      'dg-gv', 'dg-coso',
      'kt-ten', 'kt-noidung', 'kt-doituong', 'kt-tu', 'kt-den', 'kt-nguoi', 'kt-coso']
      .forEach(function (id) {
        var e = $('#' + id);
        if (e) e.value = '';
      });
  }
  // Dọn luôn phần chấm điểm — "Đóng" phải là HUỶ, không phải "thu gọn".
  // Chấm dở 12 tiêu chí cho cô A rồi bấm Đóng, mở lại cho thầy B mà các nút
  // điểm vẫn sáng nguyên thì thầy B lãnh trọn bộ điểm của cô A.
  function donHet() { DIEM = {}; XL_CHON = null; donO(); }

  window.DG = {
    oGiu: ['dg-ngay', 'dg-buoi', 'dg-tiet', 'dg-gv', 'dg-lop', 'dg-mon', 'dg-coso',
      'dg-bai', 'dg-uudiem', 'dg-hanche', 'dg-denghi',
      'kt-ten', 'kt-noidung', 'kt-doituong', 'kt-nguoi', 'kt-coso', 'kt-tu', 'kt-den'],

    muc: function (m) { MUC = m; MO_PHIEU = false; MO_DOT = false; donHet(); K().veLai(); },
    thuLai: function () { lamMoi(); },
    datLai: function () {
      DA_NAP = ''; DS_DG = null; DS_KTNB = null; TIEU_CHI = []; LOI = '';
      MO_PHIEU = false; MO_DOT = false; XEM_PHIEU = null; DIEM = {}; XL_CHON = null;
    },
    dong: function () { MO_PHIEU = false; MO_DOT = false; MO_TC = false; donHet(); K().veLai(); },
    moPhieu: function () {
      MO_PHIEU = !MO_PHIEU; MO_DOT = false;
      if (!MO_PHIEU) donHet();
      K().veLai();
    },
    moDot: function () { MO_DOT = !MO_DOT; MO_PHIEU = false; K().veLai(); },
    xem: function (id) { XEM_PHIEU = (XEM_PHIEU === id ? null : id); K().veLai(); },
    diem: function (tt, d) { DIEM[tt] = (DIEM[tt] === d ? undefined : d); K().veLai(); },
    xepLoai: function (x) { XL_CHON = (XL_CHON === x ? null : x); K().veLai(); },

    luuPhieu: function () {
      var gvTen = o('dg-gv'), lop = o('dg-lop'), mon = o('dg-mon');
      if (!gvTen) { window.notify('Chọn giáo viên dạy trước đã.'); return; }
      if (!lop) { window.notify('Ghi tên lớp được dự giờ.'); return; }
      if (!mon) { window.notify('Ghi môn học.'); return; }
      var sel = $('#dg-gv');
      var gvEmail = sel && sel.selectedIndex > 0
        ? (sel.options[sel.selectedIndex].getAttribute('data-email') || '') : '';
      var coDiem = Object.keys(DIEM).filter(function (k) { return DIEM[k] !== undefined; }).length;
      var ban = {
        nam_hoc: namHoc(), ngay: o('dg-ngay') || K().homNayISO(),
        buoi: o('dg-buoi') || 'sang',
        tiet: parseInt(o('dg-tiet'), 10) || null,
        lop: lop, mon: mon, bai: o('dg-bai') || null,
        gv_email: gvEmail || null, gv_ten: gvTen,
        co_so_ma: o('dg-coso') || null,
        diem: DIEM, tong_diem: coDiem ? tongDiemDang() : null,
        xep_loai: XL_CHON, uu_diem: o('dg-uudiem') || null,
        han_che: o('dg-hanche') || null, de_nghi: o('dg-denghi') || null
      };
      if (!/^\d{4}-\d{4}$/.test(ban.nam_hoc)) {
        window.notify('Chưa xác định được năm học.'); return;
      }
      if (!THAT()) {
        DS_DG.unshift({ id: -Date.now(), ngay: ban.ngay, buoi: ban.buoi, tiet: ban.tiet,
          lop: lop, mon: mon, bai: ban.bai || '', gvTen: gvTen, gvEmail: gvEmail,
          coSo: ban.co_so_ma, nguoiDu: 'BGH (mẫu)', diem: {}, tongDiem: ban.tong_diem,
          xepLoai: XL_CHON, uuDiem: ban.uu_diem || '', hanChe: ban.han_che || '', deNghi: ban.de_nghi || '' });
        donHet();
        K().veLai(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      if (DANG_GUI) return;          // chặn bấm hai lần khi mạng chậm
      DANG_GUI = true;
      // KHÔNG gửi nguoi_du_id/ten: trigger dg_chot_nguoi_du điền từ auth.uid()
      window.MAY_CHU.from('du_gio').insert(ban).then(function (r) {
        DANG_GUI = false;
        if (r.error) {
          // 42501 = RLS chặn. Câu nguyên bản của Postgres là tiếng Anh, đọc ra
          // thì cô giáo tưởng phần mềm hỏng chứ không biết là mình không có quyền.
          K().baoLoi(r.error.code === '42501'
            ? { message: 'Chỉ Ban giám hiệu và tổ trưởng chuyên môn mới ghi được phiếu dự giờ.' }
            : r.error);
          return;
        }
        donHet();
        window.notify('✅ Đã lưu phiếu dự giờ — bảng tổng hợp cập nhật ngay.');
        lamMoi();
      });
    },

    wordPhieu: wordPhieu,
    wordTongHop: wordTongHop,
    wordKTNB: wordKTNB,

    suaDinhMuc: function () {
      var moi = window.prompt('Định mức số tiết mỗi giáo viên PHẢI ĐƯỢC dự trong một năm học.\n' +
        'Để trống hoặc 0 = không đặt định mức (app chỉ đếm, không nhắc ai thiếu).', DINH_MUC_GV || '');
      if (moi === null) return;
      var so = parseInt(moi, 10);
      if (isNaN(so) || so < 0 || so > 50) so = 0;
      if (!THAT()) { DINH_MUC_GV = so; K().veLai(); return; }
      window.MAY_CHU.from('cau_hinh')
        .upsert({ khoa: 'du_gio_dinh_muc_gv', gia_tri: String(so || '') }, { onConflict: 'khoa' }).select()
        .then(function (r) {
          if (r.error) { K().baoLoi(r.error); return; }
          if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới đặt được định mức.'); return; }
          DINH_MUC_GV = so;
          lamMoi();
        });
    },

    themPhieu: function () { SO_PHIEU_HIEN += 30; K().veLai(); },

    xoaPhieu: function (id) {
      var d = (DS_DG || []).filter(function (x) { return x.id === id; })[0];
      if (!d) return;
      if (!window.confirm('Xóa phiếu dự giờ của ' + d.gvTen + ' ngày ' + ngayVN(d.ngay) +
        '?\nPhiếu là minh chứng — xóa rồi không lấy lại được từ app.')) return;
      if (!THAT()) {
        DS_DG = DS_DG.filter(function (x) { return x.id !== id; });
        K().veLai(); return;
      }
      window.MAY_CHU.from('du_gio').delete().eq('id', id).select().then(function (r) {
        if (r.error) { K().baoLoi(r.error); return; }
        if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới xóa được phiếu dự giờ.'); return; }
        window.notify('🗑 Đã xóa phiếu.');
        lamMoi();
      });
    },

    // Chép lời văn CẢ BỘ tiêu chí trong một khung. Trước đây hỏi từng tiêu chí
    // bằng prompt() một dòng — 12 lần bấm, 12 đoạn văn dài, trên điện thoại thì
    // thực tế sẽ không ai điền, và khung chấm điểm vĩnh viễn hiện "(chưa điền)".
    suaTieuChi: function () {
      if (!TIEU_CHI.length) { window.notify('Chưa cài bộ tiêu chí — nhờ quản trị chạy sql/33 trên Supabase rồi tải lại trang.'); return; }
      MO_TC = !MO_TC; MO_PHIEU = false; MO_DOT = false;
      K().veLai();
    },
    luuTieuChi: function () {
      var doi = [];
      TIEU_CHI.forEach(function (c) {
        var e = $('#dg-tc-' + c.soTt);
        if (!e) return;
        var v = String(e.value || '').trim();
        if (v !== c.noiDung) doi.push({ soTt: c.soTt, noiDung: v });
      });
      var oNhom = [1, 2, 3].map(function (n) {
        var e = $('#dg-nhom-' + n);
        return e ? String(e.value || '').trim() : TEN_NHOM[n - 1];
      });
      var nhomDoi = oNhom.join('|') !== TEN_NHOM.join('|');
      if (!doi.length && !nhomDoi) { window.notify('Không có gì thay đổi.'); MO_TC = false; K().veLai(); return; }
      if (!THAT()) {
        doi.forEach(function (d) {
          TIEU_CHI.filter(function (c) { return c.soTt === d.soTt; })[0].noiDung = d.noiDung;
        });
        TEN_NHOM = oNhom; MO_TC = false;
        K().veLai(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      var may = window.MAY_CHU;
      var viec = doi.map(function (d) {
        return may.from('du_gio_tieu_chi').update({ noi_dung: d.noiDung }).eq('so_tt', d.soTt).select();
      });
      if (nhomDoi) {
        viec.push(may.from('cau_hinh')
          .upsert({ khoa: 'du_gio_ten_nhom', gia_tri: oNhom.join('|') }, { onConflict: 'khoa' }).select());
      }
      Promise.all(viec).then(function (kq) {
        var loi = kq.filter(function (r) { return r.error; })[0];
        if (loi) { K().baoLoi(loi.error); return; }
        var chan = kq.filter(function (r) { return !r.data || !r.data.length; }).length;
        if (chan === kq.length) { window.notify('Chỉ Ban giám hiệu mới sửa được bộ tiêu chí.'); return; }
        MO_TC = false;
        window.notify('✅ Đã lưu bộ tiêu chí — phiếu dự giờ dùng ngay từ lần chấm sau.');
        lamMoi();
      });
    },

    // ── Kiểm tra nội bộ ──
    ktThem: function () {
      var ten = o('kt-ten');
      if (!ten) { window.notify('Ghi tên đợt kiểm tra trước đã.'); return; }
      var nam = namHoc();
      if (!/^\d{4}-\d{4}$/.test(nam)) { window.notify('Chưa xác định được năm học.'); return; }
      var tu = o('kt-tu'), den = o('kt-den');
      if (tu && den && den < tu) { window.notify('Ngày kết thúc phải sau ngày bắt đầu.'); return; }
      var ban = { nam_hoc: nam, ten: ten, noi_dung: o('kt-noidung') || null,
        doi_tuong: o('kt-doituong') || null, co_so_ma: o('kt-coso') || null,
        tu_ngay: tu || null, den_ngay: den || null,
        nguoi_kt_ten: o('kt-nguoi') || null, trang_thai: 'ke_hoach' };
      if (!THAT()) {
        DS_KTNB.push({ id: -Date.now(), ten: ten, noiDung: ban.noi_dung || '',
          doiTuong: ban.doi_tuong || '', coSo: ban.co_so_ma, tuNgay: tu, denNgay: den,
          nguoiKT: ban.nguoi_kt_ten || '', trangThai: 'ke_hoach', ketLuan: '', kienNghi: '', link: '' });
        donO(); K().veLai(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('ktnb_dot').insert(ban).then(function (r) {
        if (r.error) { K().baoLoi(r.error); return; }
        donO();
        window.notify('🔎 Đã thêm đợt kiểm tra vào kế hoạch.');
        lamMoi();
      });
    },
    ktMo: function (id) { KT_SUA = (KT_SUA === id ? null : id); K().veLai(); },
    ktTrangThai: function (id, tt) {
      var d = (DS_KTNB || []).filter(function (x) { return x.id === id; })[0];
      if (!d) return;
      if (!THAT()) { d.trangThai = tt; K().veLai(); return; }
      window.MAY_CHU.from('ktnb_dot').update({ trang_thai: tt }).eq('id', id).select()
        .then(function (r) {
          if (r.error) { K().baoLoi(r.error); return; }
          if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới đổi được trạng thái.'); return; }
          lamMoi();
        });
    },
    // Kết luận kiểm tra thực tế dài vài đoạn — prompt() một dòng không gõ nổi,
    // và không xuống dòng được. Dùng ô nhập nhiều dòng ngay tại chỗ.
    ktLuuKetLuan: function (id) {
      var d = (DS_KTNB || []).filter(function (x) { return x.id === id; })[0];
      if (!d) return;
      var kl = o('kt-kl-' + id), kn = o('kt-kn-' + id);
      // Xoá trắng kết luận thì đợt phải LÙI lại, không mắc kẹt ở "Đã xong"
      var tt = kl ? 'xong' : (d.trangThai === 'xong' ? 'dang_lam' : d.trangThai);
      if (!THAT()) {
        d.ketLuan = kl; d.kienNghi = kn; d.trangThai = tt; KT_SUA = null;
        K().veLai(); return;
      }
      window.MAY_CHU.from('ktnb_dot')
        .update({ ket_luan: kl || null, kien_nghi: kn || null, trang_thai: tt })
        .eq('id', id).select().then(function (r) {
          if (r.error) { K().baoLoi(r.error); return; }
          if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới ghi được kết luận.'); return; }
          KT_SUA = null;
          window.notify(kl ? '✅ Đã ghi kết luận — đợt kiểm tra chuyển sang Đã xong.' : 'Đã lưu.');
          lamMoi();
        });
    },
    ktXoa: function (id) {
      if (!window.confirm('Xóa đợt kiểm tra này khỏi kế hoạch?')) return;
      if (!THAT()) {
        DS_KTNB = DS_KTNB.filter(function (x) { return x.id !== id; });
        K().veLai(); return;
      }
      window.MAY_CHU.from('ktnb_dot').delete().eq('id', id).select().then(function (r) {
        if (r.error) { K().baoLoi(r.error); return; }
        if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới xóa được đợt kiểm tra.'); return; }
        lamMoi();
      });
    }
  };

  window.veDuGioKT = function () {
    if (!window.DH_KHO) return '';
    return veTat();
  };
})();
