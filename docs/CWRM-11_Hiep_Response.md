# CWRM-11 — Phản hồi của Hiệp (Frontend)

**Người trả lời:** Đặng Văn Hiệp · **Ngày:** 11/11/2026
**Đối tượng:** bản bàn giao `CWRM-11` commit `c376c68` (Trần Minh Khôi)
**Căn cứ đối chiếu:** frontend nhánh `feature/CWRM-14-frontend-ui-skeleton`

Tài liệu này trả lời 8 câu ở mục 4.5 và góp ý các điểm liên quan ở mục 3.3. Nội dung đã đối chiếu với code thực tế, không chỉ với bản mô tả.

---

## 1. Ánh xạ enum UPPER_SNAKE_CASE sang nhãn hiển thị

**Trả lời:** Được. UI giữ nhãn hiển thị hiện tại và thêm một lớp map theo mã. Fixture chỉ đổi giá trị lưu, không đổi nghĩa nghiệp vụ.

**Đề nghị:**

- Dùng map riêng cho từng enum, không dùng một map chung. Các khóa sẽ đụng nhau:
  - `LOW/MEDIUM/HIGH` có ở cả `RiskLevel` và `Priority`.
  - `DIRECT` có ở cả `assignmentMode` và `Assignment.source`.
  - `PENDING` (RequestStatus) khác `PENDING_ACCEPTANCE` (AssignmentStatus).
- `StatusBadge` (`frontend/src/components/status-badge.tsx:5-25`) phải nhận mã + loại enum, thay vì key theo nhãn. Ví dụ `StatusBadge kind="taskStatus" value="IN_PROGRESS"`.
- Cần map thêm: `IN_PROGRESS`, `OPEN_WORK`, `CRITICAL`, `FIXED`, `FLEXIBLE`, `EVENT`, `HOURLY`, `MANUAL`, `SUCCESS`, `FAILED`, `WITHDRAWN`.
- Form tạo task (`frontend/src/app/tasks/new/page.tsx:35-58`) đang dùng nhãn làm `value` (`"Direct"`, `"Flexible"`, `"Medium"`) — sẽ đổi sang mã.
- Đề nghị backend chỉ trả mã, FE sở hữu nhãn. Nếu backend trả kèm `label` thì phải thống nhất một nguồn, tránh hai bên lệch.

## 2. Dùng mảng thay cho trường đơn

**Trả lời:** Được. Scope cho phép nhiều R, nhiều role và nhiều predecessor nên UI phải chuyển sang mảng.

**Đề nghị:**

- Cột R trong `frontend/src/components/task-table.tsx:32` đổi thành danh sách chip + `+N`.
- `requiredRoleIds` hiểu là khớp ít nhất một role; `requiredSkillIds` là đủ mọi skill. Cần ghi rõ hai nghĩa này trong contract để UI hiển thị đúng.
- `Eligibility` cần thêm `missingRoleIds`. Hiện chỉ có `matchedRoleIds` và `missingSkillIds`, UI không biết role nào thiếu.
- `predecessorIds` chỉ có ID nên `frontend/src/app/my-work/page.tsx:37` và `frontend/src/app/review/page.tsx:38-44` phải N+1 để lấy status. Đề nghị `GET /tasks/{id}/dependencies` trả object `{taskId, title, status}` hoặc thêm `predecessorSummaries`.
- Cần `teamName` và tên hiển thị của A/R. Nếu không embed, phải có endpoint tra cứu hàng loạt; gọi `GET /teams/{teamId}/members` cho từng task là N+1.

## 3. Task schema còn thiếu gì cho SC-01 đến SC-06

**Trả lời:** Có thiếu, chủ yếu là dữ liệu hiển thị và trạng thái trước thao tác.

**Đề nghị bổ sung hoặc chốt:**

