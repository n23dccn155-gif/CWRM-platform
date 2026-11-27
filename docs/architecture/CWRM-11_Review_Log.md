# CWRM-11 — Review Log: API, ERD và kiến trúc

## Mục đích

Ghi nhận các câu hỏi thiết kế cần Frontend (Đặng Văn Hiệp) và Risk/AI/QA (Lê Quốc Ban) xác nhận để tích hợp theo cùng hợp đồng, cùng các phản hồi đã nhận từ Hiệp và Ban. Các điểm đã nhận được áp dụng trong OpenAPI 0.2.0-draft và cập nhật ở Architecture, ERD; đây không phải biên bản cuộc họp hay phê duyệt toàn nhóm.

## Câu hỏi gửi Hiệp — Frontend

1. UI có thể ánh xạ enum API UPPER_SNAKE_CASE sang nhãn hiển thị hiện tại không? Ví dụ TO_DO → “To Do”, PENDING_ACCEPTANCE → “Pending Acceptance”, OPEN_WORK → “Open Work”.
2. Các màn TaskSummary/Risk có thể dùng các mảng responsibleUserIds, requiredRoleIds, predecessorIds (và requiredSkillIds/successorIds) thay cho một responsible, requiredRole, predecessorId không? Scope cho phép nhiều R, role yêu cầu và predecessor.
3. Schema Task trả requiredPeople, occupiedSlots (số chỗ đang giữ), openWorkOpen, openBlockerCount, affectedTaskCount, risk (snapshotId, riskLevel, evaluatedAt, isCurrent) và version để gửi lại làm expectedVersion. Các màn SC-01 đến SC-06 còn thiếu trường nào không?
4. Luồng Open Work ở API: GET eligibility trả eligible và reasons; gửi request khi không đủ điều kiện nhận 422 NOT_ELIGIBLE và không tạo request; request PENDING chưa tạo R; approve tạo ngay assignment ACCEPTED, không cần Accept lần hai. SC-04 cần thêm dữ liệu nào không?
5. Start trả 422 PREDECESSOR_NOT_DONE khi predecessor chưa Done; gửi review trả 422 OPEN_BLOCKERS_EXIST khi còn blocker mở; A trả kết quả phải gửi reason và progress mới 0–99. UI chỉ cần xử lý các mã lỗi này, hay muốn Task có sẵn cờ cho biết trước thao tác nào đang bị chặn?
6. RiskSnapshot trong demo-data.ts đang khai báo triggeredRules và ruleId là R01–R03. Contract dùng pattern R01–R12, kèm evidence id/source/field/value/unit, evaluatedAt, ruleVersion, inputFingerprint và isCurrent. UI cần đổi gì để hiển thị đủ?
7. Khi AI lỗi, API trả HTTP 502 hoặc 503 theo phong bì lỗi chung, trong details có retryable, recommendationId và fallbackExplanation (diễn giải theo mẫu của rule); risk/evidence vẫn đọc được. UI xử lý theo cách này được không, hay muốn nhận 200 kèm trạng thái FAILED? Kết quả AI cũ được đánh dấu bằng isCurrent=false.
8. My Work lấy từ ba nguồn: GET /dashboard/my-work (task tôi là R), GET /assignments (đề nghị Direct đang chờ tôi) và GET /open-work-requests (request của tôi); danh sách Open Work của team lấy từ GET /tasks với bộ lọc. Cách chia này có hợp với SC-03 và SC-04 không? Có cần thêm bộ lọc hoặc cách sắp xếp nào cho các danh sách page/pageSize?

## Câu hỏi gửi Ban — Risk/AI/QA

1. Xác nhận Risk Engine thuần nhận RiskTaskContext, thời điểm đánh giá và cấu hình; trả riskLevel/baseLevel, triggeredRules R01–R12, evidence, evaluatedAt, ruleVersion và fingerprint được không?
2. CWRM-15 POC có R01–R03; CWRM-11 mở schema/API pattern R01–R12 theo Scope. Ban có dự kiến shape evidence, field/unit hoặc rule metadata nào khác cần đưa vào contract không?
3. Đề xuất inputFingerprint (Architecture mục 4): SHA-256 trên JSON chuẩn hóa của dữ liệu gốc; không gồm evaluatedAt và các số giờ suy ra từ thời điểm đánh giá, để fingerprint chỉ đổi khi dữ liệu task đổi. Tính hiện hành của kết quả AI so thêm riskLevel, baseLevel và triggeredRules. Ban có cần thay danh sách trường, thứ tự mảng hoặc định dạng digest không?
4. Snapshot lưu trong risk_snapshots bất biến, ruleVersion/context/fingerprint ở snapshot và evidence thành bảng con theo evidence id ổn định trong snapshot có phù hợp không? Ban muốn retention/lịch sử có dạng khác không?
5. Khi thiếu deadline/progress hoặc input sai miền, đề xuất không thay bằng 0 và không tạo snapshot mới; mã RISK_INPUT_INVALID/422. Khi engine lỗi lúc người dùng vừa cập nhật task, đề xuất vẫn giữ thay đổi nghiệp vụ và trả risk.isCurrent=false thay vì rollback (Architecture mục 7A). Ban đồng ý hướng này không, và cần chi tiết lỗi theo trường nào?
6. Đề xuất AIRecommendation gắn riskSnapshotId, trạng thái SUCCESS/FAILED, provider/model, summary, evidence IDs, 2–3 phương án, lỗi an toàn và fingerprint; kết quả FAILED vẫn cho retry. Ban có cần thêm request/usage/latency fields hay cấu trúc lưu khác không? Không ghi usage là yêu cầu đã chốt.
7. AI chỉ nhận snapshot hiện hành của task; snapshot đã cũ trả 409 SNAPSHOT_NOT_CURRENT. Nếu đã có kết quả SUCCESS cho snapshot tương đương thì trả lại kết quả đó (reused=true), không gọi AI. Cách xử lý khi task đổi trong lúc đang gọi AI và thời điểm lưu recommendation như vậy đã đúng nhu cầu CWRM-16 chưa?
8. Fallback theo mẫu rule cho AI lỗi có nên lưu trong recommendation hay chỉ dựng ở response? Bản draft lưu bản ghi FAILED kèm mã lỗi, còn fallbackExplanation được dựng khi trả response. TC-12 cần kiểm tra HTTP 502/503 và các trường trong details như ở câu 7 của phần Frontend.
9. Ban đang thử OpenAI Responses API ở POC CWRM-16; ADR-001 để provider/model ngoài phạm vi. Có yêu cầu nào khiến backend port phải đổi trước khi CWRM-16 chốt provider không?

## Điểm contract khác bản nháp hiện có

| Nguồn nháp | Khác biệt quan sát được | Cách thể hiện trong CWRM-11 draft | Cần review |
|---|---|---|---|
| Hiệp — frontend/src/lib/demo-data.ts | TaskStatus, AssignmentStatus, RequestStatus, RiskLevel và AssignmentMode dùng nhãn hiển thị như “To Do”, “Pending Acceptance”, “Open Work”; D4 yêu cầu mã UPPER_SNAKE_CASE trong API/DB | Enum API/DB là TO_DO, PENDING_ACCEPTANCE, OPEN_WORK… UI ánh xạ nhãn | Hiệp xác nhận mapping và impact lên fixture/UI |
| Hiệp — TaskSummary | Có một responsible, một requiredRole, một predecessorId; riskLevel là một trường phẳng | Contract trả responsibleUserIds, requiredRoleIds, predecessorIds dạng mảng; thêm requiredSkillIds/successorIds; risk là object tóm tắt có isCurrent | Hiệp xác nhận màn và model cần hiển thị nhiều giá trị |
| Ban — CWRM-15_risk-result.schema.json | triggeredRules và evidence.ruleId khóa enum R01–R03; risk level là Low/Medium/High | OpenAPI pattern cho R01–R12; mã level LOW/MEDIUM/HIGH theo D4/Scope | Ban xác nhận mở pattern và giữ mức risk đúng Scope |
| Ban — CWRM-15 POC | inputFingerprint đang chờ thuật toán; nơi lưu snapshot/ruleVersion chưa chốt; lỗi thiếu/sai input cần rõ | Đề xuất fingerprint SHA-256, risk_snapshots/risk_evidence, mã RISK_INPUT_INVALID; ghi nhận các phần đã chốt và việc chuẩn hóa còn mở trong B-03, B-05 | Ban đã phản hồi câu 3–5; còn mở quy tắc chuẩn hóa fingerprint và fixture digest |
| Ban — CWRM-16_POC_Notes.md và CWRM-16_ai-poc.mjs | POC đã chuẩn bị/kiểm tra cục bộ nhưng chưa có request thật; chưa tích hợp backend; storage và snapshot stale còn cần chốt; OpenAI chỉ là lựa chọn thử | API lưu AIRecommendation theo snapshot, status SUCCESS/FAILED, fingerprint và isCurrent/reuse; provider giữ mở | Ban đã phản hồi storage, currentness và lỗi; provider/model chốt sau lần gọi thật trong CWRM-16 |
| Hiệp — CWRM-13 user flow/wireframes | Draft đã nêu task status tách assignment/request, R chỉ sau Accept/Approve, Start dependency guard, Review/return và fallback | Contract giữ các hành vi này và tách action endpoint | Hiệp rà lại tên endpoint/response để UI consume |

Các ghi nhận mô tả đúng tài liệu đã đọc, không kết luận người viết nháp sai; Scope v0.1 và các quyết định D1–D6 trong task CWRM-11 là cơ sở contract ưu tiên.

> **Ghi chú lịch sử (18/11/2026, theo PM review CWRM-18 comment 10127):** câu trên chỉ đúng ở thời điểm 0.1.0-draft (11/11/2026). Từ 0.3.0-draft, baseline nghiệp vụ hiện hành là **Scope v0.2 Final kèm Clarification FINAL-01..08** (PM duyệt 14–15/11/2026) và các quyết định PM sau đó (PM-03). Scope v0.1 và D1–D6 chỉ còn dùng để đối chiếu thay đổi, không phải nguồn yêu cầu hiện hành.

## Phản hồi của Hiệp (11/11/2026)

Nguồn: comment của Hiệp trên Jira CWRM-11 lúc 23:32 ngày 11/11/2026, trả lời 8 câu hỏi ở mục “Câu hỏi gửi Hiệp — Frontend” và nêu ý kiến về ba điểm khác.

