# CWRM-13 — Bản SVG/PNG local lưu tham khảo

**Nguồn sơ đồ nộp và review hiện tại là [FigJam “User flow”](https://www.figma.com/board/AYGbljSDqFh9YbnGQ5sU8h/User-flow?node-id=0-1) đã gắn trên Jira CWRM-13.** Khôi đã xem trực tiếp bốn luồng trên bảng này và xác nhận khớp nghiệp vụ/API ngày 11/11/2026. Các SVG/PNG dưới đây được tạo trước đó ở máy local; giữ làm tài liệu tham khảo, không nhập thành bảng FigJam thứ hai và không thay thế board đang dùng.

| Flow | File SVG | Nội dung |
| --- | --- | --- |
| 01 Direct Assignment | [01-direct-assignment.svg](01-direct-assignment.svg) | Pending Acceptance → Accepted/R hoặc Declined |
| 02 Open Work | [02-open-work.svg](02-open-work.svg) | Eligibility → Request Pending → Approve/Reject → Accepted/R |
| 03 Thực hiện, blocker và risk | [03-execution-risk-ai.svg](03-execution-risk-ai.svg) | Blocker, Risk Engine/evidence, AI cố vấn, Manager can thiệp |
| 04 Review và dependency | [04-review-dependency.svg](04-review-dependency.svg) | Guard của Start/Review, A duyệt hoặc trả lại, mở quyền Start |

Mỗi SVG có PNG cùng tên để xem nhanh. `render_flows.py` là nguồn tạo SVG. **Bốn flow này là các sơ đồ nghiệp vụ riêng của sản phẩm CWRM, không phải một Master Flow và không lấy TaskHub làm tên sản phẩm.** Nội dung trong bộ ảnh local có thể cũ hơn board được Khôi review.

Nếu cần sửa sơ đồ, sửa trên board “User flow” đang dùng và đối chiếu review Khôi trong [tài liệu UX CWRM-13](../CWRM-13-user-flow-wireframes.md). Không dùng lại các nhãn cũ gán quyền của Manager cho A.

Nguồn nghiệp vụ: Project Scope v0.1 ở thư mục `Hiep/Nguon_du_an/` bên cạnh repo, [tài liệu UX CWRM-13](../CWRM-13-user-flow-wireframes.md), quyết định Kickoff CWRM-8 và schema ứng viên CWRM-15. Điểm cần nhớ: blocker mở chặn Review nhưng không tự kích hoạt R03; Risk High không tự chặn Review; AI không tự sửa task; Done không tự Start successor.
