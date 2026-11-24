# CWRM-37 · Risk Engine bàn giao review
Ngày 24/11/2026 · Người phụ trách Lê Quốc Ban · Draft, chờ review input port từ Khôi.

## Entry point
`evaluateRisk(input: RiskEngineInput): RiskEngineResult[]` tại `backend/src/risk/risk.engine.ts`.
Input được gom theo một Workspace, dữ liệu đầy đủ qua các Team trong Workspace. Gọi hàm với cùng trạng thái và evaluatedAt UTC cho kết quả tái lập. Hàm bỏ Task DONE khỏi kết quả. Input bắt buộc sai gây RiskInputError với code RISK_INPUT_INVALID trước khi trả kết quả.

Các kiểu input nằm tại `risk.types.ts`. Port này dùng trường/enums theo OpenAPI baseline 0.3.3-draft. Hai danh sách taskIds của Milestone và milestoneId của Task phải khớp. Task input bao gồm metadata server cần cho R13, số descendants chưa DONE, dependency trực tiếp và openBlockerSince.

## Mapping cần Khôi review
- Task và Milestone cần toàn bộ input cho các rule. PredecessorIds do adapter dựng từ predecessor trực tiếp cùng Workspace. Không truyền Task ngoài Workspace.
- openBlockerSince là đầu đợt liên tục có ít nhất một blocker OPEN, giữ mốc qua các blocker mở chồng nhau. Adapter tính từ lịch sử đã commit và trả null khi tập OPEN rỗng.
- currentInProgressSince/currentReviewSince là timestamp đợt hiện tại. lastQualifyingActivityAt chỉ từ hoạt động thực đã commit. Comment, no-op, cập nhật effort, priority, role và management intervention không đổi mốc hợp lệ này.
- Assignment dùng status PENDING_ACCEPTANCE/ACCEPTED/DECLINED và endedAt. Chỉ ACCEPTED với endedAt null là active R. Join trùng nguyên dòng cùng ID được loại trùng. Hai assignment active khác ID của cùng user/task là input không hợp lệ.
- Capacity dùng NOT_DECLARED/PENDING_APPROVAL/APPROVED và approvedWeeklyHours. 0 và null có ý nghĩa riêng. Thiếu record hoặc giá trị tạo gap.
- Milestone rỗng hoặc toàn Task DONE tạo xử lý reminder ở adapter/UI khi cần. Engine không kích hoạt R11/R12 cho trường hợp này.
- Kết quả là dữ liệu tính rule nội bộ. Adapter WP-037 thêm snapshot ID/inputFingerprint/triggerSource, lưu snapshot và gắn current/stale. Evidence R09 có ID người và workload qua Team, cần áp ACL/redaction của caller trước API/alert/AI.

## Đối chiếu quy tắc
R01/R02/R03 theo remainingHours và progress; R04/R05 theo continuous blocker interval; R06/R07 theo predecessor trực tiếp và cửa sổ deadline của successor; R08 chỉ TO_DO/IN_PROGRESS và active Accepted R; R09 theo cumulative deadline và /168; R10 theo đợt Review; R11/R12 theo Milestone có Task chưa DONE; R13 theo max(mốc đợt, hoạt động hợp lệ cuối).
Mức MEDIUM được boost một lần bởi Priority HIGH/CRITICAL, deadline FIXED hoặc affectedTaskCount >= 3. R09/R13 giữ mức tính riêng. Risk tổng hợp lấy max.

R09 giữ mọi horizon và giá trị thực trước làm tròn. Khi một horizon thiếu dữ liệu, coverage PARTIAL kèm reason; các rule/horizon khác vẫn chạy. Một horizon sau bình thường vẫn giữ risk từ horizon sớm còn hiệu lực. Task remaining 0 có thể có gap liên quan input của horizon nhưng không nhận cảnh báo quá tải.

## Kiểm tra developer
`npm test -- src/risk/risk.engine.spec.ts` chạy fixture biên tất cả R01–R13, 24/48/72h, boost, R09 100/125%, horizon sớm/muộn, null/0/missing, join trùng, Workspace và tính bất biến input. Đây là phần kiểm tra phát triển WP-030.
WP-031 tiếp tục kiểm expected/trace độc lập và lưu execution theo commit. WP-036/037/041 thực hiện dữ liệu/event/scheduler/ACL và tích hợp API.

## Nguồn
- [Scope v0.2 Final](https://docs.google.com/document/d/1jNRO13_ebPibO8oGjvkMnf_v_ZJhuKjt/edit), mục 5 và FINAL-01–08.
- [Contract baseline 0.3.3-draft trên main 7f8ebb7](https://github.com/n23dccn155-gif/CWRM-platform/blob/7f8ebb7ef4b07ecfe82eaee86fafba2cecda1e04/docs/api/openapi.yaml).
- [CWRM-37](https://ddinhbao05.atlassian.net/browse/CWRM-37).