| Mã | Câu hỏi liên quan | Phản hồi của Hiệp | Contract 0.1.0-draft hiện có | Hướng xử lý của Tech Lead |
|---|---|---|---|---|
| H-01 | Câu 1 — ánh xạ enum | Được. UI giữ nhãn hiển thị và có bảng ánh xạ riêng cho từng enum, vì LOW/MEDIUM/HIGH trùng giữa RiskLevel và Priority, còn DIRECT trùng giữa assignmentMode và source. Backend chỉ trả mã; frontend sở hữu nhãn. | `info.description` quy định enum UPPER_SNAKE_CASE; `RiskLevel` và `Priority` cùng có LOW/MEDIUM/HIGH; `Task.assignmentMode` và `Assignment.source` đều có DIRECT/OPEN_WORK. | Đồng ý bảng ánh xạ riêng ở frontend; không đổi contract. |
| H-02 | Câu 2 — mảng và dữ liệu hiển thị | Được dùng mảng. Cần thêm `missingRoleIds` (hiện có `matchedRoleIds`); `predecessorIds` nên kèm `{taskId, title, status}` để tránh gọi N+1. `TaskSummary` cần `teamName` và tên A/R, hoặc endpoint tra cứu hàng loạt. | Không có schema `TaskSummary`; `Task` dùng `responsibleUserIds`, `requiredRoleIds`, `requiredSkillIds`, `predecessorIds` và `successorIds` dạng mảng ID. `predecessorIds` là UUID trần. `Eligibility` có `matchedRoleIds` và `missingSkillIds`, chưa có `missingRoleIds`. `Task` hiện có `teamId`, `accountableUserId`, `responsibleUserIds`, chưa có `teamName` hay tên hiển thị A/R. | Nhận `missingRoleIds` và predecessor gồm `taskId`, `title`, `status`, đưa vào 0.2.0-draft. Nhúng `teamName` và tên hiển thị A/R trực tiếp vào `Task`, không làm endpoint tra cứu hàng loạt; đưa vào 0.2.0-draft. `missingSkillIds` đã có. |
| H-03 | Câu 3 — schema Task và version | Cần thêm `teamName`, `milestoneName`, `updatedAt`; `risk` luôn có mặt và cho phép null vì task chưa đánh giá có thể bị hiểu nhầm là Low. Các action endpoint (start, submit-review, approve, return...) cũng cần `expectedVersion`. | `Task` có `teamId`, `milestoneId`, `version`, `requiredPeople`, `occupiedSlots`, `openWorkOpen`, `openBlockerCount`, `affectedTaskCount`; chưa có `teamName`, `milestoneName`, `updatedAt`. `risk` không nằm trong danh sách required của `Task` và không khai báo nullable; `TaskRiskSummary` ghi task chưa đánh giá thành công không có trường này. Cả bốn action đổi trạng thái `/tasks/{taskId}/start`, `/submit-review`, `/approve`, `/return` đều bắt buộc `expectedVersion` (request body `VersionAction` hoặc các schema `SubmitReviewRequest`/`ReturnTaskRequest`). | Nhận trường hiển thị bổ sung và `risk` bắt buộc, nullable vào 0.2.0-draft. `expectedVersion` đã có cho cả bốn action nêu trên; không tìm thấy endpoint nào còn thiếu trong nhóm này. |
| H-04 | Câu 4 — luồng Open Work | Luồng đúng, không cần Accept lần hai. Cần `Eligibility.reasons` dạng mã kèm tham số thay chuỗi tự do; thêm `missingRoleIds`; cho biết request của chính người dùng qua `myRequestStatus` hoặc bộ lọc `GET /open-work-requests?taskId=&status=PENDING`. Cần chốt request PENDING thành gì khi Manager đóng đăng ký. | `GET /tasks/{taskId}/open-work/eligibility` trả schema `Eligibility`, trong đó `reasons` là mảng chuỗi, có `matchedRoleIds`/`missingSkillIds` nhưng chưa có `missingRoleIds`. `GET /open-work-requests` chỉ lọc `workspaceId`/`status`, không có `taskId`; Task chưa có `myRequestStatus`. `POST /tasks/{taskId}/open-work/close` đã là endpoint riêng; mô tả tự đóng khi task Start hoặc đủ chỗ thì chuyển Pending sang REJECTED theo Scope. Scope v0.1 mục Open Work là căn cứ chuyển Pending sang REJECTED với lý do hệ thống khi Manager đóng đăng ký; `OpenWorkRequest.decisionReason` đã có mô tả lưu lý do hệ thống khi đăng ký đóng. | Nhận reasons dạng mã kèm tham số và `myRequestStatus`, đưa vào 0.2.0-draft. Áp dụng cùng quy tắc của Scope v0.1 khi Manager đóng: request PENDING chuyển REJECTED với lý do hệ thống; ghi rõ hành vi này ở contract 0.2.0-draft. |
| H-05 | Câu 5 — cờ chặn thao tác và body action | Nên có cả cờ/preflight để vô hiệu hóa nút và 422 khi thao tác thật để chống tranh chấp. Cần chốt body của submit-review và return (reason + progress 0–99). | `Task` chưa có `availableActions`; action start và submit-review có response 422 qua `RuleViolation`. `SubmitReviewRequest` hiện bắt buộc `expectedVersion` và một trong `resultText`/`resultUrl`, không có reason/progress. `ReturnTaskRequest` hiện có `expectedVersion`, `reason` và `progress` 0–99. | Nhận trường `availableActions` trong response `Task` kèm 422 khi thao tác thật; không thêm endpoint riêng; đưa `availableActions` vào 0.2.0-draft. Body hiện có: submit-review nhận `resultText` hoặc `resultUrl`; return nhận `reason` và `progress` 0–99, cả hai có `expectedVersion`. |
| H-06 | Câu 6 — RiskSnapshot | Đổi mức risk sang LOW/MEDIUM/HIGH và mở R01–R12; cần danh mục rule R04–R12 thay vì frontend tự viết cứng. Thêm `id`, `triggerSource`, `isCurrent`, `evaluationError`; `unit` nên theo bộ giá trị cố định. Không cần hiển thị `inputFingerprint`. | `RiskLevel` đã là LOW/MEDIUM/HIGH; `RiskSnapshot.triggeredRules` và `RiskEvidence.ruleId` dùng pattern R01–R12. `RiskSnapshot` đã có `id`, `triggerSource`; `CurrentRisk` có `isCurrent` và `evaluationError`. `RiskEvidence.unit` là chuỗi tự do; chưa có danh mục rule R04–R12. `RiskSnapshot.inputFingerprint` đã có. | Danh mục R04–R12 chưa được đặc tả; mở để bổ sung khi CWRM-15 chốt R04–R12. Giữ `field`/`unit` là chuỗi tự do; `hours` và `percent` là các unit hiện dùng, giá trị khác bổ sung theo đặc tả. Các trường snapshot/currentness và fingerprint hiện có được giữ. |
| H-07 | Câu 7 — lỗi AI | Chọn HTTP 502/503 cùng phong bì lỗi. `details` cần `retryable`, `recommendationId`, `fallbackExplanation`, `snapshotId`. Bản ghi FAILED phải được lưu trước khi trả lỗi và đọc lại được qua GET. UI hiện lỗi tại chỗ, chỉ hiện nút thử lại khi `retryable=true`. | `AIGatewayError`/`AIUnavailable` đã mô tả và minh họa `retryable`, `recommendationId`, `fallbackExplanation`; chưa có `snapshotId` trong `details`. `AIRecommendation` có `id`, `snapshotId`, trạng thái FAILED và `errorCode`. POST giải thích ghi rõ lưu FAILED trước khi trả lỗi; GET `/ai-recommendations/{recommendationId}` trả bản ghi SUCCESS hoặc FAILED đã lưu. | `retryable`, `recommendationId`, `fallbackExplanation`, lưu FAILED trước khi trả lỗi và GET bản ghi đã lưu đã có trong 0.1.0-draft. Nhận bổ sung `snapshotId` vào error details ở 0.2.0-draft. |
| H-08 | Câu 8 — My Work | Hợp nghiệp vụ nhưng không phân trang được khi trộn ba nguồn. Ưu tiên `GET /dashboard/my-work` trả các section có phân trang riêng. Nếu giữ ba endpoint thì thêm filter/sort và `include=task`; thêm `counts` cho sidebar. | `GET /dashboard/manager` trả `Dashboard`; `GET /dashboard/my-work` trả một `TaskPage`; `GET /assignments` trả `AssignmentPage`; `GET /tasks/{taskId}/dependencies` trả `DependencyPage`. Các response đều tham chiếu schema cụ thể; My Work hiện không có section phân trang riêng hoặc `counts`. | Các response cụ thể đã có theo schema refs nêu trên; nhận đề nghị rà soát/chốt schema bốn endpoint ở 0.2.0-draft, trong đó `GET /dashboard/my-work` trả các section phân trang riêng kèm `counts`. |
| H-09 | Ý kiến khác — cổng 3001 và CORS | Đồng ý cổng 3001. Frontend đọc `NEXT_PUBLIC_API_BASE_URL`; cần CORS cho `localhost:3000`. | `servers[0].url` hiện là `http://localhost:3001/api/v1`, phần mô tả ghi cổng sẽ chốt ở CWRM-12. CORS là cấu hình backend, không được mô tả trong OpenAPI. | Đã cấu hình ở backend CWRM-12 qua `CORS_ORIGIN` và `PORT`. |
| H-10 | Ý kiến khác — lỗi AI | Đồng ý trả 502/503 khi AI lỗi. | Đã mô tả trong `AIGatewayError` (502) và `AIUnavailable` (503), cùng các mã lỗi ổn định tương ứng. | Đã có trong 0.1.0-draft; giữ nguyên. |
| H-11 | Ý kiến khác — Manager can thiệp | Đồng ý chỉ sửa progress/effort và bắt buộc lý do. Cần trả bản ghi can thiệp cùng Task mới, có `expectedVersion`, không cho sửa risk. | `POST /tasks/{taskId}/management-interventions` nhận `reason`, `expectedVersion` và progress hoặc effort; mô tả không đặt status/risk. Response hiện chỉ trả `Task`, chưa có bản ghi can thiệp trong response/schema. | Giới hạn progress/effort, lý do, `expectedVersion` và không sửa risk đã có trong 0.1.0-draft. Nhận bổ sung response gồm bản ghi can thiệp và Task mới ở 0.2.0-draft. |

Ba điểm Hiệp đề nghị chốt trước CWRM-12 là: `TaskSummary` có `teamName` và tên A/R; `risk` luôn có mặt, nullable và có `availableActions` cho SC-03/SC-06; chốt schema bốn endpoint dashboard/assignments/dependencies. Các nội dung tương ứng được ghi tại H-02, H-03, H-05 và H-08.

Các điểm được nhận ở trên đã được áp dụng vào `openapi.yaml` bản 0.2.0-draft ngày 12/11/2026. Response 503 `SERVICE_UNAVAILABLE` của `/health` đã có từ bản trước theo phản hồi CWRM-12.

## Phản hồi của Ban (12/11/2026)

Nguồn: comment của Ban trên Jira CWRM-11 lúc 08:03 ngày 12/11/2026, trả lời 9 câu hỏi ở mục “Câu hỏi gửi Ban — Risk/AI/QA”.