- `teamName`, `milestoneName` (hoặc embed object) — hiện UI hiển thị team/tên người nhưng contract chỉ có UUID.
- `risk` nên luôn có mặt và cho phép `null`, thay vì vắng hẳn. `frontend/src/app/manager/page.tsx:8` đang lọc `riskLevel === "High"`; task chưa đánh giá sẽ bị bỏ sót hoặc gán nhầm Low. UI cần trạng thái "Chưa đánh giá".
- Thêm `updatedAt` để sort; hiện chỉ có `createdAt`, `version`.
- SC-01: bản tóm tắt chưa mô tả schema `GET /dashboard/manager`. Cần counts (`total`, `inProgress`, `blocked`, `review`, `highRisk`, `overdue`), danh sách task ưu tiên và alerts. Nếu không, FE phải gọi nhiều list rồi tự đếm — sai khi có phân trang.
- SC-02b: cần chốt schema cho assignments, RACI, blockers, comments, progress history. Blocker cần `id, description/reason, openedAt, openedByUserId, resolvedAt`; comment cần tên tác giả; RACI cần tên người.
- SC-03: `GET /assignments` hiện chỉ có `taskId/taskTitle`, không đủ render card. Cần embed `task` (TaskSummary) hoặc thêm `teamId/teamName, status, deadlineAt, priority, progress, risk, openBlockerCount, accountableUserId, predecessorIds`.
- SC-04: thêm `pendingRequestCount` và trạng thái request của tôi (xem câu 4).
- SC-06: cần predecessor kèm `status`, và cờ `canStart`/lý do khóa (xem câu 5).
- `GET /tasks`: cần chốt danh sách query param và `sort` (`deadlineAt`, `riskLevel`, `updatedAt`), filter `teamId`, `status`, `riskLevel`, `assignmentMode`, `openWorkOpen`, `eligibleForMe`.
- Các action endpoint (`start`, `submit-review`, `approve`, `return`, `capacity`, `management-interventions`) cũng phải nhận `expectedVersion`, không chỉ PATCH. Nếu không, hai người thao tác đồng thời sẽ lọt 409.

## 4. Luồng Open Work ở SC-04

**Trả lời:** Luồng đúng nghiệp vụ. UI không cần Accept lần hai sau khi Manager approve.

**Đề nghị:**

- `Eligibility.reasons` nên là mã + tham số (`NOT_IN_TEAM`, `MISSING_ROLE`, `MISSING_SKILL`, `OPEN_WORK_CLOSED`, `NO_SLOTS`) thay vì chuỗi tự do. Hiện `frontend/src/app/open-work/page.tsx:32` in thẳng chuỗi; nếu backend đổi câu chữ UI sẽ vỡ layout hoặc i18n.
- Thêm `missingRoleIds` như câu 2.
- Cần biết "tôi đã gửi request chưa": trả `myRequestStatus` trong eligibility/task detail, hoặc cho `GET /open-work-requests?taskId=&status=PENDING`. Hiện UI tự suy từ `task.requestStatus`, mà trường này đã bị bỏ khỏi Task.
- `GET /tasks/{taskId}/open-work/requests` đang là TASK_ACCESS, tức Member thấy request của người khác. Nếu không có nhu cầu, giới hạn `SELF`/`MANAGER` hoặc chỉ trả summary ẩn danh.
- Chốt hành vi khi Manager `close`: request PENDING bị `WITHDRAWN`, giữ `PENDING`, hay `REJECTED` kèm `decisionReason` hệ thống? UI cần biết để hiển thị.
- Approve nên trả assignment mới hoặc Task mới để FE refresh slot ngay; nếu không phải gọi lại 2-3 endpoint.
- Bộ lọc Open Work của team nên có `eligibleForMe=true`; hiện `missingOpenWorkRequirements` lọc client trên toàn bộ task.

## 5. Mã lỗi hay cờ chặn trước thao tác

**Trả lời:** Nên có cả hai: cờ/preflight để disable nút, mã lỗi 422 để chống race.

**Đề nghị:**

- Thêm `Task.availableActions` hoặc `GET /tasks/{id}/actions` trả `{canStart, canSubmitReview, canApprove, canReturn, startBlockedReasons[], reviewBlockedReasons[]}`.
- Lý do dùng mã: `PREDECESSOR_NOT_DONE` + `predecessorTaskIds`, `OPEN_BLOCKERS_EXIST` + `openBlockerIds`, `NO_ACCEPTED_RESPONSIBLE`, `INVALID_STATE_TRANSITION`.
- Hiện `frontend/src/app/tasks/[id]/page.tsx:17` tự tính `reviewReady = progress === 100 && openBlockers === 0`; có cờ server thì bỏ logic trùng.
- Chốt body: `submit-review` cần gì (`expectedVersion`, `resultText`, `resultUrl`, progress có bắt buộc 100?); `return` cần `reason` bắt buộc + `progress` 0-99. UI sẽ validate trước khi gửi và hiển thị lỗi theo trường.
- UI cần danh sách blocker/predecessor dạng object, không chỉ ID, để hiện "đang chờ TASK-103 (Blocked)".

