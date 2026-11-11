# CWRM-17 — Test Plan và test cases ban đầu

**Trạng thái:** bản nháp 10/11/2026; chưa phải kết quả kiểm thử.

**Nguồn:** Scope v0.1 (S01–S12, AC01–AC14), Foundation, Jira CWRM-17, rubric môn học.
**Người điều phối QA:** Lê Quốc Ban. Owner từng tính năng chuẩn bị dữ liệu/sửa lỗi; người khác review ca kiểm thử và bằng chứng.

## 1. Mục tiêu và phạm vi

Xác minh vòng nghiệp vụ Manager tạo task → Direct Assignment hoặc Open Work → Member nhận việc → thực hiện, báo blocker → Risk Engine tạo level/evidence → AI giải thích → Manager xử lý → review/Done. Ưu tiên quyền truy cập, tính nhất quán task/assignment status, một A, R từ assignment Accepted, dependency, risk và fallback AI. Không thử các tính năng ngoài MVP như chatbot tổng quát, email hay ML dự báo.

## 2. Loại kiểm thử và môi trường

- **Unit:** rule risk, permission guard, capacity, chuyển trạng thái, kiểm tra dependency vòng, parse/validate AI response. Dùng clock cố định và fixture tách biệt.
- **Integration/API:** DB migration/seed, auth và phân quyền API, transaction duyệt Open Work đồng thời, snapshot/alert/audit khi dữ liệu đổi, AI timeout/quota/error.
- **E2E/UAT:** hai persona actor Manager/Member và ba persona sử dụng; chạy kịch bản Marketing trên bản demo, thêm dữ liệu nhóm sinh viên. Người UAT ghi kết quả thực, ngày, môi trường và lỗi; không điền pass trước khi chạy.
- **Security:** workspace/team isolation, API key chỉ ở server, input không được biến thành lệnh cho AI, không gửi dữ liệu cá nhân/bí mật không cần thiết.
- **Môi trường đề xuất:** local hoặc staging có PostgreSQL riêng, seed xác định, tài khoản Manager/Member thử nghiệm, trình duyệt desktop, AI API thật cho ít nhất một ca được kiểm soát chi phí. Ghi URL/commit/version/ruleVersion và cấu hình máy khi chạy; hiện chưa có các giá trị này.

## 3. Điều kiện vào, ra và bằng chứng

**Vào test:** scope/AC có phiên bản, ERD/API contract được review, build chạy lại được, migration/seed thành công, test data và tài khoản đúng quyền, secrets ở server. Ca nào thiếu điều kiện thì `Blocked`, ghi lý do; không tự coi `Pass`.

**Ra test nội bộ:** AC liên quan có kết quả và minh chứng; lỗi Sev1/Sev2 chặn release được sửa và retest; regression cốt lõi xanh. **UAT/G5:** mục tiêu pass rate ≥95%, không còn Sev1/2 mở, có biên bản người thử và runbook được kiểm tra thực tế. Đây là ngưỡng mục tiêu theo rubric, chưa phải kết quả đạt được.

Mỗi execution record cần: case ID, AC/Sxx, build/commit, môi trường, dữ liệu, thời điểm, người chạy, expected, actual, Pass/Fail/Blocked, Jira bug và link ảnh/log. Dùng bảng test case cùng một nơi; Jira Bug giữ lỗi và trace về case.

## 4. Test cases ban đầu

