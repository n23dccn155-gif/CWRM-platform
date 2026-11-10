# CWRM Platform

> **Collaborative Work Coordination and Risk Management Platform**  
> *Nền tảng điều phối công việc và quản trị rủi ro đa lĩnh vực dựa trên phân công trách nhiệm.*

---

## 📖 1. Giới Thiệu Dự Án

**CWRM Platform** là sản phẩm phần mềm thực tế thuộc đồ án môn học **Quản lý Dự án Phần mềm** (Học kỳ 7). Hệ thống được thiết kế nhằm giải quyết bài toán phân định trách nhiệm, theo dõi tiến độ và phát hiện sớm rủi ro trong quá trình phối hợp công việc giữa các đội ngũ đa lĩnh vực (Phần mềm, Marketing, Vận hành, Nhóm dự án).

### Điểm nổi bật cốt lõi:
* **Mô hình RACI nghiêm ngặt:** Mỗi công việc luôn có duy nhất **01 Accountable (A)** chịu trách nhiệm cuối cùng và phê duyệt; quyền **Responsible (R)** được sinh ra tự động khi thành viên chính thức chấp nhận việc.
* **Kênh nhận việc linh hoạt:** Kết hợp song song giữa **Giao việc trực tiếp (Direct Assignment)** và **Chợ việc tự do (Open Work)** có bộ lọc đáp ứng vai trò/kỹ năng (*Role/Skill Eligibility*).
* **Quản trị tắc nghẽn (Blocker):** Theo dõi chặt chẽ các trở ngại khách quan và ràng buộc thứ tự công việc (*Finish-to-Start Dependency*).
* **Động cơ rủi ro xác định (Rule-based Risk Engine):** Phân loại rủi ro (*Low / Medium / High*) theo rule và lưu evidence đối chiếu được. Bộ R01–R03 của Sprint 1 hiện là schema ứng viên; blocker mở là trạng thái công việc và chưa tự kích hoạt rule rủi ro trong POC này.
* **Cố vấn AI (Human-in-the-Loop):** AI phân tích nguyên nhân gốc rễ và đề xuất phương án xử lý; quyết định can thiệp hoàn toàn do Quản lý thực hiện và lưu lại nhật ký kiểm toán (*Audit Log*).

---

## 🎯 2. Repository Này Dùng Để Làm Gì?

Repository này là **kho lưu trữ mã nguồn chính thức (Monorepo)** của nhóm dự án CWRM, bao gồm:
* `frontend/`: Giao diện người dùng Web Client xây dựng bằng **Next.js (App Router), TypeScript và Tailwind CSS**.
* `backend/`: Dự kiến dành cho API máy chủ; kiến trúc, framework và cơ sở dữ liệu chờ Khôi chốt trong CWRM-11.
* `docs/`: Dự kiến dành cho kiến trúc, API contract, ERD và tài liệu kỹ thuật của nhóm.

---

## 👥 3. Thành Viên Nhóm Dự Án

Dự án được thực hiện bởi nhóm 4 sinh viên:

| Họ và Tên | Vai Trò Chính | Trách Nhiệm Chuyên Môn |
|---|---|---|
| **Lê Đình Bảo** | **Project Manager (PM) / BA Lead** | Điều phối tiến độ, quản lý Backlog trên Jira, đặc tả yêu cầu nghiệp vụ và chủ biên hồ sơ dự án. |
| **Trần Minh Khôi** | **Tech Lead / Backend Engineer** | Thiết kế kiến trúc hệ thống, xây dựng cơ sở dữ liệu (PostgreSQL), phát triển REST API và hạ tầng. |
| **Đặng Văn Hiệp** | **Frontend Lead / UI/UX Designer** | Thiết kế User Flow, Wireframe (Figma), xây dựng giao diện Web Client (Next.js) và kịch bản demo. |
| **Lê Quốc Ban** | **Risk Engine & AI Lead / QA** | Phát triển thuật toán đánh giá rủi ro (Risk Engine R01–R12), tích hợp API AI server-side và kiểm thử chất lượng. |

---

## 🚀 4. Hướng Dẫn Chạy Nhanh (Frontend)

### Yêu cầu môi trường:
* **Node.js:** phiên bản `20.9.0` trở lên.
* **Trình quản lý gói:** `npm`.

### Các bước cài đặt:
```bash
# 1. Đi vào thư mục giao diện
cd frontend

# 2. Cài đặt thư viện
npm install

# 3. Khởi chạy máy chủ phát triển
npm run dev
```

* Ứng dụng sẽ hoạt động tại: **`http://localhost:3000`**
* Kiểm tra chất lượng mã nguồn & Build:
  ```bash
  npm run lint
  npm run build
  ```

---

## 🔗 5. Liên Kết Quản Trị & Thiết Kế

* **Bảng công việc Jira:** [CWRM Scrum Board #34](https://ddinhbao05.atlassian.net/jira/software/projects/CWRM/boards/34/backlog)
* **Sơ đồ User Flow (FigJam):** [FigJam CWRM — 4 luồng chi tiết bản nháp](https://www.figma.com/board/AufawHy38HFF2cYXJ0oxZD)
* **Bản vẽ Wireframe (Figma):** [Figma Design — 6 màn ban đầu, SC-02b đang chỉnh](https://www.figma.com/design/qXIOGnqtzXJyJB4Tv4GYFQ)
* **Nguồn flow và wireframe local để review:** [CWRM-13](docs/ux/CWRM-13-user-flow-wireframes.md) — SC-06 còn cần đồng bộ vào Figma.
* **Frontend local:** Có trang `/review` cho nghiệm thu và dependency, bên cạnh các màn Manager/Member. Đây là UI mock, chưa nối API CWRM-11.

---

## 🌿 6. Quy Ước Nhánh & Commit (Git Workflow)

* **Đặt tên nhánh:** `feature/CWRM-<ticket_id>-<tên_ngắn_gọn>` (ví dụ: `feature/CWRM-14-nextjs-ui-skeleton`).
* **Quy tắc Commit:** `<type>(CWRM-<id>): <nội dung>` (ví dụ: `feat(CWRM-14): setup nextjs layout and mock data`).
* **Đóng góp mã nguồn:** Tạo Pull Request vào nhánh `main` và cần ít nhất 01 thành viên duyệt trước khi merge.