| Mã | Câu hỏi liên quan | Phản hồi của Ban | Contract 0.1.0-draft hiện có | Hướng xử lý của Tech Lead |
|---|---|---|---|---|
| B-01 | Câu 1 — interface Risk Engine | Đồng ý engine là hàm thuần nhận context, thời điểm UTC và cấu hình rule có phiên bản; engine không đọc DB, gọi HTTP hay lấy giờ toàn cục. | Architecture đã mô tả engine thuần và backend chuẩn bị context, thời điểm, cấu hình; `RiskEvaluation` có fingerprint, còn contract chưa phân định rõ backend tính fingerprint, cấp `id` và `triggerSource` khi lưu snapshot. | Đồng ý. Engine là hàm thuần; backend cấp context, thời điểm đánh giá UTC và cấu hình rule có phiên bản. Backend tính `inputFingerprint`, cấp `id` và `triggerSource` khi lưu snapshot. Ghi rõ ở Architecture. |
| B-02 | Câu 2 — shape evidence | Đồng ý mức `LOW/MEDIUM/HIGH`, rule ID R01–R12 và tên field camelCase. Evidence `source: rule` chứa ngưỡng liên quan; engine so sánh trước khi làm tròn. | `RiskEvidence` đã có `id`, `source`, `ruleId`, `field`, `value`, `unit`, với rule ID R01–R12; `field`/`unit` là chuỗi tự do. Ví dụ dùng `deadline` và chưa có evidence ngưỡng. Chưa có danh mục R04–R12. | Đồng ý. Tên field camelCase theo CWRM-15 bản 12/11 (commit `46db860`): `deadlineAt`, `progress`, `remainingHours`, `overdueHours`, `priority`, `deadlineType`, `affectedTaskCount` và các ngưỡng `remainingHoursMinExclusive`, `remainingHoursMaxInclusive`, `progressMaxExclusive` với `source: rule`. Unit hiện dùng `hours`, `percent`; giá trị khác bổ sung theo CWRM-15 khi đặc tả R04–R12. Chưa thêm danh mục rule hay endpoint danh mục vào 0.2.0-draft. |
| B-03 | Câu 3 — fingerprint | Đồng ý `sha256:<hex-64>` trên JSON chuẩn hóa có `ruleVersion`, không có `evaluatedAt` hay số giờ suy ra. Mảng là tập hợp thì sắp theo khóa ổn định; mảng có thứ tự ý nghĩa thì giữ thứ tự. Khi tái sử dụng AI cần so fingerprint, risk/base level và tập rule trong cùng task; evidence đổi nghĩa hoặc mất thì đánh giá lại việc dùng kết quả. | OpenAPI 0.1.0-draft chỉ yêu cầu chuỗi fingerprint, mô tả đề xuất SHA-256 còn chờ Ban và dùng example không phải hash. Architecture đã đề xuất băm dữ liệu gốc cùng `ruleVersion`, bỏ `evaluatedAt`/giá trị suy ra; chưa chốt quy tắc null/thiếu, thứ tự mảng hay fixture digest. | Đồng ý. Dùng `sha256:<hex-64>` trên JSON chuẩn hóa dữ liệu gốc cùng `ruleVersion`, không gồm `evaluatedAt` và số giờ suy ra. Mảng tập hợp sắp theo khóa ổn định, mảng có thứ tự ý nghĩa giữ thứ tự. Quy tắc null/thiếu, thứ tự cụ thể từng mảng và fixture digest cố định chốt khi triển khai Risk Engine trong backend; ghi là việc còn mở. |
| B-04 | Câu 4 — snapshot/evidence và retention | Đồng ý snapshot bất biến, evidence là bản ghi con, ID evidence duy nhất trong snapshot, log/AI tham chiếu kèm snapshot ID; giữ lịch sử theo MVP, chưa yêu cầu retention riêng. | ERD đã mô tả snapshot bất biến và evidence là bảng con với khóa duy nhất theo snapshot/evidence key; API có lịch sử snapshot và AI gắn `snapshotId`. Chưa đặt retention riêng. | Đồng ý, không đổi contract. Chưa đặt retention riêng trong MVP. |
| B-05 | Câu 5 — input sai, engine lỗi và trạng thái chưa đánh giá | Thiếu/sai deadline hoặc progress trả `RISK_INPUT_INVALID`, không tạo snapshot; engine lỗi sau cập nhật hợp lệ giữ thay đổi nghiệp vụ, ghi audit, risk cũ `isCurrent=false`. Đánh giá lại thủ công trả 422 khi input sai, 503 khi engine lỗi. Không trả stack trace. | `RISK_INPUT_INVALID` đã có trong bảng mã lỗi, nhưng details chỉ là object tổng quát, chưa có cấu trúc field/problem. `Task.risk` chưa bắt buộc nullable. `CurrentRisk` đã cho phép thiếu `snapshot` và mô tả trạng thái chưa đánh giá thành công. Architecture còn ghi hướng giữ cập nhật là đề xuất chờ Ban. | Đồng ý. `RISK_INPUT_INVALID.details` là danh sách `{ field, problem }`, không có stack trace. Task chưa đánh giá: `Task.risk` là null và `CurrentRisk` không có `snapshot`. |
| B-06 | Câu 6 — AIRecommendation | Đồng ý liên kết snapshot, SUCCESS/FAILED, provider/model, summary, evidence IDs, phương án và mã lỗi an toàn; có thể lưu telemetry latency/usage nếu provider trả về, không lưu prompt thô. API dùng `snapshotId`, DB dùng `risk_snapshot_id`. | `AIRecommendation` có `snapshotId`, trạng thái, provider/model, summary, evidence IDs, phương án, error code và fingerprint; ERD dùng `risk_snapshot_id`. Chưa có latency/usage; chưa mô tả lưu prompt thô. | Đồng ý. Thêm `latencyMs` và `usage` vào `AIRecommendation` dạng tùy chọn, nullable (telemetry, không bắt buộc); không lưu prompt thô. API dùng `snapshotId`, DB dùng `risk_snapshot_id`. |
| B-07 | Câu 7 — task đổi trong lúc gọi AI | Đồng ý kiểm tra lại trạng thái hiện hành trước khi lưu/trả. Nếu dữ liệu đã đổi, lưu kết quả theo snapshot gốc, trả `isCurrent=false`, không gắn vào snapshot mới; chỉ dùng lại SUCCESS khi snapshot còn tương đương. | API yêu cầu snapshot hiện hành và có `isCurrent` trong kết quả; chưa mô tả kiểm tra lại sau lần gọi AI hay cách lưu kết quả nếu dữ liệu đổi trong lúc xử lý. | Đồng ý. Backend kiểm tra lại snapshot hiện hành trước khi lưu/trả kết quả; nếu dữ liệu đã đổi thì lưu kết quả theo snapshot gốc và trả `isCurrent=false`, không gắn vào snapshot mới. |
| B-08 | Câu 8 — fallback khi AI lỗi | Đề xuất lưu FAILED kèm mã lỗi; dựng `fallbackExplanation` từ evidence đã lưu khi trả 502/503. Giữ `retryable`, `recommendationId`, `fallbackExplanation`; TC-12 xác minh risk/evidence vẫn đọc được và không đổi risk task. | Contract đã quy định lưu FAILED trước khi trả 502/503 và có `retryable`, `recommendationId`, `fallbackExplanation`; chưa nói rõ fallback được dựng từ evidence đã lưu. | Đồng ý. Lưu bản ghi FAILED kèm mã lỗi; `fallbackExplanation` dựng từ evidence đã lưu khi trả response. |
| B-09 | Câu 9 — provider và port | Chưa cần port phụ thuộc OpenAI; port nhận context/evidence đã lọc, trả output chuẩn hóa và phân loại lỗi. OpenAI Responses API là provider đang thử; chốt provider/model sau lần gọi thật. | OpenAPI và ERD để mở provider/model; Architecture có port nhà cung cấp AI. Chưa có lần gọi thật được ghi nhận trong tài liệu. | Đồng ý, không đổi contract. Provider/model do CWRM-16 chốt sau lần gọi thật. |

## Bảng ghi nhận phản hồi

Phản hồi của Hiệp và Ban đã được ghi nhận từ comment Jira ngày 11/11/2026 và 12/11/2026 tương ứng; trạng thái và nội dung tóm tắt được ghi trong bảng dưới đây.

| Người review | Vai trò | Ngày nhận phản hồi | Phản hồi / điểm cần sửa | Trạng thái |
|---|---|---|---|---|
| Đặng Văn Hiệp | Frontend/UI/UX | 11/11/2026 | Tán thành enum và luồng API, đề nghị bổ sung thông tin hiển thị, trạng thái thao tác, schema phân trang và chi tiết lỗi; xem mục “Phản hồi của Hiệp (11/11/2026)”. | **ĐÃ PHẢN HỒI** — chấp nhận 4 tiêu chí nghiệm thu sau khi các điểm được ghi vào Review Log |
| Lê Quốc Ban | Risk Engine/AI/QA | 12/11/2026 | Chốt interface engine thuần, shape evidence, fingerprint, trạng thái lỗi và kiểm tra snapshot khi AI xử lý; xem mục “Phản hồi của Ban (12/11/2026)”. | **ĐÃ PHẢN HỒI** |

## Trạng thái tổng hợp

- Đã chuẩn bị câu hỏi và contract draft cho review CWRM-11.
- Kiểm tra tự động ngày 11/11/2026: `redocly lint` trên openapi.yaml không báo lỗi, còn 3 cảnh báo (thiếu license, server là localhost, /health không có response 4xx); 7 sơ đồ Mermaid trong Architecture và ERD render được. Đây là kiểm tra cú pháp tài liệu, chưa phải kiểm thử backend.
- Hiệp và Ban đã phản hồi trên Jira lần lượt ngày 11/11/2026 và 12/11/2026; các điểm được nhận đã áp dụng ở `0.2.0-draft` ngày 12/11/2026. Việc còn mở: danh mục R04–R12, quy tắc chuẩn hóa fingerprint và fixture digest cố định.
- ADR-001 ghi Tech Lead chấp thuận ngày 11/11/2026; nội dung ADR không được sửa trong lần cập nhật này.
- Kiểm tra tự động bản 0.2.0-draft ngày 12/11/2026: `redocly lint` trên openapi.yaml không báo lỗi, còn 3 cảnh báo như bản trước (thiếu license, server là localhost, /health không có response 4xx); 7 sơ đồ Mermaid trong Architecture và ERD render được. Đây là kiểm tra cú pháp tài liệu, chưa phải kiểm thử backend.
- Kiểm tra tự động bản 0.3.0-draft ngày 16/11/2026, sau khi đồng bộ FINAL-01..08: `redocly lint` trên openapi.yaml không báo lỗi, còn 3 cảnh báo như các bản trước (thiếu license, server là localhost, /health không có response 4xx); 7 sơ đồ Mermaid trong Architecture và ERD render được. Đây là kiểm tra cú pháp tài liệu, chưa phải kiểm thử backend. Bản 0.3.0-draft chưa có phản hồi review của Hiệp, Ban và Bảo.
- Không ghi nhận cuộc họp, quyết định nhóm hoặc kết quả tích hợp chưa diễn ra.

## Thay đổi ở 0.2.0-draft

| Thay đổi contract | Nguồn |
|---|---|
| `Task` có tên team/milestone/A/R, predecessors có title/status, `updatedAt`, `myRequestStatus`, `availableActions`; `risk` bắt buộc và nullable. | H-02, H-03, H-04, H-05 |
| `Eligibility` có `missingRoleIds` và `reasons` dạng mã kèm params; thêm lọc `taskId` cho request của tôi và nêu rõ request Pending bị từ chối khi đóng đăng ký. | H-02, H-04 |
| `TaskRiskSummary.triggeredRules` theo pattern R01–R12; thành viên team có `workspaceRole`. | Review Sprint 1 |
| AI error details có `snapshotId`; giải thích AI kiểm tra snapshot hiện hành lại sau khi xử lý. | H-07, B-07 |
| My Work gồm ba section phân trang riêng và counts. | H-08 |
| Can thiệp Manager trả `{ intervention, task }`; bản ghi intervention lấy từ audit. | H-11 |
| Mô tả field/unit evidence, ba evidence ngưỡng R03 và digest fingerprint đúng pattern; chưa khóa field/unit bằng enum và chưa thêm danh mục R04–R12. | B-02, B-03 |
| `RISK_INPUT_INVALID.details` là danh sách `{ field, problem }`; trạng thái chưa đánh giá là `Task.risk: null` và không có `CurrentRisk.snapshot`. | B-05 |
| `AIRecommendation` có telemetry tùy chọn `latencyMs` và `usage`; không lưu prompt thô. | B-06 |
| Nêu lưu FAILED cùng mã lỗi và dựng fallback từ evidence đã lưu khi trả response. | B-08 |
| Ghi rõ dependency tự trỏ trả 422 `DEPENDENCY_CYCLE`, khác team trả 422 `CROSS_TEAM_DEPENDENCY`. | Review CWRM-17 (TC-20) |

