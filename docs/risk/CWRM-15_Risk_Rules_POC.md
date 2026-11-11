# CWRM-15 — Đặc tả POC Risk Engine và evidence

**Trạng thái:** bản nháp để Khôi (backend) và Hiệp (UI) review, 10/11/2026.

**Nguồn nghiệp vụ:** `00_Project_Scope_v0.1_ORIGINAL_UNCHANGED.md`, mục 10.
**Phạm vi:** R01–R03 là ba rule đầu để kiểm chứng hợp đồng dữ liệu. Scope v0.1 còn R04–R12; POC này không thay đổi phạm vi nghiệm thu cuối. Tên trường/schema là đề xuất, chờ CWRM-11 chốt API/ERD.

## 1. Quy tắc chung

- Risk Engine chỉ đọc task context; Manager không nhập/sửa risk level hay score. AI cũng không tính hoặc sửa risk.
- Đánh giá task chưa `Done`. Task `Done` giữ snapshot lịch sử nhưng không có risk đang hoạt động.
- `remainingHours = (deadline - evaluatedAt)` tính bằng giờ liên tục, dùng thời điểm UTC; số âm là quá hạn. Ở biên 0, 24 và 48 giờ, dùng đúng dấu so sánh bên dưới.
- `progress` nằm trong khoảng 0–100. Thiếu deadline/progress hoặc giá trị sai miền: báo lỗi dữ liệu, **không** thay bằng 0 và không phát snapshot mới giả hợp lệ.
- Chạy các rule độc lập; mức cơ sở lấy cao nhất theo `Low < Medium < High`. Không rule nào kích hoạt thì `Low`. Sau đó, chỉ khi mức cơ sở `Medium`, nâng một lần lên `High` nếu `priority` là `High/Critical`, `deadlineType` là `Fixed`, hoặc `affectedTasks >= 3`. Ghi evidence cho điều kiện nâng mức. Các điều kiện này không tự tạo risk từ `Low`.
- R01–R03 dùng deadline/progress; blocker và dependency phải được giữ trong task context để R04–R07 bổ sung sau. POC không suy diễn risk từ blocker/dependency khi các rule đó chưa triển khai.

## 2. Ba rule POC

| ID | Input | Điều kiện kích hoạt | Mức cơ sở | Evidence bắt buộc |
| --- | --- | --- | --- | --- |
| R01 | deadline, evaluatedAt, task status | `remainingHours < 0` | High | deadline, evaluatedAt, overdueHours = `-remainingHours`, status |
| R02 | deadline, evaluatedAt, progress | `0 <= remainingHours <= 24` và `progress < 80` | High | remainingHours, progress, ngưỡng 24/80 |
| R03 | deadline, evaluatedAt, progress | `24 < remainingHours <= 48` và `progress < 50` | Medium | remainingHours, progress, ngưỡng 24/48/50 |

Một task có thể kích hoạt nhiều rule khi mở rộng R04–R12; `triggeredRules` chứa tất cả rule kích hoạt, còn `baseLevel` là mức lớn nhất trước khi nâng. R01 không phụ thuộc vào progress nên `Review` với progress 100 vẫn High nếu quá hạn.

## 3. Hợp đồng dữ liệu đề xuất

File `CWRM-15_risk-result.schema.json` là JSON Schema để backend và UI thảo luận; chưa phải API Contract đã duyệt. Mỗi snapshot có `taskId`, `riskLevel`, `baseLevel`, `evaluatedAt`, `ruleVersion`, `triggeredRules`, `evidence` và `inputFingerprint`. `inputFingerprint` giúp phát hiện kết quả AI đã cũ khi dữ liệu task thay đổi; thuật toán hash do CWRM-11/CWRM-16 chốt. ID evidence cho phép AI liên kết nguyên nhân với dữ liệu nguồn. Giá trị `Low` vẫn tạo snapshot với `triggeredRules: []` và `evidence: []` nếu đầu vào hợp lệ.

