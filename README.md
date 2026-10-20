# DGT Auto Generate Video AI (v1.5.4 Clone)

Ứng dụng Desktop Windows chuyên dụng cho tự động hóa tạo ảnh AI, chỉnh sửa ảnh tham chiếu, và tạo video AI Veo theo hàng loạt với kiến trúc hàng đợi bất đồng bộ, bộ nhớ cục bộ SQLite, và hệ thống Adapter mở rộng cho nhiều nhà cung cấp AI.

---

## 1. Cấu Trúc Thư Mục Dự Án (Project Architecture)

```
dgt-auto-generate-video-ai/
├── electron/
│   ├── main.ts                   # Tiến trình chính Electron (Window lifecycle, IPC handlers, native dialogs)
│   ├── preload.ts                # Context bridge an toàn (bật contextIsolation, tắt nodeIntegration)
│   └── electron-builder.json     # Cấu hình đóng gói installer Windows x64 (.exe NSIS)
├── server/
│   ├── db/
│   │   └── sqlite.ts             # Lưu trữ cơ sở dữ liệu SQLite cục bộ (dgt_workstation.sqlite via sql.js)
│   ├── providers/
│   │   ├── providerAdapter.ts    # Interface AIProviderAdapter
│   │   ├── geminiProvider.ts     # Adapter chính thức Google Gemini 3.1 & Veo 3.1 (qua @google/genai)
│   │   ├── grokProvider.ts       # Adapter Grok Imagine
│   │   ├── mockProvider.ts       # Bộ sinh dữ liệu thử nghiệm offline (zero-cost validation)
│   │   └── providerRegistry.ts   # Quản lý đăng ký và kiểm tra kết nối các provider
│   └── queue/
│       ├── taskQueue.ts          # Hàng đợi tác vụ bất đồng bộ, kiểm soát luồng đồng thời & retry
│       └── types.ts              # Định nghĩa kiểu dữ liệu tác vụ và hàng đợi
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── TitleBar.tsx      # Desktop header, nút điều khiển cửa sổ, bộ đếm hàng đợi
│   │   │   ├── Sidebar.tsx       # Menu điều hướng chính & trạng thái kết nối
│   │   │   └── QueueDrawer.tsx   # Khay trượt theo dõi tiến độ thời gian thực
│   │   ├── Dashboard/
│   │   │   └── DashboardView.tsx # KPI tổng quan, log hoạt động, thư viện gần đây
│   │   ├── ImageGen/
│   │   │   └── ImageGenView.tsx  # Tạo ảnh prompt & chỉnh sửa ảnh tham chiếu
│   │   ├── VideoGen/
│   │   │   └── VideoGenView.tsx  # Tạo video Veo từ text hoặc ảnh đầu vào
│   │   ├── BatchJobs/
│   │   │   └── BatchJobsView.tsx # Đọc file .txt, ghép ảnh hàng loạt, bảng duyệt trước
│   │   ├── TaskManager/
│   │   │   └── TaskManagerView.tsx # Bảng quản lý chi tiết, lọc trạng thái, retry tác vụ
│   │   ├── History/
│   │   │   └── HistoryGalleryView.tsx # Thư viện sản phẩm, xuất file ZIP
│   │   └── Settings/
│   │       └── SettingsView.tsx  # Đường dẫn lưu, giới hạn worker, test API
│   ├── context/
│   │   └── AppContext.tsx        # Quản trị trạng thái toàn cục & đa ngôn ngữ (VI / EN)
│   ├── utils/
│   │   └── api.ts                # Client API kết nối backend Express
│   ├── App.tsx                   # Khung giao diện chính
│   ├── main.tsx                  # Điểm khởi động React SPA
│   └── index.css                 # Giao diện Dark Workstation & typography
├── data/
│   └── dgt_workstation.sqlite    # File database SQLite lưu trữ tác vụ và log
├── outputs/
│   ├── images/                   # Thư mục lưu ảnh AI kết quả
│   └── videos/                   # Thư mục lưu video AI kết quả
├── server.ts                     # Full-stack backend Express kết hợp Vite middleware
├── package.json
└── tsconfig.json
```

---

## 2. Giải Thích Kiến Trúc Electron + React + Node.js + SQLite

Mô hình phân lớp độc lập, bảo mật và dễ mở rộng:

1. **React UI (Renderer Process)**:
   - Giao diện workstation chuyên nghiệp theo quy chuẩn 60-30-10, phong cách Dark Slate.
   - Hoàn toàn độc lập với phần cứng: không gọi trực tiếp Node.js API hay lộ API key.
   - Giao tiếp với backend qua REST API (`/api/*`) hoặc Electron IPC Bridge (`window.dgtDesktop`).