## Cập nhật theo Scope v0.2 Final — 0.3.0-draft (14/11/2026)

Nguồn cập nhật là Scope v0.2 Final (14/11/2026) kèm Clarification FINAL-01..08 (PM duyệt 15/11/2026) và giao việc CWRM-18. Phạm vi gồm đồng bộ OpenAPI, ERD, Architecture với S01–S12, R01–R13 và AC của Scope. Contract 0.2.0-draft đã được Hiệp và Ban xác nhận bị thay đổi phá vỡ: bỏ `PUT /workspaces/{workspaceId}/members/{userId}/roles` và `PUT /workspaces/{workspaceId}/members/{userId}/skills`, thay bằng `PUT /workspaces/{workspaceId}/my-skills` và `PATCH /teams/{teamId}/members/{userId}`; đổi `Task.openWorkOpen` thành object `Task.openWork` và bộ lọc `openWorkOpen` thành `openWorkState`; đổi `/tasks/{taskId}/capacity` thành `/tasks/{taskId}/required-people`; thay `Eligibility.eligible/reasons` bằng `canApply/blockedReason`; bỏ `ProgressUpdateRequest.effortActualHours`; đổi `Assignment.endReason` thành `endedReason`; xóa API explanations và `/ai-recommendations/{recommendationId}` cùng schema `AIRecommendation`/`AIExplanationResult`; thay rule ID R01–R12 bằng R01–R13 và đổi `ruleVersion` mới sang `2.0.0`. Các mã `NOT_ELIGIBLE`, `CROSS_TEAM_DEPENDENCY`, `AI_SNAPSHOT_LEVEL_NOT_SUPPORTED` và `SNAPSHOT_NOT_CURRENT` (nếu không còn operation dùng) bị bỏ; bổ sung các mã lỗi cho Open Work, confirmation, effort, Work Update, replacement và AI chat. Hiệp cần sửa `src/lib/api/client.ts` theo các tên endpoint/trường/mã lỗi này trước khi dùng contract mới.

### Truy vết DEC-CWRM9 và clarification actual effort

| Quyết định | Thay đổi cụ thể trong OpenAPI / ERD |
|---|---|
| DEC-CWRM9-01 | Không tác động contract. |
| DEC-CWRM9-02 | Direct Pending tiếp tục chiếm `occupiedSlots`; Open Work chính thức đóng không tự mở lại; `Task.openWork` có state/closedReason. |
| DEC-CWRM9-03 | Chặn thêm/thay/duyệt rút R khi REVIEW; confirmation từng assignment và Return chọn assignment reset. |
| DEC-CWRM9-04 | Task có `effortEstimateHours`/`effortActualHours`; Assignment có estimate/remaining; thêm effort endpoints, `member_capacities` và kiểm tổng allocation. |
| DEC-CWRM9-05 | R09 theo deadline tích lũy `/168`; thêm `evaluationCoverage`, `notEvaluated`, evidence theo horizon và capacity. |
| DEC-CWRM9-06 | Thêm R13, `currentInProgressSince`, `lastQualifyingActivityAt`, `lastQualifyingActivityType`, Work Update và ví dụ ruleVersion mới. |
| DEC-CWRM9-07 | `/risk-rules` R01–R13; blocker interval không phụ thuộc Task status; R08 bỏ BLOCKED; R10 có `currentReviewSince`; early dependency là Alert riêng. |
| DEC-CWRM9-08 | Xóa cơ chế recommendation/explanation; thêm AI thread/message, `AI_CHAT_ACCESS`, idempotency, retention và context checks. |
| DEC-CWRM9-09 | Không tác động contract. |
| DEC-CWRM9-10 | Không tác động contract. |
| DEC-CWRM9-11 | Atomic replacement qua `/assignments/{assignmentId}/replacements`, `replacesAssignmentId`, `endedReason`; kiểm transaction và lỗi cạnh tranh. |
| DEC-CWRM9-12 | Thêm `OPEN_WORK_TEMPORARILY_FULL`, `OPEN_WORK_CLOSED`, `openWorkState`, lý do đóng và quy tắc auto-reject. |
| DEC-CWRM9-13 | AI chat private theo user/task; tối đa 50 tin, prompt tối đa 10, TTL 90 ngày, xóa thread riêng, quyền thu hồi ngay và context allowlist. |
| DEC-CWRM9-14 | Assignment cũ giữ effort/checklist/confirmation làm lịch sử; R09 chỉ tính R active; thêm `taskRoleId`, `endedReason`. |
| DEC-CWRM9-15 | Snapshot có COMPLETE/PARTIAL; `risk_evaluation_gaps` và `notEvaluated[]`; tách coverage với stale và evaluationError. |
| DEC-CWRM9-16 | Thêm Work Update, server UTC activity type và timer R13; duplicate gần nhất trả `WORK_UPDATE_DUPLICATE`. |
| Clarification actual effort (bổ sung DEC-04) | `effortActualHours` task-level chỉ Manager đổi qua management intervention có reason/audit; không nhận ở request progress của R. |

### Trả lời bốn nhóm điểm của Ban (comment Jira 10071)

| Điểm Ban nêu theo thứ tự rà soát | Contract 0.3.0-draft quy định | Fixture của Ban |
|---|---|---|
| (a) R13 và rule version: mốc bắt đầu đợt, loại hoạt động reset, boundary 72h | Rule R13 dùng `currentInProgressSince`, `lastQualifyingActivityAt`, `lastQualifyingActivityType`; activity types `PROGRESS_CHANGED`, `CHECKLIST_CHANGED`, `RESPONSIBLE_CONFIRMED`, `WORK_UPDATE`; `elapsedHours`, threshold 72; comment/no-op/effort không reset. Rule catalog R01–R13; `ruleVersion=2.0.0` cho bộ Scope v0.2; snapshot cũ giữ version cũ. | Khớp: 71:59:59 chưa kích hoạt; đúng 72h kích hoạt MEDIUM, không boost riêng; Review/Blocked rồi quay lại IN_PROGRESS mở đợt mới. Đây là đối chiếu theo công thức, chưa phải kết quả chạy test. |
| (b) R09 và coverage: tích lũy theo từng deadline, missing-data, evidence ACL | Evidence có `subjectUserId`, `horizonAt`, `approvedWeeklyHours`, `remainingContinuousHoursToDeadline`, `availableHours`, `cumulativeRemainingHours`, `workloadRatioPercent` và ngưỡng 100/125. Gaps dùng `CAPACITY_NOT_DECLARED`, `CAPACITY_NOT_APPROVED`, `CAPACITY_ZERO`, `REMAINING_EFFORT_MISSING`; TaskRiskSummary có `evaluationCoverage`, `notEvaluatedCount`. | Tính lại: 21h/tuần × 24/168 = 3h; A: 4/3 ×100 = 133,33…%, nên HIGH ở mốc +24h. Đến +48h: available=6h, cumulative=4+2=6h, đúng 100%; mốc này không kích hoạt R09 và Task B không nhận R09 từ mốc sau; A vẫn giữ mức HIGH do mốc sớm. Fixture khớp. |
| (c) AI chat: Low, riêng tư, context mới, xử lý khi quyền/context đổi | `GET/POST/DELETE /tasks/{taskId}/ai-thread`, không nhận threadId; mỗi thread theo workspace/task/caller; `AI_CHAT_ACCESS`; max 50 tin, prompt tối đa 10, expiresAt 90 ngày. Lỗi: `AI_TURN_IN_PROGRESS` 409, `AI_CONTEXT_UNAVAILABLE` 422, `AI_CONTEXT_CHANGED` 409, mất quyền 403; lỗi provider lưu ASSISTANT FAILED và trả fallback details. | Hai R trên cùng task có thread riêng kể cả LOW; Manager không đọc thread người khác; kiểm quyền/context sau Gemini. Các fixture phù hợp; thêm assertion cho status/error shape và không lưu câu trả lời hợp lệ khi context đổi. |
| (d) QA regression AC02–09: Open Work, blocker, cross-Team dependency và ACL | Apply không gate Role/Skill; khi full tạm trả 409 `OPEN_WORK_TEMPORARILY_FULL`, khi đóng/chưa mở trả 422 `OPEN_WORK_CLOSED`; blocker không tự chuyển status; Manager dùng `/block` và `/unblock`; dependency khác Team cùng workspace được phép, khác workspace trả `CROSS_WORKSPACE_DEPENDENCY`, predecessor trả metadata tối thiểu. | Fixture khớp sau khi expected cập nhật từ contract cũ: bỏ NOT_ELIGIBLE/điều kiện cùng Team; thêm trạng thái tạm đầy/đóng chính thức và `decisionReasonCode`; resolve blocker cuối không tự unblock; member ngoài Team predecessor không gọi trực tiếp task/checklist/comment/work-update/AI thread. Chưa có kết quả regression. |

### Điểm cần review trên 0.3.0-draft

Trạng thái dưới đây ghi nhận phản hồi Jira ngày 17/11/2026, cập nhật lần cuối theo xác nhận của Ban (CWRM-18 comment 10102) và Hiệp (CWRM-18 comment 10108) trên `0.3.2-draft`, commit `d583949`. Không còn câu hỏi nào ở trạng thái chờ.

