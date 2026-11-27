# Backend CWRM

Khung API NestJS 12 dùng PostgreSQL và Prisma 7 cho nền tảng điều phối công việc và quản trị rủi ro CWRM.

## Yêu cầu máy

- Node.js 22.22.3 trở lên (dòng 22), 24.15 trở lên (dòng 24) hoặc từ 26. Đây là yêu cầu của Nest CLI; bản thấp hơn vẫn cài được nhưng `npm ci` báo `EBADENGINE`. Đã kiểm chứng trên Node 24.22.2; Node 24.13 và 24.14 chạy được kèm cảnh báo.
- Docker Desktop đang chạy.
- npm đi kèm Node.js.

## Chạy lần đầu

Chạy các lệnh theo thứ tự từ thư mục `backend/`.

PowerShell:

```powershell
Copy-Item .env.example .env
npm ci
npm run db:up
npm run db:deploy
npm run db:seed
npm run start:dev
```

macOS/Linux:

```bash
cp .env.example .env
npm ci
npm run db:up
npm run db:deploy
npm run db:seed
npm run start:dev
```

`npm ci` chạy `prisma generate` tự động. Migration deploy áp dụng schema hiện có; seed được chạy riêng và có thể lặp lại. Lệnh seed cần `SEED_DEMO_PASSWORD` trong `.env`.

PostgreSQL chạy trong Docker và chỉ mở trên `127.0.0.1` của máy thật ở cổng **5433** (không phải 5432), để không đụng PostgreSQL khác có sẵn trên máy. Cụm Docker tên `cwrm`, container là `cwrm-db-1`.

Nếu PowerShell báo `npm.ps1 cannot be loaded because running scripts is disabled`, hãy gõ `npm.cmd` thay cho `npm` (ví dụ `npm.cmd ci`), hoặc chạy các lệnh trong Command Prompt hay Git Bash.

Sau khi ứng dụng khởi động, kiểm tra:

- Health API: <http://localhost:3001/api/v1/health>
- Swagger UI: <http://localhost:3001/api/docs>

Health thực hiện truy vấn `SELECT 1` để xác nhận kết nối PostgreSQL. Nếu database chưa sẵn sàng, API trả HTTP 503.

## Lệnh thường dùng

