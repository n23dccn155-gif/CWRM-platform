# CWRM-14 — Đối chiếu tiêu chí chấp nhận (12/11/2026)

**Trạng thái đề xuất: In Progress.** Rà soát lại tối 12/11: nhánh đã có commit `3927e3e` trên GitHub và hai ảnh `/manager`, `/my-work` được đính kèm bình luận Jira CWRM-14 lúc 21:19. Hai ảnh chứng minh hai màn đã chạy, nhưng chưa thể hiện thao tác điều hướng xuyên màn. Commit `3927e3e` bị lỗi production build ở `/risk` do đọc `searchParams` ngoài Suspense; đã sửa **ở local** và kiểm tra lại build/lint thành công. Bản sửa build chưa được đẩy lên GitHub.

## Nguồn đối chiếu

- [CWRM-14 và review của Khôi](https://ddinhbao05.atlassian.net/browse/CWRM-14): 4 Acceptance Criteria, đặc biệt AC3 về mock/API và AC4 về bằng chứng điều hướng.
- [OpenAPI CWRM-11 `0.2.0-draft`](https://github.com/KhoiTran2905/CWRM-platform/blob/feature/CWRM-11-architecture-erd-api/docs/api/openapi.yaml), cập nhật 12/11: Task, TaskCreateRequest, RiskSnapshot, dashboard và thao tác nghiệp vụ riêng. CWRM-11 vẫn In Progress.
- CWRM-8: Scope v0.1 và 3 persona là nền nghiệp vụ. CWRM-9 v0.2 vẫn là dự thảo, chưa thay Scope v0.1.
- CWRM-12: backend mới có skeleton/health/Swagger; chưa có API nghiệp vụ để xác nhận tích hợp thật.
- CWRM-13: flow và wireframe đang được review; các điểm đã chốt về RACI, Review và evidence được phản ánh vào UI mẫu.
- CWRM-15/16: fixture risk có 7 evidence và POC AI. UI chỉ minh họa kết quả; AI không tự quyết định thay Manager.

## Tình trạng theo Acceptance Criteria của Jira

| AC | Kết quả hiện tại | Việc còn để nghiệm thu |
|---|---|---|
| 1. Chạy local, build không lỗi lớn | Với bản sửa `/risk` ở local, `npm.cmd run lint`, `npx.cmd tsc --noEmit` và `npm.cmd run build` đều qua; build liệt kê 13 trang/tuyến. | Đẩy bản sửa build khi Hiệp cho phép, rồi Khôi chạy lại trên đúng commit mới. `3927e3e` chưa đạt AC1 vì build thất bại ở `/risk`. |
| 2. Layout, điều hướng và các màn skeleton | Có `/login`, `/manager`, `/tasks`, `/tasks/new`, `/tasks/[id]`, `/my-work`, `/open-work`, `/review`, `/risk`; có trang 404 tiếng Việt. Hai ảnh Jira cho thấy `/manager` và `/my-work` trên màn desktop; dashboard đưa rủi ro và hàng chờ Review lên trước số liệu. | Chưa có bằng chứng trực quan cho task detail, risk, 404 hoặc màn hình nhỏ. Menu demo vẫn hiển thị cả Manager và Member vì chưa có phiên đăng nhập thật. |
| 3. Mock model theo contract và một điểm thay API | `src/lib/api/client.ts` là đầu mối đọc task/risk; mã API được đổi sang nhãn qua adapter. Form tạo task đã tách lời mời Direct khỏi `TaskCreateRequest` và dùng `requiredRoleIds`, `requiredSkillIds`, `effortEstimateHours`. | **Chưa thể ghi “khớp 100%”.** Mock `TaskSummary` còn là view model làm phẳng, chưa phản ánh đầy đủ Task/Risk/Assignment/Request; trang vẫn dùng profile demo; server component chưa có phiên/token để gọi API bảo vệ. Cần Khôi xác nhận adapter và bổ sung contract test khi API nghiệp vụ sẵn sàng. |
| 4. Commit/PR và ảnh hoặc video điều hướng | Commit `3927e3e` đã có trên nhánh; Jira có hai ảnh chụp `/manager` và `/my-work`. | Cần bằng chứng thao tác điều hướng hoặc video đi qua `/manager → /tasks → /tasks/[id] → /risk` và `/my-work → /open-work`, cùng link commit chứa bản sửa build. Không chuyển Done trước khi Khôi/Bảo nghiệm thu. |

## Các giới hạn của bản skeleton

- Các thao tác nghiệp vụ tạo việc, mời Direct, gửi/rút request và nghiệm thu chưa ghi dữ liệu qua API. Khối AI mới có tương tác mô phỏng ở trình duyệt, không phải kết quả API thật; không trình bày chúng như tính năng backend đã tích hợp.
- Form chọn các ID mẫu như `team-a`, chưa phải UUID hợp lệ; phần xem trước chỉ minh họa cấu trúc tạo task, không phải request có thể gửi thật.
- Điều kiện Open Work đang tính theo profile demo. Backend vẫn phải kiểm tra lại role, skill và sức chứa tại thời điểm request hoặc duyệt.
- Risk hiển thị snapshot mẫu CWRM-15, có `isCurrent` và 7 evidence; việc tính risk, fallback AI và các lỗi thật chưa được kiểm chứng end-to-end.
- Trang `/tasks/TASK-999` có đường `notFound()` trong mã nguồn. Chưa có ảnh/HTTP kiểm chứng trực tiếp trong phiên này do trình duyệt tích hợp không truy cập được localhost; không tính đó là bằng chứng ảnh AC4. Docker Desktop đang chạy PostgreSQL healthy, chưa có container frontend/API nghiệp vụ; frontend mock không cần database này để render.

## Cách tạo bằng chứng còn thiếu

Trong `frontend`, chạy `npm.cmd run dev`, sau đó ghi một video ngắn đi qua các màn bằng nút trên giao diện. Nếu dùng ảnh, chụp cả thanh điều hướng và nội dung của từng màn, kèm một ảnh trang 404 tiếng Việt. Gắn bằng chứng và liên kết commit/PR chứa **đúng bản mã đã kiểm tra** vào CWRM-14, rồi nhờ Khôi/Bảo xem lại AC3–AC4. Không cần chờ backend hoàn tất để bàn giao skeleton; cần mô tả rõ giới hạn tích hợp.