| ID | Yêu cầu | Tình huống và bước chính | Kỳ vọng | Loại |
| --- | --- | --- | --- | --- |
| TC-01 | S04, AC02 | Manager Direct assign; Member chưa phản hồi | Assignment Pending; không có R Accepted; task vẫn To Do | API/E2E |
| TC-02 | S04, AC02 | Member Accept rồi thử bắt đầu khi predecessor chưa Done | R tạo đúng; Accept không tự In Progress; bắt đầu bị chặn do dependency | API/E2E |
| TC-03 | S05, AC03 | Member đủ role/skill request Open Work; Manager Approve | Request Pending không tạo R; chỉ Approve tạo Accepted/R, không vượt số chỗ | API/E2E |
| TC-04 | S05, AC03 | Hai request cùng được duyệt khi còn một chỗ | Chỉ một giao dịch thành công; không oversubscribe | Integration |
| TC-05 | S06, AC04 | Tạo/sửa task và gỡ A hoặc R cuối | Luôn đúng một A; từ chối thao tác khiến task đang cần R bị mất R | Unit/API |
| TC-06 | S07, AC05 | Member đặt progress 100 rồi gửi Review; A trả lại | 100 không tự Done; A có quyền return, task về In Progress với nhận xét | API/E2E |
| TC-07 | S08, AC06 | Tạo hai blocker, giải quyết một | Task vẫn Blocked; chỉ hết Blocked khi blocker cuối được giải quyết | API/E2E |
| TC-08 | S09, AC07 | Tạo A→B→C rồi thử C→A | Từ chối vòng; successor chưa bắt đầu trước predecessor Done | Unit/API |
| TC-09 | S10, AC08 | Dùng ca P01–P12 trong `CWRM-15_Risk_Rules_POC.md` | Đúng level, rule IDs, evidence, timestamp, biên 0/24/48 giờ | Unit |
| TC-10 | S11, AC09 | Risk High rồi Manager sửa dữ liệu làm Low | Snapshot mới, alert cập nhật/resolve, không nhân đôi; giữ lịch sử | Integration/E2E |
| TC-11 | S12, AC10 | Gọi AI thật với snapshot xác định | Giải thích dựa evidence, 2–3 lựa chọn; model/provider và latency ghi lại | Integration |
| TC-12 | S12, AC11 | AI timeout/quota/error | Risk/evidence vẫn xem được; lỗi rõ; không thay task/risk; có thể thử lại | Integration/E2E |
| TC-13 | S12, AC12 | Manager chọn hành động hợp lệ và ghi lý do | Có audit, risk re-evaluate, AI không tự hành động | Integration/E2E |
| TC-14 | NQ01/02 | Member truy cập API task team khác và kiểm tra frontend bundle | API từ chối; secret AI không có trong client bundle/log | Security |

Các ca trên là thiết kế. Chưa có build hoặc môi trường test được xác nhận nên **chưa có Pass/Fail**.

## 5. Quy ước Jira Bug

Tạo Bug riêng khi actual khác expected. Tiêu đề: `[Area] Mô tả hành vi sai`; mô tả gồm môi trường, build/commit, case ID, bước tái hiện, expected/actual, ảnh/log đã ẩn secret và mức Sev1–Sev4. Liên kết Bug với Task/Story, gán owner sửa, giữ trạng thái mở đến khi QA retest. Sev1: mất dữ liệu/không dùng được luồng cốt lõi; Sev2: sai quyền, sai risk/evidence, vượt capacity hoặc lỗi lớn cản nghiệm thu; Sev3: chức năng phụ lỗi có cách tránh; Sev4: lỗi trình bày nhỏ. Bảo/nhóm xác nhận tiêu chí severity và release gate khi chốt Test Plan.

## 6. WSM

`CWRM-17_WSM.xlsx` là bảng WSM 5 tiêu chí với trọng số tổng 100% và công thức tính tự động. Các ô điểm 1–5 để trống cho nhóm chấm có căn cứ; **chưa có điểm khảo sát thực** nên workbook chưa tuyên bố phương án nào thắng. Cần Bảo đối chiếu tiêu chí và phương án với Charter/khảo sát trước khi đưa vào Chương 1.

**Còn thiếu để đóng Task:** link Drive hoặc nơi lưu chung đã được nhóm chấp nhận, review Test Plan và WSM, dữ liệu điểm có căn cứ (nếu muốn kết luận WSM), bằng chứng trên Jira. Không ghi kết quả test hoặc khảo sát giả.