| Người review | Câu hỏi cụ thể | Trạng thái |
|---|---|---|
| Đặng Văn Hiệp | `Task.responsibleUsers[]` có đủ `assignmentId`, `taskRoleName`, `confirmedAt`, `effortEstimateHours`, `remainingEffortHours` để dựng màn Task/Review mà không gọi N+1 không? | ĐỒNG Ý (17/11, comment 10108) — Mảng chỉ gồm R Accepted đang hiệu lực; Direct đang chờ và lịch sử assignment lấy ở `/tasks/{taskId}/assignments`. |
| Đặng Văn Hiệp | `Task.openWork.state` cùng `openWorkState` filter có đủ phân biệt NOT_OPENED/OPEN/TEMPORARILY_FULL/CLOSED cho UI không? | ĐỒNG Ý (17/11, comment 10108) — UI quyết định Apply bằng `REQUEST_OPEN_WORK` hoặc `Eligibility.canApply/blockedReason`, gồm cả task IN_PROGRESS; Role/Skill không chặn Apply. |
| Đặng Văn Hiệp | Metadata `predecessors[]` gồm team/title/status/dependencyWarning có đủ hiển thị dependency khác Team không cần gọi API predecessor không? | ĐỒNG Ý (17/11, comment 10108) — Đủ cho Finish-to-Start khác Team cùng Workspace; UI không mở chi tiết task ngoài quyền. |
| Đặng Văn Hiệp | Alert per-task kèm `type`, `groupKey`, `resolvedAt` và lọc `resolved` có đủ để gộp trên UI mà vẫn giữ ACL không? | ĐỒNG Ý (17/11, comment 10108) — Backend lọc theo quyền người nhận qua `GET /alerts`. |
| Lê Quốc Ban | Evidence R09 theo horizon và bộ `reasonCode` có đủ kiểm fixture missing capacity/effort và lọc dữ liệu liên Team không? | CẦN ĐIỀU CHỈNH (17/11) — Công thức khớp; thiếu khóa nhóm evidence và quy tắc lọc cho history/alert/AI; đã sửa ở 0.3.1-draft. ĐỒNG Ý trên 0.3.2-draft (comment 10102). |
| Lê Quốc Ban | Các trường timer/activity và `ruleVersion=2.0.0` có đủ kiểm boundary/no-op/đợt IN_PROGRESS cho R13 không? | ĐỒNG Ý (17/11) — Đề nghị đổi tên reason; đã đổi. |
| Lê Quốc Ban | `AIMessage` cùng fallback `details.retryable/messageId/fallbackExplanation` có đủ biểu diễn SUCCESS/FAILED và ca thử lại không? | CẦN ĐIỀU CHỈNH (17/11) — Recheck trước fallback, shape FAILED và replay/retry; đã sửa ở 0.3.1-draft. ĐỒNG Ý trên 0.3.2-draft (comment 10102). |
| Đặng Văn Hiệp | `Task.availableActions` có thể hiển thị START và UPDATE_PROGRESS cho Manager ACTIVE khi đủ state guard không? | ĐỒNG Ý DÙNG LÀM NGUỒN QUYẾT ĐỊNH (17/11) — Hiệp đề nghị làm rõ phạm vi áp dụng và mã lỗi; đã bổ sung mô tả. |
| Đặng Văn Hiệp | UI có thể cho Decline DIRECT/REPLACEMENT không cần reason, đồng thời gửi reason không rỗng nếu người dùng tự nhập không? | ĐỒNG Ý (17/11) — Yêu cầu schema thể hiện optional và không gửi chuỗi rỗng; schema đã đúng, bổ sung mô tả. |
| Lê Quốc Ban | Bộ expected test có đủ kiểm tra quyền Start/progress của Manager và R cùng ngoại lệ resolve blocker chỉ sau khi assignment kết thúc không? | ĐỒNG Ý (17/11) cho Start/progress; nhánh đóng blocker của assignment đã kết thúc theo PM-03 (phương án B): Ban đã đối chiếu 7 ca Q1–Q7 và ĐỒNG Ý trên 0.3.2-draft (comment 10102). |
| Lê Đình Bảo (PM) | Xác nhận phương án mặc định kỹ thuật: Manager ACTIVE chỉ resolve blocker OPEN khi assignment gắn vào đã kết thúc, bắt buộc reason và audit; Manager không resolve blocker của R còn hiệu lực? | ĐÃ QUYẾT (17/11) — PM-03 phương án B, Jira CWRM-18 comment 10100: chỉ Manager ACTIVE là A hiện hành của task; Manager khác trả 403. Đã áp dụng ở 0.3.2-draft. |
| Lê Quốc Ban | Danh mục `/risk-rules` có đủ tên, baseLevel, boostable và mô tả để dùng làm nguồn rule catalog/fixture không? | ĐỒNG Ý (17/11) |

### Thay đổi ở 0.3.0-draft

| Thay đổi contract | Nguồn |
|---|---|
| `member_roles` và endpoint Manager sửa role/skill theo workspace được bỏ; thêm Main Role theo team và Member tự khai skill. | S02 |
| Task có `openWork` state object, `openWorkState` filter, predecessor/successor metadata, responsible confirmation/effort summary, blocker interval và `evaluationCoverage`. | S04–S11, DEC-CWRM9-12/15 |
| Thêm checklist per-assignment, withdrawal, atomic replacement, Task Role, effort allocation/remaining và weekly capacity. | S03, S04, S07 |
| Open Work bỏ eligibility gate Role/Skill; phân biệt TEMPORARILY_FULL với CLOSED và xác định mã lý do reject. | S05, DEC-CWRM9-02/12 |
| Review yêu cầu progress 100%, mọi R xác nhận, không blocker; Return chỉ reset xác nhận các R được chọn. | S06 |
| Blocker không tự chuyển task sang BLOCKED; Manager có `/block` và `/unblock`; dependency cho phép cross-Team trong Workspace. | S08–S09 |
| Risk mở R01–R13; thêm `/risk-rules`, `evaluationCoverage`, `notEvaluated`, `risk_evaluation_gaps`, R09 evidence và R13 timer fields. | S10, DEC-CWRM9-05/06/15/16 |
| Alert có `type`, `groupKey`, `ruleId`, `resolvedAt`; dashboard bổ sung coverage, workload, milestone, withdrawal và capacity summary. | S11 |
| Xóa explanation/recommendation một lượt; thay bằng private multi-turn AI chat, hai bảng thread/message và kiểm tra ACL/context. | S12, DEC-CWRM9-08/13 |
| Đổi/mở mã lỗi theo danh sách Scope v0.2 Final; loại bỏ lỗi gate eligibility, cùng-Team dependency và snapshot explanation. | S04–S12 |
| `startTask` và `createProgressUpdate` cho phép Manager ACTIVE và R Accepted hợp quyền; thay đổi progress thực của Manager là `PROGRESS_CHANGED` cho R13. | FINAL-03 |
| Decline DIRECT/REPLACEMENT không cần reason; nếu có thì lưu cùng actor, server timestamp, status, audit và giải phóng slot. | FINAL-04 |
| Resolve blocker theo assignment owner; mặc định chờ PM xác nhận cho Manager đóng blocker OPEN chỉ sau khi assignment kết thúc, với reason và audit. (Đã thay bằng PM-03 ở 0.3.2-draft.) | FINAL-06 |
| NQ05 làm rõ snapshot/evidence sau commit ≤5 giây, timer ≤60 phút theo server UTC và kiểm boundary bằng test clock/trigger MANUAL. | FINAL-02 |
| Milestone phải cùng team với task; thêm `MILESTONE_TEAM_MISMATCH` 422 cho create/update. | FINAL-05 |

## Đối chiếu Clarification FINAL-01..08 (15/11/2026)

| Clarification | Thay đổi trong OpenAPI / ERD / Architecture |
|---|---|
| FINAL-01 | Cập nhật nguồn căn cứ trong OpenAPI `info.description`, Trạng thái/Nguồn của Architecture và ERD, cùng mục cập nhật này của Review Log. |
| FINAL-02 | Mô tả `RiskSnapshot.triggerSource` và operation `evaluateTaskRisk`; Architecture mục 5 ghi NQ05 ≤5 giây sau commit, timer ≤60 phút/UTC, test clock và trigger MANUAL. |
| FINAL-03 | `startTask`, `createProgressUpdate`, `Task.availableActions`, `ProgressUpdateRequest`; Architecture mục 6/7 và ERD mục 6 làm rõ quyền Manager, state guard, audit và R13. |
| FINAL-04 | `respondToDirectAssignment`, `AssignmentResponseRequest`, `Assignment.responseReason`; ERD bảng `assignments` và mục 6 ghi reason Decline nullable/tùy chọn, slot được giải phóng và audit. |
| FINAL-05 | `createTask`, `updateTask`, `TaskCreateRequest`, `TaskPatchRequest` và mã `MILESTONE_TEAM_MISMATCH`; ERD đã có composite FK milestone-task cùng team. |
| FINAL-06 | `resolveBlocker`, `ResolveBlockerRequest`, `Blocker`, `TaskDependencySummary.dependencyWarning`, `Alert`; Architecture mục 5/6/7/10 và ERD bảng `blockers`/`alerts`, mục 6 làm rõ quyền owner, ngoại lệ Manager mặc định chờ PM xác nhận và early dependency trực tiếp độc lập R06/R07. |
| FINAL-07 | Điều chỉnh các contract location `startTask`/`createProgressUpdate`, milestone same-Team và NQ05 theo AC; các guard invitation, Manager cuối, R03 và early dependency đã được rà soát. |
| FINAL-08 | Không tác động contract. |
| Charter v1.0 | Architecture mục 2 gắn Task history/audit với module `audit`, Comments S08 với `progress`, Khôi là owner API/DB; mỗi phần có issue/AC riêng khi phân rã, chưa tạo issue. |

## Phản hồi review 0.3.0-draft (17/11/2026)

### Lê Quốc Ban — Risk/AI/QA (Jira CWRM-18, comment 10085)

- **R09 evidence/ACL:** công thức khớp; yêu cầu bổ sung khóa nhóm evidence và ghi quy tắc lọc cho history, alert, AI.
- **R13:** đồng ý hướng timer/activity và đề nghị đổi reason sang `NO_QUALIFYING_ACTIVITY`.
- **AI khi provider lỗi:** yêu cầu recheck quyền/context trước fallback, làm rõ shape `AIMessage` FAILED và quy tắc replay/retry.
- **Expected test:** đồng ý các ca quyền Start/progress; nhánh Manager đóng blocker OPEN của assignment đã kết thúc vẫn chờ Bảo tại thời điểm review; Bảo quyết sau đó ở PM-03.
- **`/risk-rules`:** đồng ý dùng danh mục làm nguồn rule catalog/fixture.

### Đặng Văn Hiệp — Frontend (Jira CWRM-18, comment 10090)

- **`Task.responsibleUsers[]`:** Khôi trả lời mảng chỉ gồm R hiện hành; Direct đang chờ và assignment đã kết thúc lấy ở `/tasks/{taskId}/assignments`; chờ Hiệp chốt.
- **`Task.openWork.state`:** Khôi đã trả lời bằng state, eligibility và mã lỗi; chờ Hiệp chốt.
- **`predecessors[]`:** Khôi đã trả lời; chờ Hiệp chốt.
- **Alert:** Khôi đã trả lời; chờ Hiệp chốt.
- **`availableActions` cho Manager:** đồng ý dùng làm nguồn quyết định; Hiệp đề nghị làm rõ phạm vi áp dụng và mã lỗi, đã bổ sung mô tả.
- **Decline không cần reason:** đồng ý; yêu cầu schema thể hiện reason tùy chọn và không gửi chuỗi rỗng; schema đã đúng, bổ sung mô tả.

Các phép tính của Ban là review tài liệu; các ca backend NOT RUN. Kết luận QA của Ban: đủ để tiếp tục thiết kế ca R13, catalog, Start/progress; chưa khóa assertion R09 ACL, AI hậu kiểm và nhánh resolve blocker của assignment đã kết thúc.

## Thay đổi ở 0.3.1-draft

Đây là thay đổi bổ sung, không phá vỡ so với 0.3.0-draft: thêm trường tùy chọn `groupId`, đổi một giá trị trong ví dụ, làm rõ mô tả và luồng.

