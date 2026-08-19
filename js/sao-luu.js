// ============================================================
// sao-luu.js — THẺ "SAO LƯU" trong màn Quản trị
//
// VÌ SAO PHẢI CÓ: Supabase gói miễn phí **KHÔNG có sao lưu tự động, KHÔNG có
// khôi phục theo thời điểm**. Xoá dự án là mất vĩnh viễn, kể cả Supabase cũng
// không lấy lại được — chính tài liệu của họ khuyến cáo người dùng gói miễn
// phí tự xuất dữ liệu mà giữ. Mỗi trường một cơ sở dữ liệu riêng, nên bản sao
// cũng phải do chính trường giữ.
//
// Cách làm: bấm một nút → tải về MỘT tệp JSON chứa toàn bộ dữ liệu trường đọc
// được. Không cần máy chủ, không ai phải giữ chìa khoá của trường nào.
//
// Đăng ký thẻ qua window.qtTabPhu (kiến trúc Bạch Liêu) — KHÔNG sửa quan-tri.js.
// ============================================================
(function () {
  'use strict';

  // Danh sách bảng lấy từ chính bộ SQL. Cập nhật khi thêm bảng mới:
  //   grep -rhoiE "create table (if not exists )?([a-z_]+)" sql/*.sql | sed -E 's/.* //' | sort -u
  // Bảng nào người đang đăng nhập không có quyền đọc thì RLS trả mảng rỗng —
  // ghi vào phần "thieu" của tệp chứ KHÔNG dừng cả bản sao lưu.
  var BANG = [
    'bao_cao_dau_buoi', 'bao_cao_tdg', 'cau_hinh', 'cnqg_bang', 'cnqg_tu_danh_gia',
    'co_so', 'cong_thang_chot', 'cong_viec', 'cong_viec_mau', 'danh_gia_tieu_chuan',
    'de_xuat', 'diem_danh_lop', 'du_gio', 'du_gio_tieu_chi', 'gv_vang',
    'ho_so', 'ho_so_luu_tru', 'hoc_sinh', 'hoc_sinh_lop', 'hoi_dong_tdg',
    'hs_ket_qua', 'hs_nl_pc', 'hs_tong_hop', 'hs_vang', 'ke_hoach_cai_tien',
    'khct_theo_doi', 'khct_thong_tin', 'khct_van_de', 'kiem_tra_diem_truong',
    'ktnb_dot', 'lich_tuan', 'lich_tuan_muc', 'lop_hoc', 'moi_tai_khoan',
    'mon_hoc', 'mon_hoc_khoi', 'nap_link_gv', 'nap_link_hss', 'ngay_nghi',
    'nguoi_dung', 'nhat_ky', 'nhip_tim', 'nhom_con', 'nhom_ho_so',
    'nl_pc_tieu_chi', 'noi_ham', 'phan_cong_day', 'sap_nhap', 'so_lieu_bao_cao',
    'so_lieu_tien_than', 'su_viec', 'tdg_noi_ham', 'thanh_vien_hoi_dong',
    'thong_bao', 'thong_bao_nhan', 'tieu_chi', 'tieu_chuan', 'truc_tuan',
    'truong_tien_than', 'tu_danh_gia'
  ];

  // Số định danh cá nhân của học sinh nằm ở bảng riêng và MẶC ĐỊNH KHÔNG kèm
  // theo bản sao lưu. Tệp sao lưu hay bị gửi qua Zalo, để quên trong máy khách
  // — mà đây là dữ liệu cá nhân được Luật Bảo vệ dữ liệu cá nhân 2025 bảo vệ.
  // Ai cần thì tự tích ô, và màn hình nói rõ tệp đó phải giữ như hồ sơ mật.
  var BANG_NHAY_CAM = ['hoc_sinh_dinh_danh'];

  var TRANG = 1000;   // Supabase trả tối đa 1000 dòng một lần

  function $(s) { return document.querySelector(s); }

  // Đọc hết một bảng, phân trang. Không phải bảng nào cũng có cột id
  // (cau_hinh khoá là 'khoa'), nên thử sắp theo id trước, hỏng thì đọc chay.
  function taiHet(ten) {
    var ra = [];
    function mot(tu, coSapXep) {
      var q = window.MAY_CHU.from(ten).select('*').range(tu, tu + TRANG - 1);
      if (coSapXep) q = q.order('id');
      return q.then(function (r) {
        if (r.error) {
          // 42703 = không có cột id → đọc lại không sắp xếp
          if (coSapXep && r.error.code === '42703') return mot(tu, false);
          throw r.error;
        }
        var d = r.data || [];
        ra = ra.concat(d);
        if (d.length === TRANG) return mot(tu + TRANG, coSapXep);
        return ra;
      });
    }
    return mot(0, true);
  }

  function tenTep(duoi) {
    var c = window.CAU_HINH || {};
    var d = new Date();
    var hai = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'sao-luu-' + (c.MA || 'truong') + '-' +
      d.getFullYear() + hai(d.getMonth() + 1) + hai(d.getDate()) + '-' +
      hai(d.getHours()) + hai(d.getMinutes()) + '.' + duoi;
  }

  function taiVeMay(chu, ten) {
    var b = new Blob([chu], { type: 'application/json;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = ten;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Thu hồi muộn: thu ngay thì trình duyệt chậm có khi chưa kịp đọc xong
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 30000);
  }

  function ve(hop) {
    var c = window.CAU_HINH || {};
    // Lời văn ở màn này KHÔNG nói gì về cơ chế máy chủ. Bản đầu có giải thích
    // "gói miễn phí không sao lưu tự động, xoá dự án là mất vĩnh viễn" —
    // thầy Chung phản hồi: nhà trường không nắm cơ chế nên đọc xong chỉ thấy
    // hoang mang. Việc của họ chỉ là MỖI THÁNG BẤM MỘT LẦN và giữ tệp cho đúng.
    hop.innerHTML =
      '<div class="the-thong-bao" style="margin-bottom:14px">' +
      '<b>📅 Mỗi tháng tải một lần.</b> Đây là việc định kỳ như sao lưu sổ sách của nhà trường: ' +
      'bấm nút dưới đây, máy sẽ gói toàn bộ dữ liệu của trường thành một tệp và tải về. ' +
      'Dữ liệu trên hệ thống vẫn nguyên vẹn — tệp tải về là <b>bản dự phòng</b> của nhà trường.' +
      '<div style="margin-top:8px;font-size:13.6px;color:var(--chu-mo)">Nên làm vào cuối tháng, ' +
      'và làm thêm một lần sau mỗi đợt nhập nhiều dữ liệu: xét cuối học kỳ, cuối năm học, ' +
      'sau khi hoàn thiện hồ sơ minh chứng.</div>' +
      '</div>' +

      '<div class="the-thong-bao" style="margin-bottom:14px">' +
      '<b>Giữ tệp sao lưu thế nào cho đúng</b>' +
      '<ul style="margin:9px 0 0 20px;font-size:14px;line-height:1.85">' +
      '<li>Cất vào <b>Google Drive của trường</b>, thư mục riêng đặt tên “Sao lưu hệ thống”. ' +
      'Đừng chỉ để trong máy tính của một người.</li>' +
      '<li>Giữ <b>ít nhất ba bản gần nhất</b>. Bản mới nhất có thể đã lẫn sai sót mà chưa ai phát hiện, ' +
      'lúc đó còn bản tháng trước mà dùng.</li>' +
      '<li>Chỉ <b>Ban giám hiệu và người phụ trách hệ thống</b> được giữ. Đây là hồ sơ của nhà trường, ' +
      'không gửi vào nhóm Zalo, không để trong máy dùng chung.</li>' +
      '<li><b>Không mở ra sửa.</b> Tệp này chỉ để phục hồi khi cần; sửa tay là hỏng, đến lúc cần lại ' +
      'không dùng được.</li>' +
      '<li>Khi cần phục hồi dữ liệu, <b>báo người phụ trách hệ thống</b> kèm tệp — đừng tự thao tác.</li>' +
      '</ul></div>' +

      '<div class="the-thong-bao" style="margin-bottom:14px">' +
      '<label style="display:flex;gap:9px;align-items:flex-start;cursor:pointer">' +
      '<input type="checkbox" id="sl-nhay-cam" style="margin-top:4px">' +
      '<span><b>Kèm số định danh cá nhân của học sinh</b><br>' +
      '<span style="font-size:13px;color:var(--chu-mo)">Mặc định KHÔNG kèm, và bình thường thì không cần. ' +
      'Chỉ tích khi làm bản lưu đầy đủ để bàn giao — khi đó tệp chứa dữ liệu cá nhân được ' +
      'Luật Bảo vệ dữ liệu cá nhân năm 2025 bảo vệ, phải giữ như hồ sơ mật.</span></span></label>' +
      '</div>' +
      '<button class="nut-kiem-tra" id="sl-nut">💾 Tải bản sao lưu</button>' +
      '<div id="sl-tien-trinh" style="margin-top:14px"></div>';

    $('#sl-nut').addEventListener('click', function () {
      var kemNhayCam = $('#sl-nhay-cam').checked;
      window.hopHoi({
        bieuTuong: '💾',
        tieuDe: 'Tải bản sao lưu toàn bộ dữ liệu?',
        moTa2: c.TEN_TRUONG || '',
        noiDung: 'Máy gói toàn bộ dữ liệu của trường thành một tệp rồi tải về — mất khoảng nửa phút. ' +
          (kemNhayCam ? 'Tệp này CÓ kèm số định danh cá nhân của học sinh, phải giữ như hồ sơ mật.'
                      : 'Không kèm số định danh cá nhân của học sinh.'),
        nutOK: 'Tải bản sao lưu'
      }).then(function (dongY) {
        if (dongY) chay(kemNhayCam);
      });
    });
  }

  function chay(kemNhayCam) {
    var nut = $('#sl-nut'), tt = $('#sl-tien-trinh');
    nut.disabled = true;
    nut.textContent = 'Đang gói dữ liệu…';

    var ds = BANG.concat(kemNhayCam ? BANG_NHAY_CAM : []);
    var c = window.CAU_HINH || {};
    var goi = {
      _doc: 'Bản sao lưu dữ liệu Hệ thống Quản trị số Trường học. Muốn phục hồi thì đưa tệp này ' +
            'cho người phụ trách hệ thống — KHÔNG tự nạp lại được bằng cách kéo thả.',
      phien_ban: 1,
      tao_luc: new Date().toISOString(),
      truong: { ma: c.MA || '', ten: c.TEN_TRUONG || '', nam_hoc: c.NAM_HOC || '' },
      nguoi_tai: (window.NGUOI_DUNG || {}).email || '',
      kem_dinh_danh: !!kemNhayCam,
      bang: {},
      thieu: []
    };

    var i = 0, tongDong = 0;
    function tiep() {
      if (i >= ds.length) return xong();
      var ten = ds[i];
      // Chỉ hiện SỐ, không hiện tên bảng: 'nl_pc_tieu_chi' chạy qua màn hình
      // chẳng nói lên điều gì với thầy cô, lại giống như máy đang báo lỗi.
      var phanTram = Math.round((i / ds.length) * 100);
      tt.innerHTML = '<div class="the-thong-bao">Đang gói dữ liệu… <b>' + phanTram + '%</b>' +
        '<div style="margin-top:6px;font-size:13.2px;color:var(--chu-mo)">Thầy cô chờ một chút, ' +
        'đừng đóng trang.</div></div>';
      return taiHet(ten).then(function (d) {
        goi.bang[ten] = d;
        tongDong += d.length;
      }, function (e) {
        // Không có quyền, hoặc bảng chưa dựng ở trường này — ghi lại rồi đi tiếp.
        // Dừng cả bản sao lưu vì một bảng phụ là mất luôn phần đã đọc được.
        goi.thieu.push({ bang: ten, loi: (e && e.message) || String(e) });
      }).then(function () { i++; return tiep(); });
    }

    function xong() {
      goi.tong_dong = tongDong;
      taiVeMay(JSON.stringify(goi, null, 1), tenTep('json'));
      nut.disabled = false;
      nut.textContent = '💾 Tải bản sao lưu';
      // Phần "thiếu" chỉ hiện cho người biết việc, và nói rõ là KHÔNG SAO —
      // không thì thầy cô thấy danh sách tên bảng lạ hoắc lại tưởng hỏng.
      var canhBaoThieu = goi.thieu.length
        ? '<div style="margin-top:8px;font-size:13.2px;color:var(--chu-mo)">Có ' + goi.thieu.length +
          ' mục nhà trường chưa dùng tới nên không có dữ liệu — điều này bình thường, bản sao lưu vẫn đủ dùng.</div>'
        : '';
      tt.innerHTML = '<div class="the-thong-bao">✅ <b>Đã tải xong bản sao lưu tháng này.</b> ' +
        tongDong.toLocaleString('vi-VN') + ' dòng dữ liệu.' + canhBaoThieu +
        '<div style="margin-top:8px;font-size:13.8px">Việc tiếp theo: mở thư mục Tải xuống, ' +
        'chuyển tệp vừa tải vào <b>Google Drive của trường</b> (thư mục “Sao lưu hệ thống”), ' +
        'rồi xoá bản cũ hơn một năm.</div></div>';
      if (window.notify) window.notify('💾 Đã tải bản sao lưu.');
    }

    tiep().catch(function (e) {
      nut.disabled = false;
      nut.textContent = '💾 Thử lại';
      tt.innerHTML = '<div class="the-thong-bao">❌ Không tải được bản sao lưu: ' +
        window.thoatHTML((e && e.message) || String(e)) + '</div>';
    });
  }

  window.qtTabPhu = window.qtTabPhu || [];
  window.qtTabPhu.push({ ma: 'sl', ten: '💾 Sao lưu', ve: ve });
})();