## 6. RiskSnapshot cần đổi gì

**Trả lời:** Phải sửa khá nhiều so với `frontend/src/lib/demo-data.ts:32-48` và `frontend/src/app/risk/page.tsx`.

**Đề nghị:**

- `RiskLevel` đổi sang `LOW/MEDIUM/HIGH`; `triggeredRules` mở `R01-R12`.
- `ruleExplanation` (`frontend/src/app/risk/page.tsx:23-27`) chỉ có R01-R03. Cần nội dung R04-R12. Đề nghị backend cung cấp rule catalog (`id, version, title, description, severity`) qua endpoint/constant, tránh FE hard-code lệch Scope.
- Thêm `id`, `triggerSource`, `isCurrent`, `evaluationError` (theo `CurrentRisk`); bỏ dòng "Chưa xác minh (mock)" (`frontend/src/app/risk/page.tsx:81`).
- `fieldLabel` (`frontend/src/app/risk/page.tsx:9-14`) chỉ map 4 field; R04-R12 dùng field mới sẽ hiện raw key. Cần danh mục field hoặc backend trả `label`.
- `unit` nên theo bộ giá trị cố định (`HOURS/PERCENT/DAYS/COUNT/TEXT`) để `formatEvidenceValue` không phải hard-code chuỗi.
- `inputFingerprint` không cần hiển thị; UI chỉ dùng `isCurrent`. Giữ trong schema nhưng ẩn khỏi giao diện.
- Phần AI cần `isCurrent`, `reused`, `fallbackExplanation`; bảng explanation cần link `linkedEvidenceIds` tới đúng dòng evidence.
- Lịch sử snapshot cần `page/pageSize` và `isCurrent` từng bản; hiện chưa có màn này.

## 7. AI lỗi: 502/503 hay 200 + FAILED

**Trả lời:** Chọn 502/503 + error envelope, không chọn 200 + FAILED. 200 mà thất bại dễ làm client cache/optimistic update sai và lẫn với luồng thành công.

**Đề nghị:**

- `details` phải có `retryable`, `recommendationId`, `fallbackExplanation`, `snapshotId`, và `errorCode` khớp mã top-level.
- Bản FAILED phải được lưu trước khi trả lỗi, và `GET /ai-recommendations/{id}` + `GET .../explanations` phải trả được bản FAILED kèm fallback. Nếu chỉ dựng fallback ở response, reload trang sẽ mất.
- UI hiển thị lỗi inline trong panel AI, giữ risk/evidence, chỉ hiện nút "Thử lại" khi `retryable=true`.
- `409 SNAPSHOT_NOT_CURRENT`: refetch current snapshot rồi để người dùng bấm lại, không tự retry.
- `422 AI_SNAPSHOT_LEVEL_NOT_SUPPORTED`: ẩn nút gọi AI với snapshot LOW.
- FE cần timeout dài hơn timeout backend (đề nghị chốt, ví dụ backend 30s) để không báo lỗi trong khi backend vẫn đang chạy.

## 8. My Work lấy từ ba nguồn

**Trả lời:** Hợp về nghiệp vụ, nhưng không hợp để phân trang và sắp xếp hỗn hợp. Ba endpoint riêng thì không thể `page/pageSize` trên danh sách đã trộn.

**Đề nghị:**

- Ưu tiên `GET /dashboard/my-work` trả các section có phân trang riêng: `pendingInvitations`, `acceptedTasks`, `myRequests`, `dueSoon`; hoặc một `items` thống nhất có `kind` + `sort`.
- Nếu giữ ba endpoint, bổ sung:
  - `/assignments`: `status`, `source`, `taskId`, `sort=deadlineAt|createdAt`, `include=task`, `page/pageSize`.
  - `/open-work-requests`: `status`, `taskId`, `sort=createdAt`, `include=task`.
  - `/tasks`: `teamId`, `assignmentMode`, `openWorkOpen`, `eligibleForMe`, `status`, `riskLevel`, `sort`, `page`.