| Thay đổi contract | Nguồn |
|---|---|
| **A — Phiên bản:** nâng contract và phần Trạng thái/Nguồn của Architecture/ERD lên `0.3.1-draft`; `ruleVersion` giữ `2.0.0`. | Ban, CWRM-18 comment 10085, mục 1–3; Hiệp, CWRM-18 comment 10090, điểm 1–6 |
| **B — R09 và ACL:** thêm `RiskEvidence.groupId` và ví dụ hai horizon; làm rõ `RiskEvaluationGap.message`, quy tắc lọc MEMBER/MANAGER cho snapshot hiện hành, history, alert và context AI; bổ sung cặp ví dụ Manager/Member và ranh giới gap với `RISK_INPUT_INVALID`. | Ban, CWRM-18 comment 10085, mục 1 |
| **C — R13:** đổi giá trị reason trong ví dụ thành `NO_QUALIFYING_ACTIVITY`. | Ban, CWRM-18 comment 10085, mục 2 |
| **D — AI:** recheck sau provider trước lưu/trả, định nghĩa fallback đã lọc, status/errorCode của tin, replay cùng ID và retry bằng ID mới; ERD giữ unique constraint và ghi chú cách xử lý. | Ban, CWRM-18 comment 10085, mục 3 |
| **E — Frontend:** làm rõ phạm vi `Task.responsibleUsers`, `Task.availableActions` và `AssignmentResponseRequest.reason` khi DECLINED. | Hiệp, CWRM-18 comment 10090, điểm 1, 5–6 |

## Quyết định PM-03 — 0.3.2-draft (17/11/2026)

Lê Đình Bảo (PM) chọn phương án B tại Jira CWRM-18 comment 10100, trả lời câu hỏi ở CWRM-19 comment 10099; quyết định đối chiếu WBS Final v1.0 dòng FC-P22/PM-03. Đây là ngoại lệ có điều kiện của FINAL-06:

- Khi assignment gắn với blocker còn hiệu lực, giữ FINAL-06: chỉ R chủ assignment resolve blocker của mình; Manager không mặc nhiên resolve blocker của R khác.
- Khi assignment đã kết thúc và blocker còn OPEN, chỉ người đồng thời là Manager ACTIVE của workspace và A hiện hành của task được resolve. Manager ACTIVE khác nhận 403 `FORBIDDEN`.
- Lý do bắt buộc, không rỗng; audit ghi actor, thời điểm server UTC, blocker, assignment, task và thay đổi trạng thái. Việc R rời task không phải bằng chứng blocker đã được xử lý.
- A không còn hợp lệ thì chuyển A có audit trước; không mở quyền resolve cho mọi Manager.
- Resolve blocker không tự unblock task và không đổi progress, R hay trạng thái Review/Done. Lịch sử blocker và assignment được giữ.

### Ca QA cần đối chiếu (Bảo yêu cầu; expected theo contract, chưa chạy)

| Ca | Thiết lập | Expected |
|---|---|---|
| Q1 — R còn hiệu lực | Assignment ACCEPTED chưa kết thúc; R chủ assignment gọi resolve | 200, blocker RESOLVED; resolutionNote tùy chọn |
| Q2 — R còn hiệu lực, Manager gọi | Như Q1 nhưng người gọi là Manager, kể cả A | 403 `FORBIDDEN`, blocker vẫn OPEN |
| Q3 — R đã kết thúc + đúng A | Assignment ended; người gọi là Manager ACTIVE và A hiện hành; có resolutionNote | 200, blocker RESOLVED, `resolvedByUserId` = A, audit đủ trường |
| Q4 — R đã kết thúc + Manager khác | Assignment ended; người gọi là Manager ACTIVE nhưng không phải A | 403 `FORBIDDEN`, blocker vẫn OPEN |
| Q5 — Thiếu lý do | Như Q3 nhưng không gửi resolutionNote hoặc gửi chuỗi rỗng | 400 `VALIDATION_ERROR`, blocker vẫn OPEN |
| Q6 — Đổi A | Chuyển A qua `POST /tasks/{taskId}/accountable`, rồi A cũ và A mới lần lượt gọi resolve | A cũ 403 `FORBIDDEN`; A mới 200 |
| Q7 — Blocker cuối | Task BLOCKED, resolve theo Q3 blocker OPEN cuối cùng | 200; task vẫn BLOCKED, progress/R không đổi; chỉ về IN_PROGRESS khi Manager gọi `/unblock` |

### Thay đổi ở 0.3.2-draft

So với 0.3.1-draft, `resolveBlocker` hẹp quyền: Manager ACTIVE không phải A trước đây được resolve blocker của assignment đã kết thúc, nay nhận 403. Không đổi shape request/response, cột hay bảng.

| Thay đổi contract | Nguồn |
|---|---|
| `info.version` lên `0.3.2-draft`; Trạng thái Architecture/ERD cập nhật. | PM-03 |
| `resolveBlocker`: `x-permission` đổi từ `[ASSIGNMENT_OWNER, WORKSPACE_MANAGER]` thành `[ASSIGNMENT_OWNER, TASK_ACCOUNTABLE]`; mô tả ghi ngoại lệ PM-03, chuyển A, audit, không tự unblock. | PM-03, CWRM-18 comment 10100 |
| `ResolveBlockerRequest.resolutionNote` bắt buộc với A khi resolve theo ngoại lệ. | PM-03 |
| `Task.availableActions`: `RESOLVE_BLOCKER` chỉ có cho Manager khi là A hiện hành, assignment đã kết thúc và blocker còn OPEN. | PM-03 |
| Architecture mục 6, 7 và 8; ERD bảng `blockers`, bảng quy tắc và ghi chú cuối: bỏ chữ "chờ PM xác nhận", ghi quyết định PM-03. | PM-03 |

## Xác nhận review 0.3.2-draft (17/11/2026)

Hai người review đã xác nhận trên OpenAPI `0.3.2-draft`, commit `d583949`. Contract không đổi sau các xác nhận này; mục này chỉ ghi kết luận vào Review Log.

### Lê Quốc Ban — Risk/AI/QA (Jira CWRM-18, comment 10102; CWRM-28 comment 10112)

- **R09/ACL:** đồng ý. `groupId` theo R/horizon và một quy tắc lọc chung cho current, history, alert và context AI; ví dụ Manager/Member ẩn `subjectUserId` ngoài quyền và `message` không nhận diện. +24 giờ 133,33% kích hoạt HIGH, +48 giờ 100% không kích hoạt riêng; `remaining = 0` hợp lệ; thiếu dữ liệu ra PARTIAL kèm gap.
- **AI hậu kiểm:** đồng ý. Kiểm lại quyền và context sau mọi kết quả Gemini, trước khi lưu hoặc trả fallback; mất quyền 403, context đổi 409, giải phóng khóa, không lưu lượt và không trả fallback. Cùng `clientMessageId` là replay kể cả lượt FAILED; ID mới cho retry chủ động.
- **PM-03:** Q1–Q7 khớp OpenAPI và ERD.
- Kết luận: đạt ở mức review contract và expected test; Ban dùng contract này để khóa expected. Phiếu review và fixture lưu trong thư mục Drive của CWRM-28.

### Đặng Văn Hiệp — Frontend (Jira CWRM-18, comment 10108; CWRM-25 comment 10113)

- Đồng ý bốn điểm còn mở: `Task.responsibleUsers[]`, `Task.openWork.state`, `predecessors[]/successors[]`, Alert (chi tiết ở bảng "Điểm cần review trên 0.3.0-draft").
- `availableActions` chỉ có trên `Task`, backend kiểm lại khi thực thi; Decline bỏ hẳn `reason`, không gửi chuỗi rỗng.
- Theo PM-03, nút resolve blocker của assignment đã kết thúc chỉ hiện cho Manager ACTIVE là A hiện hành khi `availableActions` có `RESOLVE_BLOCKER`; resolve không tự unblock task.
- Kết luận: đạt phần review frontend, không yêu cầu đổi schema. Danh sách ảnh hưởng frontend ở CWRM-25 comment 10096.

### Trạng thái

- Mọi câu hỏi review trên 0.3.0-draft đã đóng; PM-03 đã quyết.
- Đây là xác nhận tài liệu và expected behavior. Chưa có mã backend theo contract này; toàn bộ ca backend/E2E vẫn NOT RUN.
- Còn lại: Lê Đình Bảo (PM) nghiệm thu CWRM-18.

## Thay đổi ở 0.3.3-draft (17/11/2026)

Khi bắt đầu CWRM-24 (Auth Core & Workspace Bootstrap API), hai chỗ contract còn để ngỏ được Khôi (Tech Lead) chốt. Không đổi bảng, cột hay shape response. Ràng buộc mật khẩu là thay đổi hẹp đầu vào: client đang gửi mật khẩu dưới 8 ký tự hoặc trên 72 byte sẽ nhận 400.

| Thay đổi contract | Lý do |
|---|---|
| `info.version` lên `0.3.3-draft`; Trạng thái Architecture/ERD cập nhật. | — |
| `RegisterRequest.password`: ít nhất 8 ký tự, tối đa 72 byte UTF-8, không trim; vi phạm trả 400 `VALIDATION_ERROR`. | 0.3.2-draft không có giới hạn. bcrypt (ADR-001) chỉ dùng 72 byte đầu, nên không giới hạn thì hai mật khẩu chung 72 byte đầu đều đăng nhập được. |
| `LoginRequest.password`: không áp tối thiểu; mật khẩu trên 72 byte trả 401 như sai mật khẩu. | Không cho phần vượt 72 byte bị bcrypt cắt ngầm khi so khớp. |
| `WORKSPACE_MEMBER`/`WORKSPACE_MANAGER`, `getWorkspace`, `updateWorkspace`: người không có membership ACTIVE (kể cả INACTIVE) nhận 404 `NOT_FOUND`, cùng body với workspace không tồn tại; Member ACTIVE gọi thao tác chỉ Manager được làm nhận 403 `FORBIDDEN`. | Trả lời câu hỏi 403/404 của Ban ở CWRM-31; thống nhất với cách contract xử lý task khác Team (404, không lộ ID). |

## Hoàn thiện theo PM review CWRM-18 (18/11/2026)

Bảo (PM/BA) review 0.3.3-draft ở Jira CWRM-18 comment 10127: đạt về nội dung cả bốn AC, yêu cầu hoàn thiện ba việc trước khi nghiệm thu. Các sửa dưới đây chỉ là diễn đạt, truy vết và minh chứng; `info.version` giữ `0.3.3-draft`, không đổi endpoint, schema, mã lỗi, bảng hay cột, nên không cần Ban và Hiệp review lại.

| Yêu cầu của PM | Cách xử lý |
|---|---|
| Câu về Scope v0.1/D1–D6 ở mục "Điểm contract khác bản nháp hiện có" dễ gây hiểu lầm | Giữ nguyên câu lịch sử, thêm ghi chú ngay dưới: baseline hiện hành là Scope v0.2 Final + FINAL-01..08; Scope v0.1 chỉ để đối chiếu. |
| Architecture mục 10 thiếu AC14 | Thêm dòng AC14 và ghi rõ AC14 là tiêu chí nghiệm thu tổng thể DEL01–DEL06, không thuộc phần CWRM-18 phải triển khai hay chứng minh chạy thật. |
| Minh chứng `redocly lint` và render Mermaid | Chạy lại trên commit hoàn thiện; log lint và ảnh render 7 sơ đồ đính kèm Jira CWRM-18 cùng commit. |

## Review Candidate 0.3.4-draft (24/11/2026)

