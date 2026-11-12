# CWRM-13 · Bản vẽ thay thế Figma v2

Ngày tạo: 12/11/2026. Đây là **tài liệu tương đương wireframe**, được dựng từ Scope v0.1, CWRM-8, review Bảo/Khôi trên CWRM-13, contract CWRM-11 0.2.0-draft và fixture CWRM-15. Bộ này không sao chép TaskHub; Marketing chỉ là kịch bản demo của nhóm.

## File bàn giao

- 4 user flow: `FLOW-01` Direct Assignment, `FLOW-02` Open Work, `FLOW-03` thực hiện–blocker–risk/AI, `FLOW-04` Review–dependency.
- 8 wireframe: `SC-00`, `SC-01`, `SC-02`, `SC-02b`, `SC-03`, `SC-04`, `SC-05`, `SC-06`.
- Mỗi hình có `.png` để xem/dán nhanh và `.svg` để giữ chất lượng khi phóng to. File nguồn: `../render_cwrm13_v2.py`; chạy `python -X utf8 ../render_cwrm13_v2.py` từ thư mục này để tạo lại toàn bộ.

## Cách đưa lên Figma

1. Tạo một trang/section tên **CWRM-13 v2 · bản thay thế** trong file đang dùng.
2. Kéo từng file `.png` hoặc `.svg` vào theo thứ tự `FLOW-01…04`, rồi `SC-00…06`. Để các luồng và màn hình ở hai khu riêng, ghi nhãn rõ phiên bản v2.
3. Gắn link **đúng trang/section v2** lên CWRM-13 và nhờ Bảo, Khôi xem lại. Không xóa bản cũ trước khi nhóm xác nhận.

PNG là ảnh phẳng: Figma không sửa riêng ô, chữ, dây nối trong ảnh. SVG giữ nét và có thể tách thành các vector tùy cách Figma nhập, nhưng cũng không tự tạo lại connector/user flow có ngữ nghĩa. Vì vậy file nguồn Python là bản có thể sửa/đồng bộ; ảnh là bản trình bày. Acceptance Criteria của CWRM-13 cho phép **“Figma hoặc tài liệu tương đương”**, nhưng quyết định nghiệm thu cuối thuộc Bảo/Khôi sau khi thấy link mới.

## Nội dung đã đối chiếu

| Nhận xét | Vị trí trong bản v2 |
| --- | --- |
| Manager/Member; P01 Manager, P02/P03 cùng quyền Member | SC-00 và bốn flow |
| Direct Decline có lý do; Manager đóng Pending/kết thúc phân công có lý do | FLOW-01, SC-02b, SC-03 |
| Open Work: role/skill, số chỗ, Pending/Rút, Manager kiểm tra lại và Reject có lý do | FLOW-02, SC-02b, SC-04 |
| R là người Accepted, không phải role; nhiều R và từng request/assignment | SC-01, SC-02b |
| Dashboard chỉ can thiệp Medium/High, thêm hàng chờ Review của A | SC-01 |
| R Start, progress/effort, blocker, kết quả Review văn bản hoặc liên kết | SC-03, FLOW-03/04 |
| A xem kết quả; Duyệt Done hoặc Trả lại có lý do + progress 0–99 | SC-06, FLOW-04 |
| Task Status khác Assignment/Request Status; Done chỉ mở quyền Start successor | FLOW-01/02/04, SC-02b/06 |
| Risk khi Blocked, base/final level, 7 evidence, evaluatedAt, isCurrent | FLOW-03, SC-05 |
| AI summary, linkedEvidenceIds, phương án action/rationale/caveat và fallback khi lỗi | SC-05, FLOW-03 |
| Demo nhất quán: Campaign Launch → Poster Done → Chạy quảng cáo được Start | SC-02/04/05/06 và FLOW-04 |

**Giới hạn:** Các tên người và phương án AI trong ảnh là dữ liệu minh họa UI, không phải dữ liệu API thật hay kết quả POC Gemini của Ban. `ev-01…ev-07`, R03, 40 giờ, progress 30%, base MEDIUM, final HIGH và deadline `2026-11-11T19:00:00Z` dựa trên fixture CWRM-15. UI không được biến một gợi ý AI thành quyết định tự động.

## Nguồn

- [Jira CWRM-13](https://ddinhbao05.atlassian.net/browse/CWRM-13) · review Bảo/Khôi ngày 11–12/11/2026.
- [Jira CWRM-11](https://ddinhbao05.atlassian.net/browse/CWRM-11) · thông báo contract 0.2.0-draft.
- [Jira CWRM-15](https://ddinhbao05.atlassian.net/browse/CWRM-15) · rule, evidence, fixture.
- [CWRM-8 Kickoff](https://docs.google.com/document/d/1mNKk38bycddrkdxbUW1pRg9260EuARXJQplcFERHCp4/edit) · personas và kịch bản demo.