| Lệnh | Tác dụng |
|---|---|
| `npm run start:dev` | Chạy NestJS ở chế độ theo dõi thay đổi |
| `npm run build` | Sinh Prisma Client và build ứng dụng |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run lint` | Kiểm tra mã nguồn bằng oxlint |
| `npm test` | Chạy unit test bằng Vitest |
| `npm run test:e2e` | Chạy e2e test bằng Vitest, không cần database |
| `npm run db:up` | Khởi động PostgreSQL bằng Docker Compose |
| `npm run db:down` | Dừng PostgreSQL; giữ nguyên volume dữ liệu |
| `npm run db:generate` | Sinh Prisma Client từ schema |
| `npm run db:migrate` | Tạo và áp dụng migration khi phát triển |
| `npm run db:deploy` | Áp dụng các migration đã có |
| `npm run db:seed` | Tạo hoặc cập nhật dữ liệu demo |

Chạy unit test bằng `npm test` và e2e không cần database bằng `npm run test:e2e`. Test tích hợp dùng PostgreSQL thật qua `npm run test:int`; cần khởi động Docker bằng `npm run db:up` và cấu hình `TEST_DATABASE_URL` trỏ tới database riêng có tên kết thúc bằng `_test`. Bộ test tạo database nếu chưa có, áp dụng migration và xóa các bảng dữ liệu của database đó trước từng test.

## Tài khoản demo

Seed tạo ba tài khoản giả:

- `manager@example.com` — Trưởng nhóm Marketing.
- `content@example.com` — Chuyên viên nội dung.
- `designer@example.com` — Thiết kế đồ họa.

Cả ba dùng mật khẩu được đặt trong `SEED_DEMO_PASSWORD` ở `.env`. README và mã nguồn không chứa mật khẩu thực.

Dữ liệu demo theo kịch bản Marketing: workspace "Marketing Demo", team "Marketing", role Content và Designer, skill Copywriting và Figma, milestone "Campaign Launch" và ba task (viết nội dung, thiết kế poster, chạy quảng cáo). Trong team Marketing, `content` có Main Role Content và `designer` có Main Role Designer; `manager` không có Main Role. Capacity tuần: `content` đã được duyệt 20 giờ (version 2), `designer` đã khai 15 giờ và đang chờ duyệt (version 1), `manager` chưa khai (NOT_DECLARED).

Mỗi lần chạy lại `npm run db:seed`, ba task demo được đưa về `TO_DO`, progress 0 và hạn được tính lại từ thời điểm chạy (poster còn 40 giờ). Dữ liệu khác bạn tự tạo không bị xóa.

Muốn xóa sạch database để làm lại từ đầu:

```bash
docker compose down -v
npm run db:up
npm run db:deploy
npm run db:seed
```

## Cấu hình môi trường

Sao chép `.env.example` thành `.env` rồi điều chỉnh các giá trị cho máy cá nhân. Các giá trị mẫu trong file chỉ phục vụ phát triển cục bộ. Nếu đổi `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` hoặc `POSTGRES_PORT`, hãy cập nhật `DATABASE_URL` tương ứng.

`DATABASE_URL` và `JWT_SECRET` bắt buộc. `JWT_SECRET` sau khi bỏ khoảng trắng hai đầu phải dài ít nhất 32 ký tự; giá trị mẫu trong `.env.example` chỉ dùng trên máy cá nhân. `JWT_EXPIRES_IN_SECONDS` mặc định là `3600` và nhận số nguyên từ `60` đến `86400`. `BCRYPT_COST` mặc định là `10` và nhận số nguyên từ `4` đến `15`. `PORT` mặc định là `3001`, `CORS_ORIGIN` mặc định là `http://localhost:3000`, và `NODE_ENV` mặc định là `development`. `CORS_ORIGIN` nhận nhiều origin, phân tách bằng dấu phẩy. Mật khẩu demo bắt buộc khi chạy seed.

`TEST_DATABASE_URL` chỉ dùng cho `npm run test:int`. Database trong URL này phải riêng cho kiểm thử và tên phải kết thúc bằng `_test`; ví dụ trong `.env.example` trỏ tới `cwrm_test` trên cổng `5433`.

## Cấu trúc thư mục

```text
backend/
├── prisma/
│   ├── migrations/       # Migration PostgreSQL có phiên bản
│   ├── schema.prisma     # Mô hình dữ liệu và enum
│   └── seed.ts           # Dữ liệu demo có thể chạy lại
├── src/
│   ├── audit/            # audit_logs append-only dùng chung
│   ├── auth/             # Đăng ký, đăng nhập, JWT, guard toàn cục
│   ├── capacity/         # Capacity tuần: khai báo và duyệt
│   ├── common/           # Phong bì lỗi, đồng hồ ứng dụng, phân trang
│   ├── config/           # Kiểm tra biến môi trường
│   ├── health/           # Endpoint kiểm tra API và database
│   ├── prisma/           # PrismaService và module dùng chung
│   ├── task/             # Task CRUD Core: danh sách, tạo, xem, sửa, requiredPeople
│   ├── team/             # Team, Main Role, danh mục role/skill, my-skills
│   ├── workspace/        # Workspace, member, invitation, guard phân quyền
│   ├── generated/        # Prisma Client được sinh tự động
│   ├── app.module.ts
│   ├── app.setup.ts
│   └── main.ts
├── test/                 # E2E test và test tích hợp (*.int-spec.ts)
├── .env.example
└── docker-compose.yml
```

## Phạm vi hiện tại

