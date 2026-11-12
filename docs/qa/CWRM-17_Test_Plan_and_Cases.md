# CWRM-17 — Test Plan và test cases ban đầu

**Trạng thái 12/11/2026:** Bảo đồng ý dùng Test Plan và 14 ca làm thiết kế ban đầu. Đã bổ sung kỳ vọng API từ review của Khôi. Các ca chưa thực thi.

**Nguồn:** Scope v0.1 (S01–S12, AC01–AC14), Foundation, rubric, [CWRM-17](https://ddinhbao05.atlassian.net/browse/CWRM-17) và [OpenAPI 0.1.0-draft của CWRM-11](https://github.com/n23dccn155-gif/CWRM-platform/blob/feature/CWRM-11-architecture-erd-api/docs/api/openapi.yaml).
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
| TC-02 | S04, AC02 | Member Accept rồi thử Start khi predecessor chưa Done | Có R; Accept giữ nguyên trạng thái task; Start trả 422 `PREDECESSOR_NOT_DONE` | API/E2E |
| TC-03 | S05, AC03 | Member đủ role/skill request Open Work; Manager Approve | Request Pending không tạo R; chỉ Approve tạo Accepted/R, không vượt số chỗ | API/E2E |
| TC-04 | S05, AC03 | Hai request cùng được duyệt khi còn một chỗ | Một lượt 200, lượt kia 409 `CAPACITY_EXCEEDED` hoặc `VERSION_CONFLICT`; đúng một assignment mới | Integration |
| TC-05 | S06, AC04 | Tạo/sửa task và thử gỡ A hoặc R cuối đang cần | Giữ đúng một A; thao tác làm mất A/R cần thiết trả 422 `RESPONSIBILITY_REQUIRED` | Unit/API |
| TC-06 | S07, AC05 | Member đặt progress 100 rồi gửi Review. A thử return thiếu lý do, thiếu progress hoặc progress 100, rồi return hợp lệ | 100 không tự Done; input sai trả 400; return có lý do, progress 0–99 và `expectedVersion` hợp lệ trả 200, task về `IN_PROGRESS` | API/E2E |
| TC-07 | S08, AC06 | Tạo hai blocker, giải quyết một | Task vẫn Blocked; chỉ hết Blocked khi blocker cuối được giải quyết | API/E2E |
| TC-08 | S09, AC07 | Tạo T1 → T2 → T3 (mũi tên từ predecessor sang successor), rồi thử T3 → T1 | Trả 422 `DEPENDENCY_CYCLE`, không tạo cạnh mới; successor chưa bắt đầu trước predecessor Done | Unit/API |
| TC-09 | S10, AC08 | Dùng ca P01–P12 trong `CWRM-15_Risk_Rules_POC.md`; truyền `evaluatedAt` cố định | Đúng level, rule IDs, evidence, timestamp và biên 0/24/48 giờ | Unit |
| TC-10 | S11, AC09 | Risk High rồi Manager sửa dữ liệu làm Low | Snapshot mới, alert cập nhật/resolve, không nhân đôi; giữ lịch sử | Integration/E2E |
| TC-11 | S12, AC10 | Gọi AI thật với snapshot xác định | Giải thích dựa evidence, 2–3 lựa chọn; model/provider và latency ghi lại | Integration |
| TC-12 | S12, AC11 | Giả lập timeout, quota, lỗi provider và output sai ở API giải thích | Timeout/quota trả 503, lỗi provider/output trả 502 với mã `AI_*` tương ứng. `details` có `fallbackExplanation`, `retryable` và `recommendationId`; GET current risk vẫn 200 với evidence cũ | Integration/E2E |
| TC-13 | S12, AC12 | Manager chọn hành động hợp lệ và ghi lý do | Có audit, risk re-evaluate, AI không tự hành động | Integration/E2E |
| TC-14 | NQ01/02 | Member truy cập API task team khác và kiểm tra frontend bundle | API trả 403 `FORBIDDEN`; secret AI không có trong client bundle/log | Security |

Các ca trên là thiết kế. Chưa có build hoặc môi trường test được xác nhận nên **chưa có Pass/Fail**.

### Ca bổ sung theo review backend

| ID | Phạm vi | Tình huống và kỳ vọng |
| --- | --- | --- |
| TC-15 | S05 | Member không đủ role/skill gửi request, nhận 422 `NOT_ELIGIBLE`; không tạo request. |
| TC-16 | S05 | Member rút request đang `PENDING`, chuyển `WITHDRAWN` và không tạo R. Manager Reject thiếu lý do, nhận 400 và giữ nguyên request. |
| TC-17 | S04 | Decline thiếu lý do bị từ chối. Số assignment `ACCEPTED` đang hiệu lực cộng `PENDING_ACCEPTANCE` không vượt số người cần, nếu vượt trả 409 `CAPACITY_EXCEEDED`. |
| TC-18 | S03 | Hai người cùng sửa task với cùng version. Người lưu sau nhận 409 `VERSION_CONFLICT`; dữ liệu lần lưu trước được giữ. |
| TC-19 | S06–S08 | Gửi Review khi còn blocker mở, nhận 422 `OPEN_BLOCKERS_EXIST`. Member không phải A thử duyệt Done, nhận 403. |
| TC-20 | S09 | Chặn dependency tự trỏ và dependency khác team. Đồ thị có nhiều đường tới cùng successor chỉ đếm successor một lần. |
| TC-21 | S12 | Yêu cầu giải thích snapshot `LOW` nhận 422 `AI_SNAPSHOT_LEVEL_NOT_SUPPORTED`; snapshot cũ nhận 409 `SNAPSHOT_NOT_CURRENT`. Kết quả đã lưu hiển thị `isCurrent=false` sau thay đổi làm mất hiệu lực. |
| TC-22 | S01 | Gỡ hoặc hạ quyền Manager cuối cùng, nhận 422 `LAST_MANAGER_REQUIRED`; giữ membership/quyền hiện có. |

TC-15–TC-22 cũng chưa thực thi. P01–P12 chỉ phủ POC R01–R03. Khi có bộ rule mở rộng, chạy RC01–RC12 từ Scope mục 10.4. Kiểm thử tích hợp dùng seed có deadline tính tương đối theo thời điểm seed.

## 5. Quy ước Jira Bug

Tạo Bug riêng khi actual khác expected. Tiêu đề: `[Area] Mô tả hành vi sai`; mô tả gồm môi trường, build/commit, case ID, bước tái hiện, expected/actual, ảnh/log đã ẩn secret và mức Sev1–Sev4. Liên kết Bug với Task/Story, gán owner sửa, giữ trạng thái mở đến khi QA retest. Sev1: mất dữ liệu/không dùng được luồng cốt lõi; Sev2: sai quyền, sai risk/evidence, vượt capacity hoặc lỗi lớn cản nghiệm thu; Sev3: chức năng phụ lỗi có cách tránh; Sev4: lỗi trình bày nhỏ. Bảo/nhóm xác nhận tiêu chí severity và release gate khi chốt Test Plan.

## 6. WSM

`CWRM-17_WSM.xlsx` là bản gốc để truy vết. `CWRM-17_WSM_v2.xlsx` so sánh chatbot tư vấn rủi ro, To-do tích hợp AI và CWRM trên cùng bài toán. Giữ năm tiêu chí với trọng số tổng 100%. Điểm chuyên môn theo đề xuất của Bảo lần lượt là 2,80, 3,75 và 3,75 trên 5. Chọn CWRM khi hòa điểm vì định hướng risk dựa trên evidence và AI hỗ trợ Manager. Workbook ghi căn cứ từng điểm, phân tích độ nhạy và nguồn khảo sát n=6 để hiểu nhu cầu.

**Còn thiếu để đóng Task:** gửi WSM v2 cho Bảo review lần cuối và ghi xác nhận cùng link bản Test Plan/WSM cập nhật trên Drive vào Jira. Phần chạy kiểm thử sẽ ghi kết quả riêng khi có build và môi trường phù hợp.
