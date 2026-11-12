# CWRM-15 — Đặc tả POC Risk Engine và evidence

**Trạng thái:** bản cập nhật 12/11/2026 sau review của Khôi và Hiệp, chờ đối chiếu lại với contract CWRM-11.

**Nguồn nghiệp vụ:** `00_Project_Scope_v0.1_ORIGINAL_UNCHANGED.md`, mục 10.
**Phạm vi:** R01–R03 là ba rule đầu để kiểm chứng hợp đồng dữ liệu. Scope v0.1 còn R04–R12; POC này không thay đổi phạm vi nghiệm thu cuối. Tên trường/schema là đề xuất, chờ CWRM-11 chốt API/ERD.

## 1. Quy tắc chung

- Risk Engine chỉ đọc task context; Manager không nhập/sửa risk level hay score. AI cũng không tính hoặc sửa risk.
- Đánh giá task chưa `Done`. Task `Done` giữ snapshot lịch sử nhưng không có risk đang hoạt động.
- Tính chênh lệch `deadlineAt - evaluatedAt` bằng mili giây từ hai thời điểm UTC. So sánh chênh lệch chưa làm tròn với 0, 24 × 3.600.000 và 48 × 3.600.000 mili giây. Chỉ làm tròn giá trị giờ khi ghi evidence hoặc hiển thị.
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

File `CWRM-15_risk-result.schema.json` mô tả kết quả engine đã được backend bổ sung fingerprint. API `RiskSnapshot` dùng kết quả này và thêm UUID `id` cùng `triggerSource` (`EVENT`, `HOURLY`, `MANUAL`). Đọc schema API chính thức từ [CWRM-11](https://ddinhbao05.atlassian.net/browse/CWRM-11). Schema nhận rule ID R01–R12 để mở rộng, còn POC hiện chỉ đặc tả R01–R03. `riskLevel`, `baseLevel` và evidence dạng enum dùng mã chữ hoa. `evaluatedAt` và các giá trị thời gian trong evidence dùng UTC ISO-8601 kết thúc bằng `Z`.

Backend dự kiến tính `inputFingerprint` theo dạng `sha256:<hex-64>` từ dữ liệu gốc đã chuẩn hóa và `ruleVersion`. Mẫu poster dùng digest minh họa. ID evidence ổn định trong một snapshot. Với đầu vào hợp lệ và không có rule kích hoạt, `LOW` có `triggeredRules: []` và `evidence: []`.

Tên evidence dùng camelCase. Giá trị deadline dùng `deadlineAt`, tiến độ dùng `progress` (percent), thời gian tính ra dùng `remainingHours` hoặc `overdueHours` (hours), điều kiện nâng dùng `priority`, `deadlineType` hoặc `affectedTaskCount`. Ngưỡng dùng evidence `source: rule` với `remainingHoursMinExclusive`, `remainingHoursMaxInclusive` và `progressMaxExclusive` theo rule tương ứng. Tên trường và đơn vị dùng chung giữa UI và POC AI.

Theo draft CWRM-11, GET current trả `isCurrent` và `evaluationError`. Đầu vào sai trả 422 `RISK_INPUT_INVALID` khi đánh giá thủ công. Lỗi engine trả 503 `RISK_EVALUATION_FAILED`. Lần đánh giá lỗi không tạo snapshot. Nếu lỗi xảy ra sau cập nhật nghiệp vụ hợp lệ, đề xuất giữ cập nhật và đánh dấu snapshot cũ `isCurrent=false`.

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

## 5. Kết quả review và xác nhận tiếp theo

Khôi đã đối chiếu rule, 12 ca thiết kế và schema với draft CWRM-11. Hiệp đã xác nhận UI local hiển thị ví dụ poster. Bản cập nhật này xử lý các điểm hai bạn nêu trên [CWRM-15](https://ddinhbao05.atlassian.net/browse/CWRM-15). Cần đối chiếu lại fixture mới trên UI và xác nhận tên evidence, trạng thái snapshot với Khôi trước khi đóng task. Bảng P01–P12 ghi kết quả kỳ vọng của thiết kế kiểm thử.