Backend hiện có đăng ký, đăng nhập, đăng xuất, đọc/cập nhật tài khoản hiện tại, tạo/liệt kê/đọc/cập nhật workspace, health API, Swagger, xử lý lỗi, migration và seed. Mọi route đều cần Bearer token trừ `GET /api/v1/health`, `POST /api/v1/auth/register` và `POST /api/v1/auth/login`. Workspace chỉ cho phép thành viên ACTIVE; đổi tên yêu cầu vai trò MANAGER. WP-014B (CWRM-33) thêm member, invitation, team và Main Role, danh mục role/skill, my-skills và capacity tuần theo contract `0.3.4-draft` (thiết kế P-01 PM duyệt 26/11/2026, chưa phát hành), cùng bảng `audit_logs` dùng chung. WP-015A (CWRM-34) thêm Task CRUD Core (5 endpoint) theo cùng contract, P-02 cho bộ lọc chưa hỗ trợ. Chưa triển khai milestone, phân công, Open Work, dependency, blocker, risk hoặc AI.

Các endpoint đã có:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces/{workspaceId}`
- `PATCH /api/v1/workspaces/{workspaceId}`
- `GET /api/v1/health`

Thêm ở WP-014B (30 endpoint):

- Member: `GET /workspaces/{workspaceId}/members`, `GET`/`PATCH`/`DELETE /workspaces/{workspaceId}/members/{userId}`
- Invitation: `GET`/`POST /workspaces/{workspaceId}/invitations`, `GET /workspace-invitations`, `POST /workspace-invitations/{invitationId}/accept`, `POST /workspace-invitations/{invitationId}/decline`
- Team: `GET`/`POST /workspaces/{workspaceId}/teams`, `GET`/`PATCH /teams/{teamId}`, `GET`/`POST /teams/{teamId}/members`, `DELETE`/`PATCH /teams/{teamId}/members/{userId}` (PATCH đặt Main Role)
- Role/Skill: `GET`/`POST /workspaces/{workspaceId}/roles`, `PATCH`/`DELETE /roles/{roleId}`, `GET`/`POST /workspaces/{workspaceId}/skills`, `PATCH`/`DELETE /skills/{skillId}`, `PUT /workspaces/{workspaceId}/my-skills`
- Capacity: `GET`/`PUT /workspaces/{workspaceId}/my-capacity`, `GET /workspaces/{workspaceId}/capacities`, `POST /workspaces/{workspaceId}/members/{userId}/capacity/approve`

Thêm ở WP-015A (5 endpoint):

- `GET /tasks?workspaceId=…`, `POST /tasks`, `GET`/`PATCH /tasks/{taskId}`, `PATCH /tasks/{taskId}/required-people`

Tất cả nằm dưới tiền tố `/api/v1`.

Thiết kế gốc nằm trong tài liệu CWRM-11: ERD ở `docs/architecture/CWRM-11_ERD.md`, hợp đồng API ở `docs/api/openapi.yaml`, quyết định công nghệ ở `docs/architecture/adr/ADR-001-tech-stack.md`. Khi mã và các tài liệu này khác nhau thì phải nêu ra để thống nhất, không tự sửa một bên.

Khác với hợp đồng hiện tại ở một điểm: khi mất kết nối database, `GET /health` trả 503 với mã lỗi `SERVICE_UNAVAILABLE`; mã này sẽ được bổ sung vào `openapi.yaml` ở lần cập nhật tới.

Hành vi dưới đây theo quyết định của PM ở CWRM-33 #10219 (C33-01.1–C33-03.3, 27/11/2026) và được ghi vào contract `0.3.4-draft` ở PR #10 (mục "Hoàn thiện theo PM #10219" trong `CWRM-11_Review_Log.md`). Contract này chưa phát hành:

1. C33-01.1: tên team/role/skill trùng trong cùng workspace (không phân biệt hoa thường), khi tạo hoặc đổi tên, trả 409 `UNIQUE_CONFLICT` và giữ nguyên dữ liệu.
2. C33-01.2: Accept/Decline lời mời không còn PENDING, duyệt capacity chưa khai hoặc không ở PENDING_APPROVAL trả 422 `INVALID_STATE_TRANSITION`.
3. C33-01.3: tham chiếu sai trong body trả 400 `VALIDATION_ERROR` kèm `details.fields`: `userId` chưa là thành viên ACTIVE của workspace khi thêm vào team, `mainRoleId` thuộc workspace khác, `skillIds` không thuộc workspace (kèm `details.unknownSkillIds`).
4. C33-01.4: xóa role/skill đang được dùng trả 409 `UNIQUE_CONFLICT` với `details.reason = IN_USE` và số tham chiếu.
5. C33-02.1: `TEAM_ACCESS` không đạt trả 404 giống team không tồn tại. Thao tác Manager trên team mà Member không thuộc (ví dụ `PATCH /teams/{teamId}`) cũng trả 404; Member của team đó nhận 403. Lời mời của người khác và `my-capacity` gọi từ ngoài workspace trả 404.
6. C33-02.2: gỡ hoặc vô hiệu hóa thành viên workspace thì các team membership của người đó trong workspace cũng chuyển INACTIVE. Tham gia lại workspace không khôi phục team; thêm lại vào team thì Main Role về null.
7. C33-02.3: hạ quyền, vô hiệu hóa hoặc gỡ Manager đang là A của task chưa DONE trả 422 `RESPONSIBILITY_REQUIRED`; gỡ khỏi team người đang là A của task chưa DONE trong team đó cũng vậy. Guard R (không để task mất R Accepted cuối) chưa có vì chưa có bảng `assignments`; làm và kiểm ở WP-024A/B, WP-026.
8. C33-03.1: số giờ capacity nhận từ 0 đến 168, tối đa 2 chữ số thập phân; sai miền trả 400, không làm tròn.
9. C33-03.2: đặt Main Role kiểm `mainRoleId`, rồi `expectedVersion`, rồi mới xét no-op. Đặt lại đúng Main Role đang có là no-op, không tăng version, không ghi audit.
10. C33-03.3: `GET /workspace-invitations` trả mọi trạng thái, mới nhất trước, cùng thời điểm thì theo `id`.

Task (WP-015A) theo contract `0.3.4-draft` và Scope v0.2 Final:

- Quyền: `GET /tasks` cần membership ACTIVE (`workspaceId` trên query); Manager thấy task mọi team, Member chỉ task của team mình đang là thành viên ACTIVE. `GET /tasks/{taskId}` theo `TASK_ACCESS`; Member ngoài team nhận 404 như task không tồn tại. Sửa task cần Manager; Member trong team nhận 403, ngoài team nhận 404.
- `POST /tasks` không có `workspaceId` trên URL; workspace lấy từ `teamId` trong body. A phải là Manager ACTIVE của workspace và thành viên ACTIVE của team (422 `ACCOUNTABLE_NOT_MANAGER`); milestone khác team trả 422 `MILESTONE_TEAM_MISMATCH`.
- `PATCH /tasks/{taskId}` không nhận `status`, `accountableUserId`, `openWork` (400). Task DONE trả 422 `INVALID_STATE_TRANSITION`. Thứ tự kiểm: tham chiếu trong body, `expectedVersion`, trạng thái, lý do khi đổi deadline FIXED, rồi no-op (không tăng version, không ghi audit).
- Bộ lọc `riskLevel`, `responsibleUserId`, `openWorkState` hợp lệ trả 422 `FILTER_NOT_AVAILABLE` cho cả request (`details.unsupportedFilters` sắp theo tên); giá trị sai miền vẫn trả 400 trước. Các bộ lọc khác chạy trên dữ liệu thật.
- Phần thuộc module chưa có trả đúng hiện trạng, không bịa: `risk: null`; không có R, chỗ giữ, request, dependency, blocker hay C/I (mảng rỗng, số đếm 0); `openWork.state` lấy từ cột `open_work_*` (NOT_OPENED/OPEN/CLOSED). `availableActions` chỉ gồm action đã có endpoint: `EDIT_TASK`, `UPDATE_REQUIRED_PEOPLE` cho Manager khi task chưa DONE. Chưa có assignment nên `PATCH required-people` chưa có chỗ nào đang giữ để chặn giảm.
- Migration `20261128000000_wp015a_task_core` thay `open_work_open` bằng `open_work_opened_at`/`open_work_closed_at`/`open_work_closed_reason` và thêm các mốc R13 theo ERD. CHECK: task IN_PROGRESS phải có `current_in_progress_since`, task REVIEW phải có `current_review_since` (cam kết ở CWRM-37 #10209).

Những chỗ contract chưa quy định và WP-015A đã chọn cách làm. Các điểm này cần Bảo, Hiệp và Ban xác nhận:

1. `deadlineAfter`/`deadlineBefore` là khoảng nửa mở: `deadlineAt >= deadlineAfter` và `deadlineAt < deadlineBefore`.
2. Danh sách sắp theo `deadlineAt` tăng dần, cùng hạn thì theo `id`.
3. `POST /tasks` với team ngoài phạm vi caller được thấy (không tồn tại, workspace khác, hoặc Member không thuộc team) trả 400 `VALIDATION_ERROR` với `details.fields.teamId`, vì operation không khai 404. Member thấy team nhưng không phải Manager nhận 403.
4. Milestone không tồn tại hoặc thuộc workspace khác trả 400 (`fields.milestoneId`); cùng workspace nhưng khác team trả 422 `MILESTONE_TEAM_MISMATCH`. Role/skill yêu cầu ngoài workspace trả 400 kèm `details.unknownRoleIds`/`unknownSkillIds`.
5. Chỉ đổi `deadlineAt` hoặc `deadlineType` của task đang FIXED mới cần `reason`; đổi trường khác thì không.
6. Giới hạn kỹ thuật theo cột: `effortEstimateHours` tối đa 999999.99 và 2 chữ số thập phân (DECIMAL(8,2)); `requiredPeople` tối đa 2147483647. `deadlineAt` phải có giờ và múi giờ.
7. Member lọc theo `teamId` của team mình không thuộc nhận 200 với danh sách rỗng, không lộ task.

Mọi mốc thời gian nghiệp vụ (`respondedAt`, `declaredAt`, `approvedAt`, `audit_logs.created_at`...) lấy từ đồng hồ của ứng dụng (`src/common/clock.ts`), không lấy từ `now()` của PostgreSQL. `audit_logs` có trigger chặn UPDATE/DELETE; mọi thay đổi ở trên đều ghi audit trong cùng transaction.

ERD mô tả các trạng thái bằng `VARCHAR` kèm `CHECK`; schema CWRM-12 dùng enum PostgreSQL của Prisma cho các miền trạng thái, assignment mode, priority và deadline type. Các mã enum vẫn giữ dạng UPPER_SNAKE_CASE. Một số kiểm tra miền số và unique theo tên không phân biệt chữ hoa/thường được bổ sung trực tiếp trong migration SQL.

## Lỗi thường gặp

- Docker chưa bật: mở Docker Desktop rồi chạy lại `npm run db:up`.
- Cổng `3001` đã được dùng: đổi `PORT` trong `.env`.
- `npm run db:up` báo `port is already allocated`: cổng `5433` đã có chương trình khác dùng. Đổi `POSTGRES_PORT` trong `.env` sang cổng khác và sửa cùng số đó trong `DATABASE_URL`.
- Health trả 503 dù container đang chạy: kiểm tra cổng trong `DATABASE_URL` có khớp `POSTGRES_PORT` không.
- Chưa tạo `.env`: sao chép `.env.example` thành `.env` trước khi cài hoặc chạy ứng dụng.
- Seed báo thiếu mật khẩu: đặt `SEED_DEMO_PASSWORD` trong `.env` rồi chạy lại `npm run db:seed`.

## Ghi chú bảo mật

Không commit `.env` hoặc mật khẩu dùng thật. Các giá trị trong `.env.example` chỉ dành cho máy cá nhân; hãy thay chúng trước khi dùng ở môi trường khác. Dữ liệu tài khoản và nội dung seed là dữ liệu giả.