2. **Electron IPC & Native Bridge**:
   - `preload.ts` sử dụng `contextBridge.exposeInMainWorld` với `contextIsolation: true` và `nodeIntegration: false`.
   - Cung cấp hộp thoại chọn thư mục Windows (`dialog:select-directory`), mở Explorer (`shell:open-path`) và thông báo hệ thống native.

3. **Backend Service & Task Queue (Node.js)**:
   - Quản lý hàng đợi tác vụ FIFO với cơ chế giới hạn số tác vụ đồng thời (Worker Concurrency: 1 - 8 luồng).
   - Tự động bắt lỗi, tính toán số lần thử lại (Auto-retry logic) và ghi nhật ký hoạt động `activity_logs`.
   - Hỗ trợ tạm dừng (Pause), tiếp tục (Resume), hủy (Cancel) tác vụ bất kỳ lúc nào.

4. **Persistence Layer (SQLite)**:
   - Lưu trữ toàn bộ dữ liệu vào file `data/dgt_workstation.sqlite`.
   - Khôi phục trạng thái tác vụ dở dang khi tắt/mở lại ứng dụng (Crash recovery).

5. **AI Provider Adapters**:
   - Kiến trúc module hóa tách biệt từng dịch vụ:
     - **Google DeepMind Adapter**: Hỗ trợ tạo ảnh Gemini 3.1 Flash Image, Nano Banana 2.1 và Veo 3.1 video.
     - **Local Studio Engine (Mock)**: Sinh dữ liệu media hợp lệ để kiểm thử 100% quy trình hàng đợi, batch processing mà không tốn chi phí API hay token.
     - **Grok Imagine Adapter**: Sẵn sàng cấu hình khóa API xAI.

---

## 3. Hướng Dẫn Chạy Từng Bước Trên Windows PowerShell

### Bước 1: Mở Windows PowerShell và chuyển tới thư mục dự án
```powershell
cd C:\path\to\dgt-auto-generate-video-ai
```

### Bước 2: Cài đặt các gói phụ thuộc (Dependencies)
```powershell
npm install
```

### Bước 3: Cấu hình biến môi trường (Tùy chọn)
Tạo file `.env` (hoặc sao chép từ `.env.example`):
```powershell
Copy-Item .env.example .env
```
Nếu có API Key Google AI Studio, thêm vào file `.env`:
```env
GEMINI_API_KEY="AIzaSy..."
```
*(Nếu chưa có API Key, ứng dụng mặc định dùng **Local Studio Engine** để bạn có thể kiểm thử toàn bộ tính năng hoàn toàn miễn phí).*

### Bước 4: Chạy chế độ Phát triển (Development Mode)
Khởi động full-stack server và Vite UI:
```powershell
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

### Bước 5: Chạy dưới dạng ứng dụng Desktop Electron
```powershell
# Chạy đồng thời dev server và Electron wrapper
npx electron .
```

### Bước 6: Đóng gói thành file cài đặt Windows (.exe installer)
Khi đã sẵn sàng phát hành phiên bản Desktop độc lập:
```powershell
# Biên dịch mã nguồn React
npm run build

# Đóng gói bộ cài đặt Windows NSIS x64
npx electron-builder --win --x64
```
File cài đặt hoàn chỉnh sẽ nằm trong thư mục:
`.\release\DGT Auto Generate Video AI Setup 1.5.4.exe`

---

## 4. Kiểm Thử Luồng Hoạt Động (MVP Validation Flow)

1. **Kiểm thử tạo ảnh đơn lẻ**:
   - Vào tab **Tạo Ảnh AI** (AI Image Generator).
   - Chọn tỷ lệ 16:9, bấm **Bắt đầu tạo**.
   - Ảnh được sinh ra, xuất hiện trong khung xem trước và có thể tải về hoặc chuyển sang tab Video.

2. **Kiểm thử tạo video Veo**:
   - Vào tab **Tạo Video AI** (AI Video Generator).
   - Nhập prompt miêu tả chuyển động hoặc đính kèm ảnh bắt đầu, bấm **Start Veo Video Generation**.
   - Trình phát video hiển thị kết quả và cho phép tải file.

3. **Kiểm thử xử lý hàng loạt (Batch Processing)**:
   - Vào tab **Xử Lý Hàng Loạt** (Batch Processing).
   - Nhập danh sách prompt hoặc tải file `.txt`.
   - Xem và chỉnh sửa trực tiếp trên bảng **Pre-Run Execution Table**.
   - Bấm **Enqueue Batch**: Hàng loạt tác vụ sẽ được đẩy vào hàng đợi và xử lý song song theo giới hạn worker.

4. **Kiểm tra nhật ký & xuất file**:
   - Xem trạng thái tác vụ trong tab **Quản Lý Tác Vụ** (Task Manager).
   - Vào **Lịch Sử & Bộ Sưu Tập** (History), bấm **Tải tất cả (ZIP)** để tải về toàn bộ sản phẩm đã tạo.
