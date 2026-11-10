# CWRM-13 — Bốn user flow để đưa vào FigJam

Đây là **bản vẽ local đã kiểm tra hình ảnh**, chuẩn bị để nhập vào [FigJam CWRM-13](https://www.figma.com/board/AufawHy38HFF2cYXJ0oxZD). Chưa có thay đổi nào được ghi lên FigJam trong phiên này vì công cụ điều khiển trình duyệt báo bị tắt, dù người dùng đã bật quyền trong cài đặt.

| Flow | File SVG | Nội dung |
| --- | --- | --- |
| 01 Direct Assignment | [01-direct-assignment.svg](01-direct-assignment.svg) | Pending Acceptance → Accepted/R hoặc Declined |
| 02 Open Work | [02-open-work.svg](02-open-work.svg) | Eligibility → Request Pending → Approve/Reject → Accepted/R |
| 03 Thực hiện, blocker và risk | [03-execution-risk-ai.svg](03-execution-risk-ai.svg) | Blocker, Risk Engine/evidence, AI cố vấn, Manager can thiệp |
| 04 Review và dependency | [04-review-dependency.svg](04-review-dependency.svg) | Guard của Start/Review, A duyệt hoặc trả lại, mở quyền Start |

Mỗi SVG có PNG cùng tên để xem nhanh. `render_flows.py` là nguồn tạo SVG; khi sửa nội dung, chạy lại `python render_flows.py` rồi tạo lại PNG nếu cần. **Bốn flow này là các sơ đồ nghiệp vụ riêng của sản phẩm CWRM, không phải một Master Flow và không lấy TaskHub làm tên sản phẩm.**

Khi nhập vào FigJam, đặt bốn sơ đồ thành bốn vùng riêng, giữ tên 01–04. Kiểm tra chữ tiếng Việt và các mũi tên sau khi nhập. SVG là bản vẽ vector; mức độ chỉnh sửa từng chữ/đường sau khi nhập phụ thuộc cách Figma xử lý SVG, nên nguồn `render_flows.py` được giữ cùng bản vẽ.

Nguồn nghiệp vụ: Project Scope v0.1 ở thư mục `Hiep/Nguon_du_an/` bên cạnh repo, [tài liệu UX CWRM-13](../CWRM-13-user-flow-wireframes.md), quyết định Kickoff CWRM-8 và schema ứng viên CWRM-15. Điểm cần nhớ: blocker mở chặn Review nhưng không tự kích hoạt R03; Risk High không tự chặn Review; AI không tự sửa task; Done không tự Start successor.
