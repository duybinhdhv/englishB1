/* Cấu hình máy chủ Supabase cho B1 Passport.
   Để trống hai giá trị dưới đây thì website chạy ở chế độ học cá nhân (không cần máy chủ).
   Lấy giá trị tại Supabase → Project Settings → API:
     - supabaseUrl:     "Project URL", dạng https://xxxxxxxx.supabase.co
     - supabaseAnonKey: khóa "anon public" (khóa công khai, được phép để trong mã nguồn)
   TUYỆT ĐỐI KHÔNG dán khóa "service_role" vào đây. */
window.B1_CONFIG = {
  supabaseUrl: "https://kzychjndhdnmhrblabhj.supabase.co",
  supabaseAnonKey: "sb_publishable_VBa9MSy27aWXUhsWlaPoTA_LFIRUY_X"
};
