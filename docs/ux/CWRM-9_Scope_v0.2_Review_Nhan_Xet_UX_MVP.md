# Đánh giá UX/MVP cho Scope v0.2 — Phản hồi của Frontend (CWRM-9)

| Thuộc tính | Nội dung |
|---|---|
| **Mã công việc** | [CWRM-9](https://ddinhbao05.atlassian.net/browse/CWRM-9) (WP-002) — Đối chiếu Scope v0.1 → v0.2 và Change Log |
| **Người nhận xét** | Đặng Văn Hiệp (Frontend Engineer / UX Reviewer) |
| **Đối tượng đánh giá** | Đề xuất Scope v0.2 do Lê Đình Bảo (Project Manager) chủ trì |
| **Ngày lập nhận xét** | 12/11/2026 |
| **Căn cứ đối chiếu gốc** | `00_Project_Scope_v0.1_ORIGINAL_UNCHANGED.md` (Scope v0.1 đã duyệt ngày 11/10/2026) |
| **Tài liệu phối hợp** | `01_Master_Execution_Plan_Full.md` (WP-002), `docs/CWRM-11_Hiep_Response.md`, `docs/ux/CWRM-13-user-flow-wireframes.md`, `docs/ux/CWRM-web-product-and-interface-master-plan.md` |

---

## 1. Tuyên bố về nguồn tài liệu và phương pháp đánh giá

> [!IMPORTANT]
> **Tuyên bố về quyền truy cập tài liệu:**
> Trong trường hợp tài liệu Google Docs trực tuyến về Scope v0.2 của Nhóm trưởng yêu cầu xác thực hoặc từ chối truy cập (302 redirect đăng nhập hoặc 403 Forbidden), kỹ sư Frontend **chưa đọc được toàn văn trực tiếp từ liên kết Google Docs**.
> Bản nhận xét chuyên môn này được xây dựng dựa trên:
> 1. Toàn văn bản **Scope v0.1 gốc đã duyệt** (`Hiep/Nguon_du_an/00_Project_Scope_v0.1_ORIGINAL_UNCHANGED.md`).
> 2. Mô tả gói việc WP-002, tiêu chí hoàn thành và phạm vi S01–S12 trong **Master Execution Plan** (`01_Master_Execution_Plan_Full.md`).
> 3. Báo cáo hiện trạng dự án ngày 09/11/2026 (`02_Project_Current_State_09-11-2026.md`).
> 4. Kế hoạch tổng thể thiết kế web CWRM và kết quả prototype Wireframe Figma CWRM-13 (`docs/ux/`).

---

## 2. Nhận xét chi tiết 7 khía cạnh UX / Nghiệp vụ cốt lõi

### 2.1. Hai quyền hệ thống Manager / Member ở cấp Workspace (Scope v0.1: Mục 6.1, 6.2, 6.3, S01)
- **Quy tắc gốc:** Scope v0.1 phân quyền rành mạch ở cấp độ Workspace. Một tài khoản có thể là `Manager` ở workspace này và `Member` ở workspace khác. Đặc biệt, phân biệt triệt để 3 khái niệm:
  1. *Quyền hệ thống trong Workspace:* `Manager` (điều phối, tạo việc, duyệt, can thiệp) và `Member` (thực hiện, nhận việc, báo tiến độ).
  2. *Role chuyên môn / Skill:* Danh mục nhãn (Designer, Content, Figma, Writing...) dùng làm điều kiện lọc Open Work; không cấp quyền quản trị.
  3. *Vai trò RACI trong từng Task:* R (thực hiện), A (chịu trách nhiệm cuối cùng), C (tham vấn), I (thông báo).
- **Góp ý UX:** Giao diện người dùng không được gán cứng "vai trò toàn cục" hay hiển thị cả hai khối menu "Giao diện Manager" và "Giao diện Member" cùng lúc (như chẩn đoán ở `role-based-redesign-plan.md`). Khi người dùng đăng nhập và chọn Workspace, hệ thống phải tự xác định quyền trong Workspace đó:
  - Nếu là **Member**: Điểm bắt đầu mặc định là `/my-work` ("Việc của tôi"), sidebar chỉ hiển thị việc cá nhân, Open Work và việc nhóm. Ẩn toàn bộ nút tạo task, cấu hình team và dashboard quản lý.
  - Nếu là **Manager**: Điểm bắt đầu là `/manager` ("Tổng quan điều phối").
  - Khi Manager đồng thời được phân công làm R trên một task cụ thể: Thao tác cập nhật tiến độ chỉ xuất hiện khi phân công đã ở trạng thái `Accepted`.
- **Đánh giá Scope v0.2:** Đề xuất v0.2 cần giữ vững cấu trúc phân quyền theo Workspace, **không tạo thêm đối tượng Project trung gian** (Project hierarchy) hay phân cấp phòng ban đa tầng, tránh làm tăng đột biến độ phức tạp của RBAC và routing trong 5 tuần triển khai.

### 2.2. Hai luồng Direct Assignment và Open Work (Scope v0.1: Mục S04, S05, 8.1, 8.2)
- **Quy tắc gốc:**
  - *Direct Assignment:* Manager chỉ định trực tiếp Member trong team; đề nghị ở trạng thái `Pending Acceptance`. Member có quyền `Accepted` hoặc `Declined` (Decline bắt buộc lý do). Accepted tạo trách nhiệm R, nhưng **không tự bắt đầu task**.
  - *Open Work:* Task mở có `requiredPeople` (số người cần) và điều kiện `Role/Skill`. Member đủ điều kiện gửi `Pending` request. Member có quyền rút (`Withdrawn`) khi đang Pending. Manager duyệt khi còn chỗ trống: `Approved` tạo ngay phân công `Accepted` và sinh R (không yêu cầu Member phải Accept lần 2 vì Member đã chủ động xin nhận việc); `Rejected` bắt buộc nhập lý do.
- **Góp ý UX:**
  - Màn hình Open Work (`/open-work`) phải hiển thị số chỗ còn lại theo công thức:
    $$\text{remainingSlots} = \max(0, \text{requiredPeople} - \text{reservedPeople})$$
    và giải thích rõ ràng điều kiện thiếu (`missingRoleIds`, `missingSkillIds`) nếu Member chưa đủ tiêu chuẩn.
  - Khi Member đã gửi request, thẻ việc phải chuyển trạng thái `Pending` và cung cấp nút **"Rút request (Withdrawn)"**.
- **Đánh giá Scope v0.2:** Giữ đúng nguyên tắc: Task được chọn hình thức Direct hoặc Open lúc khởi tạo; không cho phép chuyển đổi hình thức khi đã có request/assignment phát sinh. Không đưa cơ chế đấu thầu, chấm điểm năng lực tự động hay thuật toán matching AI vào v0.2.

### 2.3. Hỗ trợ nhiều người thực hiện (Multiple R) trên một Task (Scope v0.1: Mục S06, CWRM-11)
- **Quy tắc gốc:** Đúng một A (Manager thuộc team), nhưng cho phép một hoặc nhiều R xuất phát từ các phân công đã `Accepted`. R không được gán thủ công để vượt qua quy trình chấp nhận/phê duyệt.
- **Góp ý UX:**
  - Bảng danh sách công việc và chi tiết task phải hiển thị mảng `responsibleUserIds: string[]` (dưới dạng danh sách chip tên người kèm `+N` khi có nhiều R).
  - Tránh nhầm lẫn UX: Các R cùng cập nhật một tiến độ chung của task, **không có progress riêng theo từng người** rồi tính trung bình cộng (tránh gây tranh cãi về mặt dữ liệu và làm phức tạp giao diện).
- **Đánh giá Scope v0.2:** Bảo toàn nguyên tắc đúng 1 A và $\ge 1$ R. Tuyệt đối không hỗ trợ nhiều A vì sẽ phá vỡ nguyên lý giải trình trách nhiệm duy nhất (Single Accountability) của mô hình RACI.

### 2.4. Phân biệt triệt để Task Status và Assignment / Request Status (Scope v0.1: Mục 5.5, 5.6, S07)
- **Quy tắc gốc:**
  - `Task Status`: `To Do`, `In Progress`, `Blocked`, `Review`, `Done`.
  - `Assignment Status`: `Pending Acceptance`, `Accepted`, `Declined`.
  - `Request Status`: `Pending`, `Approved`, `Rejected`, `Withdrawn`.
  - `Accepted` **không phải là Task Status**. Khi phân công được Accepted, task vẫn ở trạng thái `To Do`.
- **Góp ý UX:**
  - Trên giao diện Bảng (`/tasks`), Chi tiết (`/tasks/[id]`), và Việc của tôi (`/my-work`), phải thiết kế hai badge/cột hoàn toàn độc lập cho Task Status và Assignment Status.
  - Không bao giờ gộp nhãn trạng thái thành "Đã nhận việc - Đang làm" hay hiển thị `Accepted` thay thế cho `To Do`.
- **Đánh giá Scope v0.2:** Đảm bảo toàn bộ sơ đồ cơ sở dữ liệu (ERD) và OpenAPI contract tách riêng các trường `task.status`, `assignment.status`, `request.status`. Không thỏa hiệp gộp enum.

### 2.5. Luồng Review và Trả lại kết quả có lý do và tiến độ mới (Scope v0.1: Mục S06, S07, 8.1)
- **Quy tắc gốc:**
  - Member (R) chỉ được gửi nghiệm thu (`In Progress` $\rightarrow$ `Review`) khi: (1) `progress === 100`, và (2) `openBlockers === 0`.
  - Tiến độ 100% không tự biến task thành `Done`.
  - Người có thẩm quyền nghiệm thu là A của task:
    * Chấp thuận $\rightarrow$ Task chuyển sang `Done`.
    * Trả lại $\rightarrow$ Task quay về `In Progress`, **bắt buộc nhập lý do trả lại** và **bắt buộc đặt lại tiến độ mới từ 0 đến 99%** do A nhập (tránh hiển thị 100% khi công việc chưa đạt yêu cầu nghiệm thu).
- **Góp ý UX:** Màn hình Review (`/review` và modal nghiệm thu) phải thiết kế form từ chối gồm: Ô văn bản nhập lý do (textarea required) và trường nhập tiến độ mới (input number min=0, max=99). Phía Member sẽ thấy cảnh báo "Bị trả lại từ A kèm lý do: ..." để tiếp tục thực hiện.
- **Đánh giá Scope v0.2:** Giữ vững ràng buộc tiến độ 0–99% khi trả lại kết quả; không cho phép task ở trạng thái `Review` mà tự động hoàn thành theo thời gian trôi.

### 2.6. Ràng buộc Dependency Finish-to-Start (Kịch bản Marketing: Poster $\rightarrow$ Ads) (Scope v0.1: Mục S09, 15.1)
- **Quy tắc gốc:** Trong kịch bản Marketing, Task "Chạy quảng cáo Ads" phụ thuộc Task "Thiết kế poster". Quan hệ là Finish-to-Start cùng team: Task Ads chỉ được phép bắt đầu (`Start`) khi Task Poster đã ở trạng thái `Done`.
- **Góp ý UX:**
  - Khi Task Poster chưa `Done`, task Ads vẫn ở `To Do`, nút "Start" bị khóa (disabled) kèm nhãn "Start bị khóa — Chờ TASK-103 Done".
  - **Không tự tạo blocker giả:** Task tiền nhiệm chưa xong là một điều kiện chờ bắt đầu (dependency constraint), không được tự ý gán task sau thành `Blocked`. Trạng thái `Blocked` chỉ dành riêng cho việc R chủ động báo blocker trong quá trình thực hiện.
- **Đánh giá Scope v0.2:** Chỉ giữ quan hệ Finish-to-Start cơ bản. Loại trừ mọi hình thức phụ thuộc phức tạp (Start-to-Start, Finish-to-Finish, Lead/Lag time) và không xây dựng Gantt chart tương tác đa cấp ở MVP.

### 2.7. Cơ chế Risk Engine, Evidence minh bạch và Cố vấn AI (Scope v0.1: Mục S10, S12, mục 10, CWRM-15)
- **Quy tắc gốc:**
  - Risk Engine vận hành độc lập bằng bộ quy tắc xác định: Mức rủi ro `Low`, `Medium`, `High` và tập hợp Evidence tương ứng được tính toán hoàn toàn từ dữ liệu công việc.
  - **Manager không nhập hoặc chỉnh sửa Risk Score**. AI cũng không tự tính hoặc sửa Risk Score.
  - **Cố vấn AI (Advisory only):** Chỉ kích hoạt khi Manager bấm yêu cầu giải thích cho các snapshot mức `Medium` hoặc `High`. AI cung cấp phân tích nguyên nhân gắn liền với Evidence ID và đề xuất 2–3 phương án xử lý.
  - AI không tự động ra quyết định hay tự ý thay đổi dữ liệu task. Quyết định xử lý cuối cùng thuộc về Manager (gia hạn, bổ sung người, giải quyết blocker), có lưu audit log và lý do, sau đó hệ thống sẽ đánh giá lại Risk.
  - Khi dịch vụ AI gặp sự cố (502/503), người dùng vẫn phải xem được toàn bộ Risk Level và Evidence của task.
- **Góp ý UX:** Màn hình `/risk` cần hiển thị bảng Evidence chi tiết (7 evidence trong POC R01–R03), cờ độ mới dữ liệu `isCurrent`, và khung phản hồi AI riêng biệt với nút "Thử lại" khi lỗi.
- **Đánh giá Scope v0.2:** Tiếp tục duy trì đầy đủ lộ trình 12 quy tắc risk (R01–R12) của Scope v0.1. POC CWRM-15 là bước kiểm chứng R01–R03, không được tự ý cắt giảm R04–R12 khỏi phạm vi nghiệm thu cuối của đồ án nếu không có sự phê duyệt chính thức bằng Change Request.

---

## 3. Bảng phân định rõ ràng giữa Scope v0.1 đã duyệt và đề xuất mở rộng v0.2

| Hạng mục chức năng | Scope v0.1 (Đã duyệt 11/10/2026) | Đề xuất mở rộng trong thảo luận v0.2 | Nhận xét và khuyến nghị từ góc độ Frontend / UX |
|---|---|---|---|
| **Xác thực tài khoản** | Đăng ký / đăng nhập email + mật khẩu nội bộ đơn giản; seed sẵn tài khoản demo (S01). | Đề xuất bổ sung **Google Sign-In (OAuth 2.0)**. | **CẢNH BÁO:** Làm tăng khối lượng tích hợp xác thực, quản lý token client-server, xử lý tài khoản trùng lặp và cấu hình Google Cloud Console. Ước tính thêm 16–20 giờ công. Khuyến nghị chỉ làm nếu đã hoàn thành toàn bộ vòng nghiệp vụ cốt lõi. |
| **Trao đổi & Cộng tác** | Trao đổi qua bình luận văn bản đơn giản gắn với từng task (S08). | Đề xuất **trao đổi thời gian thực, @mention, đính kèm file, ảnh, video, vùng tra cứu media**. | **VƯỢT PHẠM VI MVP:** Scope v0.1 mục 12.2 đã loại trừ chat realtime và kho tệp. Nếu đưa vào sẽ phát sinh lưu trữ S3/MinIO, WebSocket, kiểm soát dung lượng và format, gây rủi ro trễ hạn Sprint. Khuyến nghị giữ comment văn bản thuần túy. |
| **Cấu trúc tổ chức** | Cấu trúc 3 cấp: Workspace $\rightarrow$ Team $\rightarrow$ Task/Milestone (Mục 6.1). | Một số thảo luận đề xuất thêm cấp **Project** (Workspace $\rightarrow$ Project $\rightarrow$ Team $\rightarrow$ Task). | **KHÔNG NÊN:** Thêm cấp Project sẽ làm rối loạn mô hình RBAC, khiến người dùng phải qua quá nhiều tầng điều hướng để tới được task. Mô hình Workspace + Team là tối ưu cho MVP 5 tuần. |
| **Bộ quy tắc rủi ro** | Đầy đủ 12 quy tắc R01–R12 kèm điều kiện nâng mức (Mục 10). | POC Sprint 1 triển khai trước R01–R03. | **ĐỒNG Ý CÁCH LÀM:** Triển khai POC R01–R03 trong Sprint 1 là đúng đắn để chốt hợp đồng dữ liệu; nhưng tài liệu Scope v0.2 phải tái khẳng định R04–R12 là cam kết nghiệm thu cuối của đồ án, không được âm thầm cắt bỏ. |
| **Chế độ xem công việc** | Danh sách (List view) là chủ đạo; lọc theo Team, Status, Risk, Deadline (S11). | Bổ sung giao diện Bảng (Kanban Board). | **CHẤP NHẬN ĐƯỢC:** Kanban Board chỉ đóng vai trò là một chế độ xem bổ trợ (Alternative View) cho Task Status (`To Do`, `In Progress`, `Blocked`, `Review`, `Done`), không sinh ra workflow mới. Không trộn lẫn trạng thái nhận việc vào cột board. |

---

## 4. Kiến nghị hành động cho Project Manager (Lê Đình Bảo)

1. **Khóa Baseline chính thức qua Change Request:** Nếu muốn đưa Google Sign-In hoặc chức năng mở rộng nào vào Scope v0.2, PM cần lập **Change Request (CR-01)** chính thức, nêu rõ tác động đến quỹ thời gian (hiện đang là 246 giờ / 5 tuần cho 4 người) và phải thu thập đủ chữ ký đồng thuận của cả 4 thành viên (Bảo, Khôi, Hiệp, Ban).
2. **Bảo toàn 16 mục MVP và AC01–AC14:** Scope v0.2 không được làm suy giảm 16 mục chức năng cốt lõi và 14 tiêu chí nghiệm thu đã cam kết với môn học tại Scope v0.1.
3. **Cung cấp quyền truy cập tài liệu công khai:** Đề nghị PM mở quyền truy cập đọc (View/Comment) cho các liên kết Google Docs / Google Sheets dự án để toàn đội ngũ kỹ thuật có thể đối chiếu trực tiếp mà không gặp lỗi 403/302.
