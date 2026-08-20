// ============================================================
// lich-tuan.js — LỊCH CÔNG TÁC TUẦN + PHÂN CÔNG TRỰC
// Nằm trong thẻ "📅 Lịch tuần" của module Điều hành.
//
// Thứ Hai nào trường cũng ban hành một tờ lịch công tác tuần. Trước sáp nhập
// đó là tờ giấy dán bảng tin; sau sáp nhập, khi Ban giám hiệu không thể có mặt
// ở cả ba điểm cùng lúc, nó thành thứ DUY NHẤT cho biết hôm nay ai ở đâu.
//
// MỘT nguồn dữ liệu, HAI cách bày — hai nguồn tham khảo thật cho thấy trường
// dùng cả hai dạng, nên không chọn một bỏ một:
//   · trên màn hình: lưới THẺ THEO NGÀY, liếc một cái là thấy hôm nay có gì
//   · xuất Word:     BẢNG chi tiết đúng thể thức NĐ 30 để dán bảng tin, lưu hồ sơ
//
// Nháp / đã ban hành là ranh giới THẬT: Ban giám hiệu soạn dần từ tuần trước,
// giáo viên chỉ thấy khi đã ban hành (hàng rào nằm ở RLS sql/32, không phải ở đây).
//
// ⚠️ KHÔNG ghi tên thật CBGV vào tệp này — repo công khai.
// ============================================================
(function () {
  'use strict';

  function $(s) { return document.querySelector(s); }
  function K() { return window.DH_KHO; }          // cầu nối sang dieu-hanh.js
  function thoat(s) { return K().thoat(s); }
  function ngayVN(s) { return K().ngayVN(s); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function laQT() { return K().laQT(); }
  function THAT() { return K().that(); }
  function DL() { return K().dl(); }

  var TEN_THU = { 2: 'Thứ Hai', 3: 'Thứ Ba', 4: 'Thứ Tư', 5: 'Thứ Năm',
    6: 'Thứ Sáu', 7: 'Thứ Bảy', 8: 'Chủ nhật' };
  var TEN_BUOI = { sang: 'Sáng', chieu: 'Chiều', toi: 'Tối', ca_ngay: 'Cả ngày' };
  // MỘT thứ tự buổi dùng chung cho cả màn hình lẫn bản Word — trước đây màn
  // hình xếp "Cả ngày" cuối còn Word xếp đầu, đối chiếu hai bản là hoa mắt.
  var BUOI_TT = { ca_ngay: 0, sang: 1, chieu: 2, toi: 3 };
  var BUOI_DS = ['ca_ngay', 'sang', 'chieu', 'toi'];
  // So giờ bằng SỐ PHÚT, không so chuỗi: "10:00" < "7:15" theo thứ tự chữ
  function phutCua(g) {
    var m = /^(\d{1,2})\s*[:hH]\s*(\d{0,2})/.exec(String(g || ''));
    return m ? (+m[1]) * 60 + (+(m[2] || 0)) : 9999;   // không ghi giờ thì xếp cuối
  }

  // ── Ngày tháng ──
  function isoCua(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function tuIso(s) { return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }
  function congNgay(iso, n) { var d = tuIso(iso); d.setDate(d.getDate() + n); return isoCua(d); }
  // Thứ Hai của tuần chứa ngày này (getDay: 0 = Chủ nhật)
  function thuHaiCua(iso) {
    var d = tuIso(iso), thu = d.getDay() === 0 ? 7 : d.getDay();
    return congNgay(iso, 1 - thu);
  }
  function ngayGon(iso) { var p = iso.split('-'); return +p[2] + '/' + (+p[1]); }
  // thu 2..8 → ngày thật trong tuần bắt đầu từ tuNgay (Thứ Hai)
  function ngayCuaThu(tuNgay, thu) { return congNgay(tuNgay, thu - 2); }

  // Năm học: sau đăng nhập lấy từ CSDL; chưa đăng nhập thì lấy bản tính theo
  // mốc 30/08 trong cauhinh.js — KHÔNG để trống, kẻo bản Word in ra "Năm học ".
  function namHoc() {
    return K().nam() || (window.CAU_HINH && window.CAU_HINH.NAM_HOC) || '';
  }

  // Mốc tuần 1: lấy từ cau_hinh.tuan_1_bat_dau. Bỏ trống thì suy ra Thứ Hai
  // của tuần chứa ngày khai giảng 05/9 — mốc phổ biến nhất của các trường,
  // nhưng mỗi trường mỗi khác nên Ban giám hiệu chỉnh được bằng nút ✎ Mốc
  // tuần 1. KHÔNG viết cứng số tuần trong mã (quy tắc chung của dự án).
  var MOC_TUAN1 = '';
  function mocTuan1() {
    if (MOC_TUAN1) return MOC_TUAN1;
    var nam = String(namHoc()).slice(0, 4);
    if (!/^\d{4}$/.test(nam)) nam = String(new Date().getFullYear());
    return thuHaiCua(nam + '-09-05');
  }
  // Số tuần chỉ là NHÃN in ra (CSDL khoá theo tu_ngay, không khoá theo số
  // tuần) — nên kẹp về [1,60] cho vừa ràng buộc là đủ, không gây bế tắc.
  // Nhưng kẹp là dấu hiệu mốc tuần 1 đã cũ hoặc đang xem ngoài năm học, nên
  // trả kèm cờ để màn hình nhắc Ban giám hiệu chỉnh mốc.
  function soTuanTho(tuNgay) {
    return Math.round((tuIso(tuNgay) - tuIso(thuHaiCua(mocTuan1()))) / 604800000) + 1;
  }
  function soTuan(tuNgay) {
    var so = soTuanTho(tuNgay);
    return so < 1 ? 1 : so > 60 ? 60 : so;
  }
  function soTuanLech(tuNgay) {
    var so = soTuanTho(tuNgay);
    return so < 1 || so > 53;
  }

  // ════════════════════════════════════════════════════════════
  // KHO
  // ════════════════════════════════════════════════════════════
  var TU_NGAY = '';       // Thứ Hai của tuần đang xem
  var TUAN = null;        // dữ liệu tuần đang xem (null = chưa có lịch)
  var DA_NAP = '';        // đã gọi nạp cho tuần nào — chặn nạp lặp vô hạn
  var DANG = false, LOI = '', CO_BANG = true;
  var MO = '';            // '' | 'viec' | 'truc'  — khung đang mở
  var VIEC_THU = 2, VIEC_BUOI = 'sang', TRUC_THU = 2;
  var TUAN_MAU = {};      // lịch của BẢN MẪU, giữ trong bộ nhớ trang

  function tuanNay() { return thuHaiCua(K().homNayISO()); }

  // ── Bản mẫu: TUẦN NÀY có nội dung thật sự để xem cho ra hình; các tuần
  //    khác trả null để bản xem thử minh hoạ được cả cảnh "chưa có lịch" ──
  function dungTuanMau(tuNgay) {
    if (TUAN_MAU[tuNgay] !== undefined) return TUAN_MAU[tuNgay];
    if (tuNgay !== tuanNay()) { TUAN_MAU[tuNgay] = null; return null; }
    var t = {
      id: 0, tuNgay: tuNgay, denNgay: congNgay(tuNgay, 6),
      tuanSo: soTuan(tuNgay), trangThai: 'ban_hanh',
      trongTam: 'Ổn định nền nếp đầu năm học; hoàn thiện hồ sơ đầu năm; kiểm tra an toàn trường học tại các điểm trường.',
      namHoc: namHoc(), nguoiBH: 'Hiệu trưởng (mẫu)', muc: [], truc: []
    };
    {
      t.muc = [
        { id: 1, thu: 2, buoi: 'sang', gio: '7:15', noiDung: 'Chào cờ đầu tuần, phát động thi đua',
          nguoiCT: 'Hiệu trưởng (mẫu)', coSo: 'CS01', diaDiem: 'Sân trường', thanhPhan: 'Toàn trường', ghiChu: '' },
        { id: 2, thu: 2, buoi: 'chieu', gio: '14:00', noiDung: 'Họp giao ban Ban giám hiệu',
          nguoiCT: 'Hiệu trưởng (mẫu)', coSo: null, diaDiem: 'Phòng họp', thanhPhan: 'BGH, tổ trưởng', ghiChu: '' },
        { id: 3, thu: 3, buoi: 'sang', gio: '', noiDung: 'Dự giờ khối 1 (2 tiết)',
          nguoiCT: 'Phó Hiệu trưởng (mẫu)', coSo: 'CS02', diaDiem: '', thanhPhan: 'Tổ khối 1', ghiChu: '' },
        { id: 4, thu: 4, buoi: 'chieu', gio: '14:30', noiDung: 'Sinh hoạt chuyên môn tổ khối 4-5',
          nguoiCT: 'Tổ trưởng (mẫu)', coSo: 'CS01', diaDiem: 'Phòng chuyên môn', thanhPhan: 'GV khối 4, 5', ghiChu: 'Có biên bản' },
        { id: 5, thu: 5, buoi: 'sang', gio: '', noiDung: 'Kiểm tra an toàn, vệ sinh điểm trường',
          nguoiCT: 'Phó Hiệu trưởng (mẫu)', coSo: 'CS03', diaDiem: '', thanhPhan: '', ghiChu: '' },
        { id: 6, thu: 6, buoi: 'chieu', gio: '15:00', noiDung: 'Họp hội đồng sư phạm tháng',
          nguoiCT: 'Hiệu trưởng (mẫu)', coSo: 'CS01', diaDiem: 'Hội trường', thanhPhan: 'Toàn thể CBGV-NV', ghiChu: '' }
      ];
      t.truc = [
        { id: 1, thu: 2, coSo: 'CS01', loai: 'lanh_dao', nguoiTen: 'Hiệu trưởng (mẫu)' },
        { id: 2, thu: 2, coSo: 'CS02', loai: 'lanh_dao', nguoiTen: 'Phó Hiệu trưởng (mẫu)' },
        { id: 3, thu: 3, coSo: 'CS01', loai: 'lanh_dao', nguoiTen: 'Phó Hiệu trưởng (mẫu)' },
        { id: 4, thu: 4, coSo: 'CS03', loai: 'lanh_dao', nguoiTen: 'Hiệu trưởng (mẫu)' }
      ];
    }
    TUAN_MAU[tuNgay] = t;
    return t;
  }

  // ════════════════════════════════════════════════════════════
  // NẠP
  // ════════════════════════════════════════════════════════════
  function nap(tuNgay) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tuNgay)) return;
    DA_NAP = tuNgay; DANG = true; LOI = '';

    if (!THAT()) {
      CO_BANG = true;
      // Bản sao sâu: các hàm thao tác sửa thẳng vào TUAN, không sao thì chúng
      // ăn luôn vào kho mẫu và tuần này mất sạch việc cho tới khi tải lại trang
      var m = dungTuanMau(tuNgay);
      TUAN = m ? JSON.parse(JSON.stringify(m)) : null;
      DANG = false;
      return;
    }

    var may = window.MAY_CHU;
    // Một truy vấn lấy cả tuần lẫn các mục con — RLS của bảng con vẫn áp
    // riêng, nên bản nháp không lọt ra ngoài qua đường lồng nhau.
    Promise.all([
      may.from('lich_tuan')
        .select('*, lich_tuan_muc(*), truc_tuan(*)')
        .eq('tu_ngay', tuNgay).limit(1),
      may.from('cau_hinh').select('gia_tri').eq('khoa', 'tuan_1_bat_dau').limit(1)
    ]).then(function (kq) {
      DANG = false;
      // Người dùng đã bấm sang tuần khác trong lúc chờ mạng → BỎ kết quả này.
      // Không chặn thì tiêu đề là tuần mới mà nội dung, nút ✕ và nút Ban hành
      // lại thuộc tuần cũ — một cú bấm là ban hành nhầm tuần.
      if (tuNgay !== TU_NGAY) { DA_NAP = ''; K().veLai(); return; }
      if (kq[0].error) throw kq[0].error;
      CO_BANG = true;
      if (!kq[1].error && kq[1].data && kq[1].data[0] && kq[1].data[0].gia_tri) {
        MOC_TUAN1 = kq[1].data[0].gia_tri;
      }
      var d = (kq[0].data || [])[0];
      TUAN = d ? doiTuan(d) : null;
      K().veLai();
    }).catch(function (e) {
      if (K().loiThieuBang(e)) {
        CO_BANG = false; LOI = '';
      } else {
        LOI = 'Không đọc được lịch tuần: ' + ((e && e.message) || e);
      }
      // GIỮ nguyên DA_NAP: xoá ở đây thì vẽ lại là gọi mạng lại ngay, mạng
      // hỏng kéo dài sẽ thành vòng lặp vô tận. Muốn thử lại thì bấm nút.
      TUAN = null; DANG = false;
      K().veLai();
    });
  }

  function doiTuan(d) {
    var muc = (d.lich_tuan_muc || []).map(function (m) {
      return { id: m.id, thu: m.thu, buoi: m.buoi, gio: m.gio || '', noiDung: m.noi_dung,
        nguoiCT: m.nguoi_ct_ten || '', coSo: m.co_so_ma, diaDiem: m.dia_diem || '',
        thanhPhan: m.thanh_phan || '', ghiChu: m.ghi_chu || '', soTt: m.so_tt || 0 };
    });
    muc.sort(function (a, b) {
      return a.thu - b.thu || (BUOI_TT[a.buoi] - BUOI_TT[b.buoi]) ||
        phutCua(a.gio) - phutCua(b.gio) || a.soTt - b.soTt;
    });
    return {
      id: d.id, tuNgay: d.tu_ngay, denNgay: d.den_ngay, tuanSo: d.tuan_so,
      namHoc: d.nam_hoc || namHoc(),
      trongTam: d.trong_tam || '', trangThai: d.trang_thai,
      nguoiBH: d.nguoi_bh_ten || '', banHanhLuc: d.ban_hanh_luc,
      muc: muc,
      truc: (d.truc_tuan || []).map(function (t) {
        return { id: t.id, thu: t.thu, coSo: t.co_so_ma, loai: t.loai,
          nguoiTen: t.nguoi_ten, ghiChu: t.ghi_chu || '' };
      })
    };
  }

  // ════════════════════════════════════════════════════════════
  // VẼ
  // ════════════════════════════════════════════════════════════
  function noiCua(m) {
    var p = [];
    if (m.diaDiem) p.push(m.diaDiem);
    if (m.coSo) p.push(K().tenCoSo(m.coSo));
    else if (DL().coSo.length > 1) p.push('toàn trường');
    return p.join(' · ');
  }

  function veThe(thu) {
    var iso = ngayCuaThu(TU_NGAY, thu);
    var homNay = iso === K().homNayISO();
    var viec = TUAN ? TUAN.muc.filter(function (m) { return m.thu === thu; }) : [];
    var truc = TUAN ? TUAN.truc.filter(function (t) { return t.thu === thu; }) : [];
    // Thứ Bảy và Chủ nhật chỉ hiện khi CÓ việc — trường tiểu học không dạy
    // cuối tuần, hai ô trống chỉ tổ chiếm chỗ. Ẩn với MỌI vai trò: Ban giám
    // hiệu vẫn thêm việc vào hai ngày đó được từ khung "＋ Thêm việc".
    if (thu >= 7 && !viec.length && !truc.length) return '';

    var hangTruc = truc.length
      ? '<div class="lt-truc">🧭 ' + truc.map(function (t) {
          return '<span><b>' + thoat(t.nguoiTen) + '</b>' +
            (t.coSo ? ' — ' + thoat(K().tenCoSo(t.coSo)) : '') +
            (t.loai === 'ban' ? ' (trực ban)' : '') +
            (laQT() ? ' <a href="javascript:LT.trucXoa(' + t.id + ')" title="Bỏ phân trực">✕</a>' : '') +
            '</span>';
        }).join(' · ') + '</div>'
      : '';

    var theoBuoi = BUOI_DS.map(function (b) {
      var ds = viec.filter(function (m) { return m.buoi === b; });
      if (!ds.length) return '';
      return '<div class="lt-buoi"><div class="lt-buoi-ten">' + TEN_BUOI[b] + '</div>' +
        ds.map(function (m) {
          var noi = noiCua(m);
          return '<div class="lt-viec">' +
            (m.gio ? '<span class="lt-gio">' + thoat(m.gio) + '</span>' : '') +
            '<div class="lt-viec-tt"><b>' + thoat(m.noiDung) + '</b>' +
            ((m.nguoiCT || noi || m.thanhPhan)
              ? '<small>' + [m.nguoiCT ? '👤 ' + thoat(m.nguoiCT) : '',
                  noi ? '📍 ' + thoat(noi) : '',
                  m.thanhPhan ? '👥 ' + thoat(m.thanhPhan) : ''].filter(Boolean).join(' · ') + '</small>'
              : '') +
            (m.ghiChu ? '<small class="lt-ghichu">' + thoat(m.ghiChu) + '</small>' : '') +
            '</div>' +
            (laQT() ? '<a class="lt-xoa" href="javascript:LT.viecXoa(' + m.id + ')" title="Xóa việc">✕</a>' : '') +
            '</div>';
        }).join('') + '</div>';
    }).join('');

    return '<div class="lt-the' + (homNay ? ' nay' : '') + (thu >= 7 ? ' cuoi' : '') + '">' +
      '<div class="lt-the-dau"><b>' + TEN_THU[thu] + '</b><span>' + ngayGon(iso) +
      (homNay ? ' · <em>hôm nay</em>' : '') + '</span></div>' +
      hangTruc +
      (theoBuoi || '<div class="lt-trong">Dạy học bình thường</div>') +
      '</div>';
  }

  // ── Khung thêm việc / phân trực (chỉ Ban giám hiệu) ──
  function chonNguoi(id) {
    var ds = (DL().gvDs || []).slice();
    return '<select class="dh-o-nhap" id="' + id + '" style="max-width:100%;margin-top:0">' +
      '<option value="">— chọn người —</option>' +
      ds.map(function (g) {
        return '<option value="' + thoat(g.ten) + '">' + thoat(g.ten) +
          (g.chucVu ? ' (' + thoat(g.chucVu) + ')' : '') + '</option>';
      }).join('') + '</select>';
  }
  function chipThu(dang, hienTai) {
    var ds = [2, 3, 4, 5, 6, 7, 8];
    return '<div class="dh-chon-hang" style="margin:6px 0">' + ds.map(function (t) {
      return '<button class="chip-loc' + (t === hienTai ? ' on' : '') + '" onclick="LT.' + dang + '(' + t + ')">' +
        TEN_THU[t].replace('Thứ ', 'T') + ' <small>' + ngayGon(ngayCuaThu(TU_NGAY, t)) + '</small></button>';
    }).join('') + '</div>';
  }

  function veKhungViec() {
    var nhieuCS = DL().coSo.length > 1;
    return '<div class="lt-khung">' +
      '<div class="dh-tieu-de" style="margin-top:0">＋ Thêm việc vào lịch</div>' +
      chipThu('viecThu', VIEC_THU) +
      '<div class="dh-chon-hang">' +
      BUOI_DS.map(function (b) {
        return '<button class="chip-loc' + (b === VIEC_BUOI ? ' on' : '') + '" onclick="LT.viecBuoi(\'' + b + '\')">' + TEN_BUOI[b] + '</button>';
      }).join('') + '</div>' +
      '<textarea class="dh-o-nhap" id="lt-noidung" rows="2" placeholder="Nội dung công việc (VD: Họp hội đồng sư phạm tháng 9)…"></textarea>' +
      '<div class="dh-chon-hang" style="margin-top:8px;flex-wrap:wrap">' +
      '<input class="dh-o-nhap" id="lt-gio" style="max-width:96px;margin-top:0" placeholder="Giờ (14:00)">' +
      chonNguoi('lt-nguoi') +
      (nhieuCS
        ? '<select class="dh-o-nhap" id="lt-coso" style="width:auto;max-width:100%;margin-top:0">' +
          '<option value="">Toàn trường</option>' +
          DL().coSo.map(function (c) {
            return '<option value="' + thoat(c.ma) + '">' + thoat(c.ten) + '</option>';
          }).join('') + '</select>'
        : '') +
      '</div>' +
      '<div class="dh-chon-hang" style="margin-top:8px;flex-wrap:wrap">' +
      '<input class="dh-o-nhap" id="lt-diadiem" style="max-width:180px;margin-top:0" placeholder="Địa điểm (hội trường…)">' +
      '<input class="dh-o-nhap" id="lt-thanhphan" style="max-width:220px;margin-top:0" placeholder="Thành phần dự">' +
      '<input class="dh-o-nhap" id="lt-ghichu" style="max-width:180px;margin-top:0" placeholder="Ghi chú">' +
      '</div>' +
      '<div class="dh-chon-hang" style="margin-top:8px">' +
      '<button class="dh-nut-nho" onclick="LT.viecThem()">＋ Thêm vào lịch</button>' +
      '<button class="dh-nut-nho" onclick="LT.dong()">Đóng</button></div>' +
      '</div>';
  }

  function veKhungTruc() {
    var nhieuCS = DL().coSo.length > 1;
    return '<div class="lt-khung">' +
      '<div class="dh-tieu-de" style="margin-top:0">🧭 Phân công trực</div>' +
      '<div class="dh-ghi-chu-nho" style="margin-top:0">Sau sáp nhập đây là dòng quan trọng nhất tờ lịch: ' +
      'phụ huynh đến điểm lẻ hỏi "hôm nay ai ở đây" thì phải trả lời được.</div>' +
      chipThu('trucThu', TRUC_THU) +
      '<div class="dh-chon-hang" style="flex-wrap:wrap">' +
      chonNguoi('lt-truc-nguoi') +
      (nhieuCS
        ? '<select class="dh-o-nhap" id="lt-truc-coso" style="width:auto;max-width:100%;margin-top:0">' +
          '<option value="">Toàn trường</option>' +
          DL().coSo.map(function (c) {
            return '<option value="' + thoat(c.ma) + '">' + thoat(c.ten) + '</option>';
          }).join('') + '</select>'
        : '') +
      '<select class="dh-o-nhap" id="lt-truc-loai" style="width:auto;max-width:100%;margin-top:0">' +
      '<option value="lanh_dao">Trực lãnh đạo</option><option value="ban">Trực ban</option></select>' +
      '</div>' +
      '<div class="dh-chon-hang" style="margin-top:8px">' +
      '<button class="dh-nut-nho" onclick="LT.trucThem()">＋ Phân trực</button>' +
      '<button class="dh-nut-nho" onclick="LT.dong()">Đóng</button></div>' +
      '</div>';
  }

  function veLichTuan() {
    if (!TU_NGAY) TU_NGAY = tuanNay();
    if (!DANG && DA_NAP !== TU_NGAY) nap(TU_NGAY);

    var so = TUAN ? TUAN.tuanSo : soTuan(TU_NGAY);
    var den = congNgay(TU_NGAY, 6);
    var tieuDe = '<div class="dh-tieu-de" style="margin-top:0">📅 Lịch công tác tuần ' +
      (laQT() && TUAN ? '<a href="javascript:LT.suaSoTuan()" title="Sửa số tuần">' + so + ' ✎</a>' : so) +
      ' <small>(' + ngayVN(TU_NGAY) + ' – ' + ngayVN(den) + ')</small></div>';
    // Số tuần ra ngoài khoảng 1–53 nghĩa là mốc tuần 1 đã cũ (sang năm học
    // mới mà chưa chỉnh) hoặc đang xem ngoài năm học — nói thẳng, đừng để
    // hiệu trưởng nhìn "tuần 50" giữa kỳ nghỉ hè rồi tự hỏi.
    var canhBaoMoc = (laQT() && soTuanLech(TU_NGAY))
      ? '<div class="hd-kiem vang">Số tuần tính ra nằm ngoài khoảng 1–53 — <b>mốc tuần 1 có lẽ đã cũ</b> ' +
        '(đang lấy Thứ Hai ' + ngayVN(thuHaiCua(mocTuan1())) + '). Bấm <b>✎ Mốc tuần 1</b> để chỉnh.</div>'
      : '';

    var dieuHuong = '<div class="dh-chon-hang" style="margin-bottom:8px;flex-wrap:wrap">' +
      '<button class="chip-loc" onclick="LT.tuan(-1)">← Tuần trước</button>' +
      (TU_NGAY !== tuanNay() ? '<button class="chip-loc on" onclick="LT.veTuanNay()">Tuần này</button>' : '') +
      '<button class="chip-loc" onclick="LT.tuan(1)">Tuần sau →</button>' +
      '</div>';

    if (!CO_BANG) {
      return tieuDe + '<div class="hd-kiem vang">Chức năng Lịch công tác tuần cần chạy ' +
        '<b>sql/32-lich-tuan.sql</b> trên Supabase rồi tải lại trang. Các phần khác không bị ảnh hưởng.</div>';
    }
    if (LOI) {
      return tieuDe + dieuHuong + '<div class="the-thong-bao">⚠ ' + thoat(LOI) +
        '<div class="dh-chon-hang" style="margin-top:10px">' +
        '<button class="dh-nut-nho" onclick="LT.thuLai()">↻ Thử lại</button></div></div>';
    }
    // Đang nạp, hoặc dữ liệu trong tay còn là của tuần khác → chưa vẽ nội dung
    if (DANG || (TUAN && TUAN.tuNgay !== TU_NGAY)) {
      return tieuDe + dieuHuong + '<div class="the-thong-bao">Đang đọc lịch tuần…</div>';
    }

    var nhan = THAT()
      ? ''
      : '<div class="hd-kiem vang" style="margin-top:0">🧪 <b>BẢN MẪU</b> — tên người và nội dung công việc ' +
        'dưới đây là giả định. Đăng nhập để dùng lịch thật của nhà trường.</div>';

    // Chưa có lịch cho tuần này
    if (!TUAN) {
      return tieuDe + dieuHuong + nhan + canhBaoMoc +
        '<div class="the-thong-bao"><p style="font-size:14.5px"><b>Chưa có lịch công tác cho tuần này.</b></p>' +
        (laQT()
          ? '<p style="font-size:13.5px;color:var(--chu-mo);margin-top:6px">Tạo lịch rồi thêm dần các đầu việc. ' +
            'Lịch mới ở trạng thái <b>nháp</b> — chỉ Ban giám hiệu thấy, đến khi bấm Ban hành.</p>' +
            '<button class="dh-nut-nho" style="margin-top:10px" onclick="LT.taoTuan()">＋ Tạo lịch tuần ' + so + '</button>'
          : '<p style="font-size:13.5px;color:var(--chu-mo);margin-top:6px">Ban giám hiệu chưa ban hành lịch tuần này.</p>') +
        '</div>';
    }

    var laNhap = TUAN.trangThai === 'nhap';
    var bangTT = laNhap
      ? '<div class="hd-kiem vang">🟡 <b>BẢN NHÁP</b> — mới chỉ Ban giám hiệu nhìn thấy. ' +
        'Soạn xong bấm <b>Ban hành</b> thì giáo viên mới xem được.</div>'
      : '<div class="hd-kiem xanh">🟢 <b>Đã ban hành</b>' +
        (TUAN.nguoiBH ? ' — ' + thoat(TUAN.nguoiBH) : '') + '.</div>';

    var trongTam = TUAN.trongTam
      ? '<div class="lt-trongtam"><b>Trọng tâm tuần:</b> ' + thoat(TUAN.trongTam) + '</div>'
      : (laQT() ? '<div class="dh-ghi-chu-nho">Chưa ghi trọng tâm tuần — bấm ✎ bên dưới để thêm.</div>' : '');

    var luoi = '<div class="lt-luoi">' +
      [2, 3, 4, 5, 6, 7, 8].map(veThe).join('') + '</div>';

    var nutQT = laQT()
      ? '<div class="dh-chon-hang" style="margin-top:12px;flex-wrap:wrap">' +
        '<button class="dh-nut-nho" onclick="LT.mo(\'viec\')">＋ Thêm việc</button>' +
        '<button class="dh-nut-nho" onclick="LT.mo(\'truc\')">🧭 Phân trực</button>' +
        '<button class="dh-nut-nho" onclick="LT.suaTrongTam()">✎ Trọng tâm tuần</button>' +
        '<button class="dh-nut-nho" onclick="LT.suaMoc()">✎ Mốc tuần 1</button>' +
        '<button class="dh-nut-nho" onclick="LT.word()">📄 Xuất Word</button>' +
        (laNhap
          ? '<button class="dh-nut-nho" onclick="LT.banHanh(true)">📢 Ban hành</button>' +
            '<button class="dh-nut-nho nut-xoa-nd" onclick="LT.xoaTuan()">🗑 Xoá tuần</button>'
          : '<button class="dh-nut-nho" onclick="LT.banHanh(false)">↩ Thu về nháp</button>') +
        '</div>' +
        (MO === 'viec' ? veKhungViec() : MO === 'truc' ? veKhungTruc() : '')
      : '<div class="dh-chon-hang" style="margin-top:12px">' +
        '<button class="dh-nut-nho" onclick="LT.word()">📄 Xuất Word</button></div>';

    return tieuDe + dieuHuong + nhan + canhBaoMoc + bangTT + trongTam + luoi + nutQT;
  }

  // ════════════════════════════════════════════════════════════
  // XUẤT WORD — bảng chi tiết đúng thể thức NĐ 30, khổ A4 dọc
  // ════════════════════════════════════════════════════════════
  function xuatWord() {
    var W = window.WORD_TIEN_ICH;
    if (!W) { window.notify('Chưa nạp được bộ xuất Word (js/xuat-word.js).'); return; }
    if (!TUAN) { window.notify('Tuần này chưa có lịch để xuất.'); return; }

    var hang = '';
    [2, 3, 4, 5, 6, 7, 8].forEach(function (thu) {
      var ds = TUAN.muc.filter(function (m) { return m.thu === thu; });
      if (!ds.length) return;
      var iso = ngayCuaThu(TU_NGAY, thu);
      ds.forEach(function (m, i) {
        hang += '<tr>' +
          (i === 0
            ? '<td rowspan="' + ds.length + '" class="giua"><b>' + W.chan(TEN_THU[thu]) + '</b><br>' +
              W.chan(ngayVN(iso)) + '</td>'
            : '') +
          '<td class="giua">' + W.chan(TEN_BUOI[m.buoi] + (m.gio ? ' ' + m.gio : '')) + '</td>' +
          '<td>' + W.chan(m.noiDung) +
          (m.thanhPhan ? '<br><i>Thành phần: ' + W.chan(m.thanhPhan) + '</i>' : '') + '</td>' +
          '<td>' + W.chan(m.nguoiCT) + '</td>' +
          '<td>' + W.chan(noiCua(m)) + '</td>' +
          '<td>' + W.chan(m.ghiChu) + '</td></tr>';
      });
    });
    if (!hang) hang = '<tr><td colspan="6" class="giua"><i>Tuần này chưa có đầu việc nào.</i></td></tr>';

    // Bảng trực: mỗi ngày một dòng, mỗi cơ sở một cột
    var dsCS = DL().coSo || [];
    var bangTruc = '';
    if (TUAN.truc.length) {
      // ⚠️ PHẢI có cột "Toàn trường" cho các dòng co_so_ma = NULL — mà đó lại
      // là lựa chọn MẶC ĐỊNH của ô chọn cơ sở. Thiếu cột này thì hiệu trưởng
      // phân trực mà quên chọn điểm là tờ giấy dán bảng tin có ngày trống
      // trơn, đúng câu hỏi "hôm nay ai ở đây" mà tính năng sinh ra để trả lời.
      var cot = dsCS.length > 1
        ? dsCS.concat([{ ma: null, ten: 'Toàn trường' }])
        : [{ ma: null, ten: 'Người trực' }];
      var rongCot = Math.floor(78 / cot.length);
      var dauT = '<tr><th style="width:22%">Thứ, ngày</th>' + cot.map(function (c) {
        return '<th style="width:' + rongCot + '%">' + W.chan(c.ten) + '</th>';
      }).join('') + '</tr>';
      var thanT = '';
      [2, 3, 4, 5, 6, 7, 8].forEach(function (thu) {
        var ds = TUAN.truc.filter(function (t) { return t.thu === thu; });
        if (!ds.length) return;
        thanT += '<tr><td class="giua">' + W.chan(TEN_THU[thu] + ', ' + ngayVN(ngayCuaThu(TU_NGAY, thu))) + '</td>' +
          cot.map(function (c) {
            var ai = ds.filter(function (t) {
              return dsCS.length > 1 ? (t.coSo || null) === c.ma : true;
            });
            return '<td class="giua">' + W.chan(ai.map(function (t) {
              return t.nguoiTen + (t.loai === 'ban' ? ' (trực ban)' : '');
            }).join(', ')) + '</td>';
          }).join('') + '</tr>';
      });
      bangTruc = '<p style="margin-top:14pt"><b>PHÂN CÔNG TRỰC</b></p>' +
        '<table class="co-dinh"><thead>' + dauT + '</thead><tbody>' + thanT + '</tbody></table>';
    }

    // Bản NHÁP phải mang dấu hiệu ngay trên giấy: tờ in ra có đủ Quốc hiệu,
    // thể thức NĐ 30 và ô ký Hiệu trưởng nên trông chính danh hơn cả màn hình.
    // Không đánh dấu thì một bản nháp in thử dán lên bảng tin là cả trường
    // thi hành một tờ lịch chưa ban hành.
    var laNhapW = TUAN.trangThai === 'nhap';
    var dauNhap = laNhapW
      ? '<p class="giua" style="margin-top:8pt"><b style="font-size:13pt">*** BẢN NHÁP — CHƯA BAN HÀNH, KHÔNG DÁN BẢNG TIN ***</b></p>'
      : '';
    var than = W.theThuc() + dauNhap +
      '<p class="giua" style="margin-top:18pt"><b style="font-size:14pt">LỊCH CÔNG TÁC TUẦN ' + TUAN.tuanSo + '</b></p>' +
      '<p class="giua" style="margin-top:2pt"><b>Năm học ' + W.chan(TUAN.namHoc || namHoc()) + '</b></p>' +
      '<p class="giua nghieng" style="margin-top:2pt">(Từ ngày ' + W.chan(ngayVN(TU_NGAY)) +
      ' đến ngày ' + W.chan(ngayVN(congNgay(TU_NGAY, 6))) + ')</p>' +
      (TUAN.trongTam
        ? '<p style="margin-top:12pt"><b>Trọng tâm tuần:</b> ' + W.chan(TUAN.trongTam) + '</p>' : '') +
      '<table class="co-dinh" style="margin-top:10pt"><thead><tr>' +
      '<th style="width:14%">Thứ, ngày</th><th style="width:11%">Buổi</th>' +
      '<th style="width:33%">Nội dung công việc</th><th style="width:16%">Người chủ trì</th>' +
      '<th style="width:14%">Địa điểm</th><th style="width:12%">Ghi chú</th>' +
      '</tr></thead><tbody>' + hang + '</tbody></table>' +
      bangTruc +
      '<p class="nghieng" style="margin-top:10pt;font-size:12pt">Lịch có thể điều chỉnh khi có việc đột xuất; ' +
      'phần điều chỉnh được thông báo trên hệ thống Quản trị số.</p>' +
      (laNhapW ? '' : W.khoiKy(null));

    W.taiVe(W.khungWord('Lịch công tác tuần ' + TUAN.tuanSo, than),
      'lich-cong-tac-tuan-' + TUAN.tuanSo + (laNhapW ? '-NHAP' : '') + '.doc');
  }

  // ════════════════════════════════════════════════════════════
  // THAO TÁC
  // ════════════════════════════════════════════════════════════
  function lamMoi() { DA_NAP = ''; TUAN = null; LOI = ''; K().veLai(); }
  function soTtKe() {
    var m = 0;
    (TUAN.muc || []).forEach(function (x) { if (x.soTt > m) m = x.soTt; });
    return m + 1;
  }
  function oGiaTri(id) { var e = $('#' + id); return e ? String(e.value || '').trim() : ''; }

  window.LT = {
    // ô nhập cần giữ khi vẽ lại — dieu-hanh.js đọc mảng này trong veGiu()
    oGiu: ['lt-noidung', 'lt-gio', 'lt-nguoi', 'lt-coso', 'lt-diadiem',
      'lt-thanhphan', 'lt-ghichu', 'lt-truc-nguoi', 'lt-truc-coso', 'lt-truc-loai'],

    tuan: function (buoc) {
      TU_NGAY = congNgay(TU_NGAY || tuanNay(), buoc * 7);
      TUAN = null; LOI = ''; MO = '';
      K().veLai();
    },
    veTuanNay: function () { TU_NGAY = tuanNay(); TUAN = null; LOI = ''; MO = ''; K().veLai(); },
    thuLai: function () { lamMoi(); },
    // dieu-hanh.js gọi khi vừa nạp xong DỮ LIỆU THẬT: vứt hết bản mẫu đã dựng
    // trong lúc chờ, kẻo tờ lịch tên giả nằm nguyên dưới băng xanh "dữ liệu thật"
    datLai: function () { DA_NAP = ''; TUAN = null; LOI = ''; MOC_TUAN1 = ''; TUAN_MAU = {}; },

    // Xoá cả tuần — lối thoát khi bấm nhầm "Tạo lịch" ở tuần khác. CSDL chỉ
    // cho xoá bản NHÁP (policy lt_xoa), nên đã ban hành thì phải Thu về nháp
    // trước: cố ý bắt hai bước, tờ lịch đã ban hành không được biến mất lặng lẽ.
    xoaTuan: function () {
      if (!TUAN) return;
      if (TUAN.trangThai !== 'nhap') {
        window.notify('Lịch đã ban hành — bấm "↩ Thu về nháp" trước rồi mới xoá được.');
        return;
      }
      window.hopHoi({
        tieuDe: 'Xoá cả lịch tuần ' + TUAN.tuanSo + '?',
        moTa2: ngayVN(TU_NGAY) + ' – ' + ngayVN(congNgay(TU_NGAY, 6)),
        noiDung: 'Toàn bộ đầu việc và phân trực của tuần này mất theo. Không lấy lại được.',
        nutOK: 'Xoá lịch tuần', nguyHiem: true
      }).then(function (dong_y) {
        if (!dong_y) return;
        if (!THAT()) { TUAN_MAU[TU_NGAY] = null; lamMoi(); return; }
        window.MAY_CHU.from('lich_tuan').delete().eq('id', TUAN.id).select()
          .then(function (r) {
            if (r.error) { K().baoLoi(r.error); return; }
            if (!r.data || !r.data.length) { window.notify('Không xoá được — lịch đã ban hành hoặc thầy cô không có quyền.'); return; }
            window.notify('🗑 Đã xoá lịch tuần.');
            lamMoi();
          });
      });
    },

    // Số tuần chỉ là nhãn in ra, mỗi trường đếm một kiểu — cho sửa tay
    suaSoTuan: function () {
      if (!TUAN) return;
      window.hopNhap({
        bieuTuong: '🔢',
        tieuDe: 'Số tuần in trên tờ lịch',
        moTa: ngayVN(TU_NGAY) + ' – ' + ngayVN(congNgay(TU_NGAY, 6)),
        nhan: 'Số tuần',
        kieu: 'so', nhoNhat: 1, lonNhat: 60,
        giaTri: TUAN.tuanSo,
        chuThich: 'Nhận từ 1 đến 60. Chỉ đổi nhãn in ra, không dời tuần trên lịch.',
        batBuoc: true,
        kiemTra: function (v) {
          var s = parseInt(v, 10);
          return (isNaN(s) || s < 1 || s > 60) ? 'Số tuần nhận từ 1 đến 60.' : null;
        },
        nutLuu: 'Lưu số tuần'
      }).then(function (moi) {
        if (moi === null) return;
        var so = parseInt(moi, 10);
        if (!THAT()) { TUAN.tuanSo = so; K().veLai(); return; }
        window.MAY_CHU.from('lich_tuan').update({ tuan_so: so }).eq('id', TUAN.id).select()
          .then(function (r) {
            if (r.error) { K().baoLoi(r.error); return; }
            if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới sửa được lịch tuần.'); return; }
            lamMoi();
          });
      });
    },
    mo: function (gi) { MO = (MO === gi ? '' : gi); K().veLai(); },
    dong: function () { MO = ''; K().veLai(); },
    viecThu: function (t) { VIEC_THU = t; K().veLai(); },
    viecBuoi: function (b) { VIEC_BUOI = b; K().veLai(); },
    trucThu: function (t) { TRUC_THU = t; K().veLai(); },

    taoTuan: function () {
      var so = soTuan(TU_NGAY), den = congNgay(TU_NGAY, 6);
      if (!THAT()) {
        TUAN = dungTuanMau(TU_NGAY); TUAN.muc = []; TUAN.truc = []; TUAN.trangThai = 'nhap';
        K().veLai(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      var nh = namHoc();
      if (!/^\d{4}-\d{4}$/.test(nh)) {
        window.notify('Chưa xác định được năm học — vào Quản trị kiểm tra mốc năm học trước đã.');
        return;
      }
      // KHÔNG gửi nguoi_tao_id: trigger lt_chot_ban_hanh điền từ auth.uid()
      window.MAY_CHU.from('lich_tuan').insert({
        nam_hoc: nh, tuan_so: so, tu_ngay: TU_NGAY, den_ngay: den, trang_thai: 'nhap'
      }).then(function (r) {
        if (r.error) {
          K().baoLoi(r.error.code === '23505'
            ? { message: 'Tuần ' + ngayVN(TU_NGAY) + ' – ' + ngayVN(den) + ' đã có lịch rồi — tải lại trang để xem.' }
            : r.error);
          return;
        }
        window.notify('📅 Đã tạo lịch tuần ' + so + ' ở dạng NHÁP. Thêm việc rồi bấm Ban hành.');
        lamMoi();
      });
    },

    viecThem: function () {
      var noiDung = oGiaTri('lt-noidung');
      if (!noiDung) { window.notify('Ghi nội dung công việc trước đã.'); return; }
      if (!TUAN) { window.notify('Chưa có lịch tuần — bấm Tạo lịch tuần trước.'); return; }
      var ban = {
        thu: VIEC_THU, buoi: VIEC_BUOI, gio: oGiaTri('lt-gio') || null,
        noiDung: noiDung, nguoiCT: oGiaTri('lt-nguoi'),
        coSo: oGiaTri('lt-coso') || null, diaDiem: oGiaTri('lt-diadiem'),
        thanhPhan: oGiaTri('lt-thanhphan'), ghiChu: oGiaTri('lt-ghichu')
      };
      if (!THAT()) {
        ban.id = -Date.now();
        TUAN.muc.push(ban);
        donO(); K().veLai(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('lich_tuan_muc').insert({
        lich_id: TUAN.id, thu: ban.thu, buoi: ban.buoi, gio: ban.gio,
        noi_dung: ban.noiDung, nguoi_ct_ten: ban.nguoiCT || null,
        co_so_ma: ban.coSo, dia_diem: ban.diaDiem || null,
        thanh_phan: ban.thanhPhan || null, ghi_chu: ban.ghiChu || null,
        // max+1 chứ KHÔNG phải length: xoá một việc giữa chừng rồi thêm việc
        // mới là trùng số thứ tự với việc cũ, hai việc đổi chỗ nhau tuỳ hứng
        so_tt: soTtKe()
      }).then(function (r) {
        if (r.error) { K().baoLoi(r.error); return; }
        donO();
        window.notify('✅ Đã thêm vào ' + TEN_THU[ban.thu] + '.');
        lamMoi();
      });
    },
    viecXoa: function (id) {
      // Nhắc lại chính nội dung việc sắp xoá — hộp hỏi trống trơn thì bấm
      // nhầm dấu ✕ của việc bên cạnh cũng không ai nhận ra
      var v = (TUAN && TUAN.muc || []).filter(function (m) { return m.id === id; })[0];
      window.hopHoi({
        tieuDe: 'Xoá việc này khỏi lịch tuần?',
        moTa2: v ? TEN_THU[v.thu] + (v.gio ? ' · ' + v.gio : '') : '',
        noiDung: v ? v.noiDung : 'Việc này sẽ bị xoá khỏi tờ lịch.',
        nutOK: 'Xoá việc', nguyHiem: true
      }).then(function (dong_y) {
        if (!dong_y) return;
        if (!THAT()) {
          TUAN.muc = TUAN.muc.filter(function (m) { return m.id !== id; });
          K().veLai(); return;
        }
        window.MAY_CHU.from('lich_tuan_muc').delete().eq('id', id).select()
          .then(function (r) {
            if (r.error) { K().baoLoi(r.error); return; }
            if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới sửa được lịch tuần.'); return; }
            lamMoi();
          });
      });
    },

    trucThem: function () {
      var ten = oGiaTri('lt-truc-nguoi');
      if (!ten) { window.notify('Chọn người trực trước đã.'); return; }
      if (!TUAN) { window.notify('Chưa có lịch tuần — bấm Tạo lịch tuần trước.'); return; }
      var coSo = oGiaTri('lt-truc-coso') || null, loai = oGiaTri('lt-truc-loai') || 'lanh_dao';
      if (!THAT()) {
        TUAN.truc.push({ id: -Date.now(), thu: TRUC_THU, coSo: coSo, loai: loai, nguoiTen: ten });
        K().veLai(); window.notify('Bản mẫu — chưa ghi cơ sở dữ liệu.');
        return;
      }
      window.MAY_CHU.from('truc_tuan').insert({
        lich_id: TUAN.id, thu: TRUC_THU, co_so_ma: coSo, loai: loai, nguoi_ten: ten
      }).then(function (r) {
        if (r.error) {
          K().baoLoi(r.error.code === '23505'
            ? { message: TEN_THU[TRUC_THU] + ' đã phân trực cho nơi này rồi — bỏ phân trực cũ (dấu ✕) nếu muốn đổi người.' }
            : r.error);
          return;
        }
        donO();
        window.notify('🧭 Đã phân trực ' + TEN_THU[TRUC_THU] + '.');
        lamMoi();
      });
    },
    trucXoa: function (id) {
      // Hỏi lại như viecXoa — hai dấu ✕ trông giống hệt nhau, một cái hỏi
      // một cái không thì sớm muộn cũng bấm nhầm
      var t0 = (TUAN && TUAN.truc || []).filter(function (t) { return t.id === id; })[0];
      window.hopHoi({
        tieuDe: 'Bỏ phân công trực này?',
        moTa2: t0 ? TEN_THU[t0.thu] : '',
        noiDung: t0 ? (t0.nguoiTen || 'Người trực') + ' sẽ không còn trong bảng phân trực của tuần.'
                    : 'Phân công trực này sẽ bị bỏ.',
        nutOK: 'Bỏ phân trực', nguyHiem: true
      }).then(function (dong_y) {
        if (!dong_y) return;
        if (!THAT()) {
          TUAN.truc = TUAN.truc.filter(function (t) { return t.id !== id; });
          K().veLai(); return;
        }
        window.MAY_CHU.from('truc_tuan').delete().eq('id', id).select()
          .then(function (r) {
            if (r.error) { K().baoLoi(r.error); return; }
            if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới sửa được phân trực.'); return; }
            lamMoi();
          });
      });
    },

    // Trọng tâm tuần thường là 2-4 ý, viết cả câu — ô một dòng của prompt()
    // trình duyệt không đủ nhìn, nên dùng hộp thoại riêng (js/hop-thoai.js).
    suaTrongTam: function () {
      if (!TUAN) return;
      window.hopNhap({
        bieuTuong: '🎯',
        tieuDe: 'Trọng tâm tuần ' + TUAN.tuanSo,
        moTa: ngayVN(TU_NGAY) + ' – ' + ngayVN(congNgay(TU_NGAY, 6)),
        nhan: 'Nội dung trọng tâm',
        giaTri: TUAN.trongTam || '',
        goiY: 'Ví dụ: Ổn định nền nếp đầu năm học; hoàn thiện hồ sơ đầu năm; kiểm tra an toàn trường học tại các điểm trường.',
        chuThich: 'Mỗi ý ngăn bằng dấu chấm phẩy. Dòng này in ngay dưới đầu tờ lịch và trong bản Word. Để trống rồi Lưu là bỏ trọng tâm tuần.',
        toiDa: 500,
        nutLuu: 'Lưu trọng tâm'
      }).then(function (moi) {
        if (moi === null) return;
        if (!THAT()) { TUAN.trongTam = moi; K().veLai(); return; }
        window.MAY_CHU.from('lich_tuan').update({ trong_tam: moi || null }).eq('id', TUAN.id).select()
          .then(function (r) {
            if (r.error) { K().baoLoi(r.error); return; }
            if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới sửa được lịch tuần.'); return; }
            lamMoi();
          });
      });
    },

    // Số tuần đếm từ đây. Trường tính tuần 1 từ tuần tựu trường, trường khác
    // tính từ tuần khai giảng — không đoán thay được, để Ban giám hiệu chốt.
    suaMoc: function () {
      var cu = thuHaiCua(mocTuan1());
      window.hopNhap({
        bieuTuong: '📌',
        tieuDe: 'Mốc TUẦN 1 năm học ' + namHoc(),
        moTa: 'Ngày Thứ Hai mở đầu tuần 1',
        nhan: 'Ngày bắt đầu tuần 1',
        kieu: 'ngay',
        giaTri: cu,
        chuThich: 'Chọn giữa tuần thì app tự lùi về Thứ Hai của tuần đó. Số tuần của các lịch ĐÃ TẠO giữ nguyên, chỉ lịch tạo sau mới đếm theo mốc mới.',
        batBuoc: true,
        kiemTra: function (v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Ngày phải viết dạng 2026-09-07.';
        },
        nutLuu: 'Lưu mốc tuần 1'
      }).then(function (moi) {
        if (moi === null) return;
        var chuan = thuHaiCua(moi);       // lỡ chọn giữa tuần thì tự lùi về Thứ Hai
        if (!THAT()) { MOC_TUAN1 = chuan; TUAN_MAU = {}; lamMoi(); return; }
        // upsert chứ không update: dòng cấu hình lỡ bị xoá thì update trả 0
        // dòng và app báo "Chỉ Ban giám hiệu mới đổi được" ngay với hiệu trưởng
        window.MAY_CHU.from('cau_hinh')
          .upsert({ khoa: 'tuan_1_bat_dau', gia_tri: chuan }, { onConflict: 'khoa' }).select()
          .then(function (r) {
            if (r.error) { K().baoLoi(r.error); return; }
            if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới đổi được mốc tuần 1.'); return; }
            MOC_TUAN1 = chuan;
            window.notify('✅ Mốc tuần 1 nay là Thứ Hai ' + ngayVN(chuan) + '.');
            lamMoi();
          });
      });
    },

    banHanh: function (bat) {
      if (!TUAN) return;
      // Ban hành tờ lịch còn trống, hoặc thu tờ đang treo về nháp — hai nước
      // đi cả trường nhìn thấy, nên hỏi lại; ban hành tờ đã có việc thì không.
      var hoi = null;
      if (bat && !TUAN.muc.length) {
        hoi = {
          bieuTuong: '📢',
          tieuDe: 'Lịch tuần này chưa có đầu việc nào',
          moTa2: 'Tuần ' + TUAN.tuanSo + ' · ' + ngayVN(TU_NGAY) + ' – ' + ngayVN(congNgay(TU_NGAY, 6)),
          noiDung: 'Ban hành lúc này thì toàn trường thấy một tờ lịch trống. Vẫn ban hành?',
          nutOK: 'Vẫn ban hành'
        };
      } else if (!bat) {
        hoi = {
          bieuTuong: '↩',
          tieuDe: 'Thu lịch về dạng nháp?',
          moTa2: 'Tuần ' + TUAN.tuanSo + ' · ' + ngayVN(TU_NGAY) + ' – ' + ngayVN(congNgay(TU_NGAY, 6)),
          noiDung: 'Giáo viên sẽ không xem được nữa cho tới khi ban hành lại.',
          nutOK: 'Thu về nháp'
        };
      }
      (hoi ? window.hopHoi(hoi) : Promise.resolve(true)).then(function (dong_y) {
        if (!dong_y) return;
        if (!THAT()) {
          TUAN.trangThai = bat ? 'ban_hanh' : 'nhap';
          TUAN.nguoiBH = bat ? 'BGH (mẫu)' : '';
          K().veLai(); return;
        }
        // Chỉ gửi trang_thai. Chữ ký (nguoi_bh_ten, ban_hanh_luc) do trigger
        // lt_chot_ban_hanh điền từ auth.uid() — không tin chữ client gửi lên,
        // kẻo ký được tờ lịch đứng tên Hiệu trưởng và đề ngày lùi lại.
        window.MAY_CHU.from('lich_tuan')
          .update({ trang_thai: bat ? 'ban_hanh' : 'nhap' })
          .eq('id', TUAN.id).select().then(function (r) {
          if (r.error) { K().baoLoi(r.error); return; }
          if (!r.data || !r.data.length) { window.notify('Chỉ Ban giám hiệu mới ban hành được lịch tuần.'); return; }
          window.notify(bat ? '📢 Đã ban hành — toàn trường xem được ngay.' : '↩ Đã thu về nháp.');
          lamMoi();
        });
      });
    },

    word: xuatWord
  };

  function donO() {
    ['lt-noidung', 'lt-gio', 'lt-diadiem', 'lt-thanhphan', 'lt-ghichu',
      'lt-truc-nguoi'].forEach(function (id) {
      var e = $('#' + id);
      if (e) e.value = '';
    });
  }

  // dieu-hanh.js gọi hàm này khi vẽ thẻ "📅 Lịch tuần"
  window.veLichTuan = function () {
    if (!window.DH_KHO) return '';
    return veLichTuan();
  };
})();