Ví dụ poster Marketing: tại `2026-11-10T03:00:00Z`, deadline `2026-11-11T19:00:00Z` (còn 40 giờ), progress 30, priority High, deadlineType Flexible. R03 tạo mức cơ sở Medium; priority High nâng kết quả thành High. UI nên hiển thị: **High — còn 40 giờ, tiến độ 30%; nâng mức vì ưu tiên High**; người dùng có thể mở chi tiết rule R03, thời điểm đánh giá và dữ liệu evidence. Blocker của poster chỉ là ngữ cảnh ở POC này; chưa được dùng để kích hoạt R04/R05.

## 4. Bộ ca kiểm thử thiết kế

Tất cả ca độc lập, task `In Progress`, priority `Medium`, deadlineType `Flexible`, affectedTasks = 0, không có rule R04–R12, trừ khi ghi khác. `T` là thời điểm đánh giá cố định. Dùng test clock; không đợi thời gian thực.

| Case | Input tại T | Rule kích hoạt | Kết quả | Mục đích |
| --- | --- | --- | --- | --- |
| P01 | deadline = T − 1 giây, progress 100, status Review | R01 | High | Quá hạn dù tiến độ 100 |
| P02 | deadline = T, progress 79 | R02 | High | Biên 0 giờ |
| P03 | deadline = T + 24 giờ, progress 79 | R02 | High | Biên 24 giờ thuộc R02 |
| P04 | deadline = T + 24 giờ, progress 80 | không | Low | Ngưỡng progress 80 không thuộc R02 |
| P05 | deadline = T + 24 giờ + 1 giây, progress 49 | R03 | Medium | Ngay sau biên 24 giờ |
| P06 | deadline = T + 48 giờ, progress 49 | R03 | Medium | Biên 48 giờ thuộc R03 |
| P07 | deadline = T + 48 giờ + 1 giây, progress 49 | không | Low | Sau biên 48 giờ |
| P08 | deadline = T + 40 giờ, progress 50 | không | Low | Ngưỡng progress 50 không thuộc R03 |
| P09 | deadline = T + 40 giờ, progress 30, priority High | R03 | High | Nâng Medium → High, lưu evidence priority |
| P10 | deadline = T + 7 ngày, progress 90, priority High | không | Low | Priority cao không tự tạo risk |
| P11 | status Done, deadline = T − 1 giờ | không đánh giá | không có snapshot mới | Done chỉ giữ lịch sử |
| P12 | deadline thiếu hoặc progress = 101 | không đánh giá | lỗi dữ liệu rõ ràng | Không chế tác input/snapshot |

Kiểm thử backend cần xác nhận `evaluatedAt` và `ruleVersion` cố định cho cùng một lần đánh giá; cùng input và thời điểm cho cùng kết quả/evidence. Khi Manager đổi deadline, progress, priority hoặc giải quyết blocker, hệ thống đánh giá lại từ dữ liệu mới và không để AI recommendation của snapshot cũ được coi là hiện hành.

## 5. Việc cần review trước khi chốt CWRM-15

1. **Khôi:** đối chiếu tên trường, UTC, fingerprint, cấu trúc evidence và error response với ERD/OpenAPI CWRM-11; xác nhận nơi lưu snapshot/ruleVersion.
2. **Hiệp:** xác nhận UI có thể hiển thị level, lý do ngắn, từng evidence, `evaluatedAt` và trạng thái dữ liệu cũ; không hiển thị risk score do Manager tự nhập.
3. **Bảo/nhóm:** duyệt ngưỡng và cơ chế nâng mức từ Scope v0.1 trong Scope v0.2 hoặc ghi Change Request. Sau review, cập nhật schema/API/fixture và comment liên kết bằng chứng trên Jira.

**Chưa hoàn thành:** chưa có xác nhận của Khôi/Hiệp, chưa có API chạy hoặc test execution. Các ca trên là *test design*, không phải kết quả test đã chạy.