- Thứ tự UI mong muốn: việc cần hành động (lời mời PENDING_ACCEPTANCE, task REVIEW chờ A duyệt) → BLOCKED/quá hạn → deadline gần → còn lại. Sort mặc định nên do server quyết.
- Cần counts cho sidebar (`pendingInvitationCount`, `myPendingRequestCount`, `reviewQueueCount`) để không gọi ba list chỉ để đếm.

---

## Ý kiến cho mục 3.3

- **Cổng backend 3001:** đồng ý. FE đọc `NEXT_PUBLIC_API_BASE_URL`, không hard-code; cần CORS cho `http://localhost:3000` và tiền tố `/api/v1`.
- **AI lỗi:** đồng ý 502/503 như câu 7.
- **Manager can thiệp khi không phải R:** đồng ý chỉ sửa progress/effort và bắt buộc lý do. UI cần `POST /management-interventions` trả về bản ghi can thiệp + Task mới, có `expectedVersion`, và hiển thị banner "Manager đã can thiệp" trong lịch sử task. Không cho sửa risk.

## Ba điểm đề nghị chốt trước CWRM-12

1. `TaskSummary` chỉ có UUID nhưng UI cần `teamName` + tên A/R — embed hoặc cho endpoint tra cứu hàng loạt.
2. `risk` luôn có mặt dạng `null` được, và `availableActions`/lý do chặn cho SC-03/SC-06.
3. Chốt schema `GET /dashboard/manager`, `GET /dashboard/my-work`, `GET /assignments`, `GET /dependencies` — bản tóm tắt chưa đủ để FE dựng màn.

## Mục 10 — Bảng trả lời

| Câu | Trả lời | Đề nghị thay đổi (nếu có) |
|---|---|---|
| 1 | Đồng ý ánh xạ enum sang nhãn | Map riêng từng enum; backend chỉ trả mã |
| 2 | Đồng ý dùng mảng | Thêm `missingRoleIds`; predecessor kèm title/status; thêm tên A/R, teamName |
| 3 | Đồng ý, nhưng thiếu trường hiển thị | Thêm `teamName`, `milestoneName`, `updatedAt`, `risk: null`, `availableActions`; chốt schema dashboard/assignments/dependencies; `expectedVersion` cho action |
| 4 | Đồng ý luồng | Reason dạng mã; `missingRoleIds`; `myRequestStatus`; chốt hành vi khi close |
| 5 | Cần cả cờ preflight và mã lỗi | `GET /tasks/{id}/actions`; chốt body submit-review/return |
| 6 | Đồng ý đổi schema risk | Rule catalog R04-R12; thêm id/triggerSource/isCurrent/evaluationError; unit cố định |
| 7 | Chọn 502/503, không chọn 200 + FAILED | details có retryable/recommendationId/fallbackExplanation/snapshotId; lưu FAILED trước khi trả lỗi |
| 8 | Hợp nghiệp vụ, không hợp phân trang | Dashboard my-work dạng section; hoặc thêm filter/sort/include=task; thêm counts |

## Hiện trạng frontend bị ảnh hưởng

| File | Thay đổi cần làm |
|---|---|
| `frontend/src/lib/demo-data.ts` | Enum sang mã; TaskSummary sang mảng UUID + risk object; RiskSnapshot mở R01-R12, thêm id/triggerSource |
| `frontend/src/components/status-badge.tsx` | Key theo mã + loại enum thay vì nhãn |
| `frontend/src/components/task-table.tsx` | R dạng danh sách; bỏ cột AssignmentStatus của task; thêm slots/request count |
| `frontend/src/app/manager/page.tsx` | Dùng counts từ dashboard; xử lý task chưa có risk |
| `frontend/src/app/my-work/page.tsx` | Dùng `GET /dashboard/my-work`; hết phụ thuộc `task.team`, `task.responsible` |
| `frontend/src/app/open-work/page.tsx` | Dùng eligibility từ server; bỏ `missingOpenWorkRequirements` chạy client |
| `frontend/src/app/risk/page.tsx` | Rule catalog, isCurrent, evaluationError, unit/field label |
| `frontend/src/app/tasks/[id]/page.tsx` | Dùng RACI/assignment/blocker/dependency object; `availableActions` |
| `frontend/src/app/tasks/new/page.tsx` | Value của select/radio sang mã enum |