**Trạng thái:** Review Candidate. Ngày 26/11/2026 PM duyệt **thiết kế** P-01, P-02 và P-03 (22 quy tắc, CWRM-33 #10203), nhưng **chưa phát hành** contract. Baseline đang áp dụng vẫn là `0.3.3-draft` trên `main`. Nhánh `feature/CWRM-33-contract-0.3.4-draft` chỉ sửa `openapi.yaml`, `CWRM-11_ERD.md` và file này. PR để ở dạng Draft và chỉ merge sau khi PM duyệt. Không đổi Scope v0.2 Final, FINAL-01..08 hay WBS Final v1.0.

**Nguồn:** CWRM-33 mục "Authorized pre-sprint preparation"; PM decision EST-03 (CWRM-32 #10174); Khôi xác nhận nội dung ở CWRM-33 #10181. Ba điểm L1–L3 là chỗ contract lệch ERD, phát hiện khi lập plan WP-014B ngày 23/11.

Candidate gồm ba đề xuất:

- **P-01 (L1–L3 và ngữ nghĩa `PUT my-skills`)** cần cho WP-014B. PM duyệt thiết kế 26/11.
- **P-02 (`422 FILTER_NOT_AVAILABLE` cho `GET /tasks`)** cần cho WP-015A. PM duyệt thiết kế 26/11.
- **P-03 (cùng quy tắc cho `GET /dashboard/manager`)** do PM thêm khi trả lời câu hỏi dashboard ở #10203. Chỉ là đặc tả contract, không mở rộng phạm vi triển khai của CWRM-33/34 hay Sprint 3.

### P-01 — Đồng bộ contract với ERD cho Member, Team và Skill

| ID | Lệch ở 0.3.3-draft | Thay đổi ở 0.3.4-draft | File |
|---|---|---|---|
| L1 | `WorkspaceMembership.roleIds` vẫn còn, trong khi ERD đã bỏ `member_roles` và chuyển Main Role sang Team. | Bỏ `roleIds`. Main Role đọc qua `TeamMembership.mainRoleId` theo từng team. Mô tả `listWorkspaceMembers`/`getWorkspaceMembership` đổi "nhãn role/skill" thành "tập skill". | openapi |
| L2 | `TeamMembership.version` và `TeamMemberMainRolePatchRequest.expectedVersion` đã có, nhưng bảng `team_memberships` không có cột version. | Thêm `team_memberships.version INTEGER NN DEFAULT 1` vào ERD. API không đổi. | ERD |
| L3 | `MySkillsRequest.expectedVersion` đã có, nhưng `member_skills` là tập dòng, không có chỗ lưu version, và client cũng không đọc được version hiện tại. | Thêm `workspace_memberships.skills_version INTEGER NN DEFAULT 1`. API trả `WorkspaceMembership.skillsVersion`. | ERD, openapi |
| L3a | `PUT my-skills` trả `LabelSet { labelIds }`, không có version. Response chưa khai 409. | Response đổi sang schema mới `MySkillSet { skillIds, version }`. Thêm response 409. Xóa schema `LabelSet` vì không còn operation nào dùng. | openapi |
| L3b | `WorkspaceMembership.skillIds` và `skillsVersion` chỉ nằm trong `properties`, nên response thiếu hai trường này vẫn hợp lệ, và UI không chắc có `expectedVersion` để gọi `PUT my-skills`. Ban nêu ở CWRM-33 #10186, Hiệp nêu lại ở #10193. | Đưa `skillIds` và `skillsVersion` vào `required` của `WorkspaceMembership`. Member chưa khai skill thì trả `skillIds: []` kèm version hiện tại. Áp dụng cho cả 4 response dùng schema này: `listWorkspaceMembers` (qua `MembershipPage`), `getWorkspaceMembership`, `updateWorkspaceMembership` và `acceptWorkspaceInvitation`. Cả 4 đều thuộc WP-014B, chưa có mã nên không vỡ backend. | openapi |

Ngữ nghĩa `PUT /workspaces/{workspaceId}/my-skills` ghi trong mô tả operation:

1. Version thuộc cả tập skill và bắt đầu từ 1, kể cả khi Member chưa khai skill nào.
2. `skillIds: []` là hợp lệ và xóa hết skill.
3. `expectedVersion` khác version hiện tại thì trả 409 `VERSION_CONFLICT`, tập skill giữ nguyên.
4. Gửi đúng tập đang có là no-op: trả 200 với version hiện tại, không tăng version.
5. Mỗi lần tập thay đổi thật, version tăng đúng 1 trong cùng transaction với việc ghi `member_skills`. Response luôn trả version hiện tại sau request.

Điểm 4 là lựa chọn của Khôi: no-op không tăng version, theo cùng cách R13 không coi no-op là hoạt động. Phương án còn lại là tăng version ở mọi lần PUT thành công. Ban đồng ý ở CWRM-33 #10186, với điều kiện kiểm `expectedVersion` trước khi xét no-op: gửi lại đúng tập đang có nhưng version cũ vẫn trả 409.

### P-02 — `GET /tasks` với bộ lọc chưa hỗ trợ (EST-03)

| Thay đổi | Chi tiết |
|---|---|
| Mã lỗi mới | `FILTER_NOT_AVAILABLE` (422), thêm vào bảng mã ở `info.description` và enum `ErrorResponse.error.code`. |
| Response mới | `components.responses.FilterNotAvailable`, ví dụ `details: { unsupportedFilters: [openWorkState, riskLevel] }`. Từ commit P-03, response này dùng schema `FilterNotAvailableError` (xem P-03). |
| `listTasks` | Mô tả ghi quy tắc EST-03 và khai thêm response 400, 404 và 422. Bộ lọc nằm trong phạm vi: `riskLevel` (chờ risk snapshot), `responsibleUserId` (chờ assignment ACCEPTED còn hiệu lực), `openWorkState` (chờ trạng thái Open Work). |

Quy tắc:

1. Query có bất kỳ bộ lọc nào ở trên mà module nguồn chưa có thì trả 422, kể cả khi đi cùng bộ lọc đã hỗ trợ.
2. `details.unsupportedFilters` liệt kê đúng các bộ lọc đó, sắp theo tên để test so khớp ổn định.
3. Server không bỏ qua bộ lọc, không trả 200 với `items` rỗng để che việc chưa hỗ trợ và không gán giá trị mặc định.
4. Kiểm quyền workspace chạy trước: người không có membership ACTIVE vẫn nhận 404.
5. Query chỉ gồm bộ lọc đã hỗ trợ mà không khớp task nào thì trả 200 với `items` rỗng.
6. Khi module nguồn sẵn sàng, bộ lọc tương ứng chạy trên dữ liệu thật và không còn trả mã này. Lúc đó cần một bản contract mới ghi nhận.

**Ngoài phạm vi P-02:** `GET /dashboard/manager` có cùng ba bộ lọc. EST-03 chỉ nói `GET /tasks`, nên bản đầu của candidate không sửa operation này và hỏi PM. PM quyết ở #10203, xem P-03.

### P-03 — `GET /dashboard/manager` với bộ lọc chưa hỗ trợ (CWRM-33 #10203, 26/11/2026)

| Thay đổi | Chi tiết | Quy tắc PM |
|---|---|---|
| Mô tả `getManagerDashboard` | Có `riskLevel`, `responsibleUserId` hoặc `openWorkState` mà module nguồn chưa có thì cả request trả 422 `FILTER_NOT_AVAILABLE`, kể cả khi đi cùng bộ lọc đã hỗ trợ. Không trả số đếm 0, risk LOW hay danh sách rỗng để che. Bộ lọc đã hỗ trợ chạy trên dữ liệu thật, ngữ nghĩa các chỉ số giữ nguyên. Ghi rõ dashboard triển khai ở WP riêng, không thuộc WP-015A. | P03.1, P03.4, P03.5, P03.7 |
| Response 422 | Khai `'422': FilterNotAvailable`, dùng chung response và `details.unsupportedFilters` với `listTasks`. | P03.2 |
| Response 400 | Khai thêm `'400': BadRequest`. Baseline chưa khai 400 cho operation này, trong khi P02.5/P03.3 yêu cầu validation chạy trước 422; giá trị enum sai trong query vẫn phải ra 400 chứ không phải 422. | P03.3 |
| Quyền | Giữ `x-permission: WORKSPACE_MANAGER` và 401/403 như baseline. Không thêm 404, vì đổi cách trả lỗi quyền nằm ngoài P-03. | P03.3 |
| Schema lỗi mới `FilterNotAvailableError` | `allOf` của `ErrorResponse` (phong bì giữ nguyên), siết thêm: `code` chỉ là `FILTER_NOT_AVAILABLE`; `details` bắt buộc có `unsupportedFilters` và không có trường khác; `unsupportedFilters` có ít nhất 1 phần tử, không trùng, mỗi phần tử thuộc `[openWorkState, responsibleUserId, riskLevel]`. Thứ tự sắp theo tên không diễn đạt được bằng JSON Schema nên vẫn là quy tắc của operation và là một ca QA. | Yêu cầu hoàn thiện 2 của #10203 |

Khi một module nguồn sẵn sàng, tên bộ lọc tương ứng phải được gỡ khỏi enum của `unsupportedFilters` trong cùng bản contract ghi nhận việc đó (P02.8).

### Ảnh hưởng

- **Frontend:** `frontend/src` trên `main 7f8ebb7` chưa dùng `roleIds`, `labelIds`, `my-skills`, và chưa gửi ba bộ lọc trên lên `GET /tasks`, nên không có chỗ nào vỡ. WP-016B (màn My Skills) đọc `skillsVersion` từ `GET /workspaces/{workspaceId}/members/{userId}` và gửi lại làm `expectedVersion`. WP-017A hiển thị 422 thành thông báo "bộ lọc chưa hỗ trợ", không hiển thị thành "0 công việc".
- **Backend:** `src/common/errors/error-codes.ts` chỉ thêm `FILTER_NOT_AVAILABLE` trong WP-015A, sau khi P-02 được duyệt. Hai cột mới đi vào migration của WP-014B.
- **Architecture:** không đổi luồng hay module nên `CWRM-11_Architecture.md` giữ nguyên trong candidate này. Dòng Trạng thái của file đó sẽ cập nhật khi PM duyệt.

### Câu hỏi review

| Người review | Câu hỏi |
|---|---|
| Đặng Văn Hiệp | Response `MySkillSet`, trường `skillsVersion` trên membership và cách UI xử lý 409 khi PUT my-skills có đủ cho WP-016B không? Thông báo 422 `FILTER_NOT_AVAILABLE` dựa trên `details.unsupportedFilters` có đủ cho WP-017A không? |
| Lê Quốc Ban | Năm điểm ngữ nghĩa my-skills, nhất là no-op không tăng version, và sáu quy tắc P-02 có đủ để viết expected cho WP-020B không? |
| Lê Đình Bảo (PM) | Duyệt P-01 và P-02, riêng hoặc cùng lúc, và quyết điểm `GET /dashboard/manager`. Đã trả lời ở #10203 (26/11). |

### Phản hồi review (24–25/11/2026)

| Người review | Nội dung | Xử lý trong candidate |
|---|---|---|
| Lê Quốc Ban (CWRM-33 #10186, 24/11) | P-01: `skillIds` và `skillsVersion` phải vào `required` của `WorkspaceMembership`. Đồng ý no-op không tăng version, nếu kiểm `expectedVersion` trước. P-02 đủ cơ sở viết expected. `GET /dashboard/manager` cần PM quyết riêng. Đây là review tài liệu, chưa xác nhận toàn PR đạt. | Sửa theo L3b. Ghi điều kiện no-op ở điểm 4. Điểm dashboard để PM quyết. |
| Đặng Văn Hiệp (CWRM-33 #10193, 25/11) | Cùng ý `required` với Ban. UI dùng version từ response, cho gửi tập rỗng, gặp 409 thì báo dữ liệu đã đổi và tải lại; 422 `FILTER_NOT_AVAILABLE` hiển thị là bộ lọc chưa sẵn sàng, sau khi P-02 được duyệt. Hiệp xác nhận P-01 sau khi đối chiếu bản sửa. | Sửa theo L3b. Hiệp đã đối chiếu, xem dòng #10206. |
| Lê Quốc Ban (CWRM-33 #10195, 26/11) | Đối chiếu `5a28da3`: điểm chặn ở #10186 đã xử lý, **P-01 đạt review tài liệu** phía QA. P-02 đủ cơ sở viết ca ACL, tổ hợp filter và 422. Dashboard chờ PM. | Không cần sửa. Nhờ Ban review P-02/P-03 trên commit P-03. |
| Lê Đình Bảo (CWRM-33 #10203, 26/11) | Duyệt thiết kế 22 quy tắc P01.1–P01.7, P02.1–P02.8, P03.1–P03.7; chưa phát hành contract. Yêu cầu bổ sung P-03, kiểm schema của `unsupportedFilters`, chạy lại lint; không tự merge PR #10, không phát hành `0.3.4-draft`, không chuyển CWRM-33/34 sang Done. | Thêm mục P-03 và schema `FilterNotAvailableError`. Trình lại commit cuối để PM nghiệm thu contract. |
| Đặng Văn Hiệp (CWRM-34 #10206, 26/11) | Đối chiếu `5a28da3`: L3b và ngữ nghĩa My Skills đủ cho WP-016B, **P-01 đạt review tài liệu** phía frontend. Chưa xác nhận toàn PR, chờ P-03 và schema lỗi 422. | Nhờ Hiệp review P-03 và schema 422 trên commit P-03. |

### Hoàn thiện theo PM #10219 (27/11/2026)

**Nguồn:** CWRM-33 #10219. PM duyệt hướng hoàn thiện C33-01.1–C33-03.3 (phương án B) và C33-04.1–04.10. Đây chưa phải nghiệm thu hay phát hành contract. Đầu vào: 10 điểm contract chưa quy định mà build PR #11 `0ac40e3` đã tự chọn (`backend/README.md`, CWRM-33 #10212), và 4 sai lệch CD-01–CD-04 Ban tìm thấy khi QA (CWRM-33 #10216, CWRM-39 #10217). Baseline vẫn là `0.3.3-draft` cho tới khi PM cho phát hành `0.3.4-draft` (C33-04.10).

Commit này chỉ sửa `openapi.yaml` và file này. ERD không đổi: không quyết định nào thêm cột, bảng hay ràng buộc mới. Mọi kiểm tra miền và trạng thái đã có trong ERD hoặc thuộc tầng ứng dụng.

#### Truy vết 10 quyết định

| ID | Quyết định PM | Thay đổi contract | Build PR #11 |
|---|---|---|---|
| C33-01.1 | Tên Team/Role/Skill không trùng trong cùng workspace (không phân biệt hoa thường), workspace khác được trùng. Vi phạm trả 409 `UNIQUE_CONFLICT`. | Khai `409` cho `updateTeam`, `updateRole`, `updateSkill` (CD-03). Ghi quy tắc vào mô tả cả 3 operation tạo và 3 operation sửa, và vào dòng `UNIQUE_CONFLICT` của bảng mã lỗi. | Đã đúng ở `0ac40e3`. |
| C33-01.2 | Accept/Decline chỉ với lời mời PENDING. Approve Capacity chỉ khi Member đã khai và đang PENDING_APPROVAL. Sai trạng thái trả 422 `INVALID_STATE_TRANSITION`, không ghi thay đổi. | Khai `422` cho `acceptWorkspaceInvitation`, `declineWorkspaceInvitation` (CD-01) và `approveMemberCapacity` (CD-02). Mô tả ghi rõ lần Accept/Decline thứ hai và trường hợp duyệt khi chưa khai hoặc đã APPROVED. `409` vẫn giữ theo C33-01.2 ("giữ 409 VERSION_CONFLICT và xung đột thực sự phù hợp"). Riêng accept/decline không có version nên build hiện chưa trả 409 ở hai operation này. | Đã đúng ở `0ac40e3`. |
| C33-01.3 | Tham chiếu sai trong body trả 400 `VALIDATION_ERROR`, không bỏ qua ID, không ghi một phần. | Mô tả `addTeamMember` (`details.fields.userId`), `setTeamMemberMainRole` (`details.fields.mainRoleId`), `replaceMySkills` (`details.unknownSkillIds`). | Đã đúng ở `0ac40e3`. |
| C33-01.4 | Chặn xóa Role/Skill còn tham chiếu: 409 `UNIQUE_CONFLICT`, `details.reason=IN_USE` kèm số tham chiếu. Không xóa dây chuyền, không thêm mã lỗi mới. | Mô tả `deleteRole`, `deleteSkill` và bảng mã lỗi. | Đã đúng ở `0ac40e3`. |
| C33-02.1 | 401 khi chưa xác thực; 403 khi thấy tài nguyên nhưng thiếu quyền; 404 khi tài nguyên không tồn tại hoặc ngoài phạm vi được thấy. | Khai `404` cho `declareMyCapacity` (CD-04). Bảng `x-permission`: SELF trả 404 khi caller ngoài workspace hoặc khi lời mời là của người khác; TEAM_ACCESS không đạt trả 404; WORKSPACE_MANAGER trên tài nguyên của team mà Member không thuộc team trả 404. Sửa ý nghĩa 403/404 trong bảng mã lỗi. | **Sửa ở commit mới:** trước đây Member gọi thao tác Manager trên team mình không thuộc (ví dụ `PATCH /teams/{teamId}`) nhận 403, làm lộ team có tồn tại. Nay trả 404 như `GET`; Member của team đó vẫn nhận 403. |
| C33-02.2 | Gỡ hoặc vô hiệu hóa membership thì team membership trong workspace đó chuyển INACTIVE trong cùng transaction với audit. Tham gia lại không tự khôi phục team. | Mô tả `updateWorkspaceMembership`, `removeWorkspaceMembership`, `acceptWorkspaceInvitation`, `addTeamMember`. | Cascade và việc không khôi phục team đã đúng ở `0ac40e3`. **Sửa ở commit mới:** thêm lại người cũ vào team trước đây khôi phục luôn `mainRoleId` cũ. Nay đặt `mainRoleId = null`, Manager đặt lại Main Role. |
| C33-02.3 | Chặn gỡ, hạ quyền hoặc vô hiệu hóa Manager ACTIVE cuối (422 `LAST_MANAGER_REQUIRED`, kể cả request đồng thời). Chặn với Manager đang là A của task chưa DONE, và chặn gỡ khỏi team người đang là A của task chưa DONE trong team đó (422 `RESPONSIBILITY_REQUIRED`). Giữ guard R. | Mô tả `updateWorkspaceMembership`, `removeWorkspaceMembership`, `removeTeamMember`. Ghi rõ guard R áp dụng khi module assignment có dữ liệu. | Guard Manager cuối và guard A đã đúng ở `0ac40e3`. **Guard R chưa kiểm được:** schema chưa có bảng `assignments` (thuộc WP-024A/B, WP-026), nên hiện không có R nào có thể bị mất. Theo C33-02.3, phần này ghi là phụ thuộc và phải kiểm khi module sẵn sàng, không coi là PASS. |
| C33-03.1 | `declaredWeeklyHours` và `approvedWeeklyHours` từ 0 đến 168, tối đa 2 chữ số thập phân. Sai miền trả 400, không làm tròn. Khai lại giữ số đã duyệt. Số đã duyệt bằng 0 hoặc chưa có thì R09 là NOT_EVALUATED. | `maximum: 168` và mô tả cho `CapacityDeclarationRequest`, `CapacityApprovalRequest`, `MemberCapacity`. Mô tả `declareMyCapacity`, `approveMemberCapacity`. Giới hạn 2 chữ số thập phân ghi bằng lời, không dùng `multipleOf: 0.01` vì số thực nhị phân làm validator báo sai với giá trị hợp lệ như `0.07`. | Đã đúng ở `0ac40e3`. |
| C33-03.2 | Kiểm quyền, request, expectedVersion rồi mới xét no-op. Version cũ trả 409 kể cả khi payload giống hiện tại. No-op trả 200, giữ version, không ghi audit. | Mô tả `setTeamMemberMainRole` ghi thứ tự kiểm. | **Sửa ở commit mới:** trước đây kiểm `expectedVersion` trước khi kiểm `mainRoleId`, nên `mainRoleId` sai kèm version cũ trả 409. Nay trả 400. Quy tắc no-op giữ nguyên. |
| C33-03.3 | `GET /workspace-invitations` chỉ trả lời mời của caller, đủ 3 trạng thái, mới nhất trước, thứ tự ổn định khi phân trang. Chỉ in-app, không email, không hạn dùng. | Mô tả `listMyWorkspaceInvitations`. | Đã đúng ở `0ac40e3` (`createdAt` giảm dần, cùng thời điểm thì theo `id`). |

#### CD-01–CD-04

| ID | Operation | Khai báo trước | Khai báo mới | Trạng thái |
|---|---|---|---|---|
| CD-01 | `acceptWorkspaceInvitation`, `declineWorkspaceInvitation` | 409, thiếu 422 | Thêm 422 | Chờ Ban retest |
| CD-02 | `approveMemberCapacity` | thiếu 422 | Thêm 422 | Chờ Ban retest |
| CD-03 | `updateTeam`, `updateRole`, `updateSkill` | thiếu 409 | Thêm 409 | Chờ Ban retest |
| CD-04 | `declareMyCapacity` | thiếu 404 | Thêm 404 | Chờ Ban retest |

Tổng cộng 7 khai báo status được thêm, khớp với 7 khai báo Ban đếm ở CWRM-33 #10221. Theo C33-04.5, CD-01–04 vẫn mở cho tới khi Ban xác nhận trên đúng SHA.

### Minh chứng

- `redocly lint` (recommended): hợp lệ, 3 cảnh báo, giống hệt baseline 0.3.3-draft (`info-license`, server `localhost`, `/health` không có response 4xx). Không có cảnh báo mới.
- Render Mermaid (`@mermaid-js/mermaid-cli`): cả 3 sơ đồ của `CWRM-11_ERD.md` render được, kể cả sơ đồ mục 2 có thêm hai cột. Architecture không đổi nên không render lại.
- Commit P-03 (26/11/2026): `redocly lint` 2.84.0 (recommended) hợp lệ, 3 cảnh báo, giống baseline. Ví dụ của `FilterNotAvailable` khớp schema mới. Kiểm phủ định bằng cách sửa tạm ví dụ: `unsupportedFilters: []`, tên ngoài danh sách (`teamId`), phần tử trùng, `code` khác và `details` có trường thừa đều bị rule `no-invalid-media-type-examples` bắt. ERD và Architecture không đổi trong commit này nên không render lại sơ đồ.
- Commit hoàn thiện theo #10219 (27/11/2026): `redocly lint` 2.84.0 (recommended) hợp lệ, 3 cảnh báo, giống baseline. Script đọc `openapi.yaml` bằng `js-yaml` xác nhận đủ 7 khai báo của CD-01–04; cùng script trên `633ac0f` báo thiếu cả 7. Build đối chiếu: PR #11 `acc4b0f`, lint, typecheck, build đạt; unit 39/39, e2e 4/4, `test:int` 40/40 với PostgreSQL 17. ERD và Architecture không đổi nên không render lại sơ đồ.
