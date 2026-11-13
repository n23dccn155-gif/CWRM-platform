# ADR-001 — Nền tảng kỹ thuật CWRM

| Thuộc tính | Giá trị |
|---|---|
| Trạng thái | **Tech Lead chấp thuận ngày 11/11/2026; chờ phản hồi review của Hiệp và Ban** |
| Người quyết định | Trần Minh Khôi (Tech Lead) |
| Phạm vi | Stack, kiến trúc triển khai, ORM, xác thực, định danh và mã enum của MVP |
| Liên quan | CWRM-11; CWRM-12 (schema, migration và seed) |

## Bối cảnh

CWRM là đồ án nhóm bốn sinh viên, cần hoàn thành luồng web S01–S12, một cơ sở dữ liệu dùng chung, API REST có hợp đồng rõ để frontend và Risk/AI làm song song, cùng migration và dữ liệu seed có thể chạy lại. Project Scope v0.1 là nguồn nghiệp vụ gốc. Foundation xác nhận nghiệp vụ nhưng đánh dấu stack là đề xuất cho tới khi Tech Lead chốt ADR. Microservices và hạ tầng thương mại không thuộc MVP.

ADR này ghi quyết định kỹ thuật D1–D5 được Tech Lead duyệt ngày 11/11/2026. Nó không ghi nhận phê duyệt của cả nhóm. Hiệp (Frontend) và Ban (Risk/AI/QA) được đề nghị review hợp đồng ở CWRM-11; phản hồi chưa có tại thời điểm tạo tài liệu.

## Quyết định

### D1 — Stack và cách triển khai

- Frontend: **Next.js**.
- Backend: **NestJS**.
- Cơ sở dữ liệu: **PostgreSQL**.
- Kiến trúc backend: **modular monolith**, triển khai một ứng dụng backend; các module được tách theo nghiệp vụ, không tách dịch vụ độc lập.
- API: REST, tiền tố **`/api/v1`**.

### D2 — ORM và migration

Chọn **Prisma** làm ORM và công cụ schema/migration. Migration và seed được chuẩn bị cho CWRM-12. Schema vẫn phải áp dụng ràng buộc PostgreSQL (khóa ngoại, unique, check và partial unique index) nơi phù hợp; service xử lý các quy tắc liên quan nhiều hàng hoặc trạng thái.

### D3 — Xác thực

- JWT Bearer access token cho API có xác thực.
- Mật khẩu được băm bằng **bcrypt**; không lưu mật khẩu rõ.
- MVP không có refresh token, SSO, xác minh email, khôi phục mật khẩu qua email hoặc gửi email.
- Đăng xuất ở client là xóa access token khỏi phiên client. Nếu API cung cấp `POST /auth/logout`, endpoint chỉ xác nhận thao tác client và không hứa thu hồi JWT đã phát hành; token hết hiệu lực theo hạn dùng cấu hình.

### D4 — Mã enum trong API và cơ sở dữ liệu

Giá trị enum ổn định dùng **UPPER_SNAKE_CASE**; nhãn hiển thị do frontend ánh xạ:

| Miền | Giá trị mã |
|---|---|
| Task status | `TO_DO`, `IN_PROGRESS`, `BLOCKED`, `REVIEW`, `DONE` |
| Assignment status | `PENDING_ACCEPTANCE`, `ACCEPTED`, `DECLINED` |
| Open Work request status | `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN` |
| Risk level theo Scope | `LOW`, `MEDIUM`, `HIGH` |
| Assignment mode | `DIRECT`, `OPEN_WORK` |
| Deadline type | `FIXED`, `FLEXIBLE` |
| Quyền workspace | `MANAGER`, `MEMBER` |
| Priority | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |

`CRITICAL` được dùng cho Priority vì Scope cho phép priority High/Critical. Scope chỉ định risk Low/Medium/High; vì vậy contract này không phát sinh risk level `CRITICAL`. Danh sách mã kỹ thuật được giữ nguyên trong payload và DB; giao diện đổi sang nhãn tiếng Việt/nhãn hiển thị.

### D5 — Khóa chính

Các bảng nghiệp vụ dùng khóa chính **UUID**. UUID được tạo ở backend/ORM và trả về ở API; không dùng số thứ tự tuần tự làm định danh công khai.

## Phương án đã cân nhắc

| Lựa chọn | Quyết định | Lý do |
|---|---|---|
| Modular monolith thay vì microservices | Chọn modular monolith | Quy mô nhóm và MVP nhỏ; cần giao dịch chung cho capacity, RACI, task và risk. Microservices thêm triển khai, mạng và đồng bộ dữ liệu ngoài phạm vi Scope. |
| Prisma thay vì TypeORM | Chọn Prisma | Một file schema là nguồn duy nhất cho model; client có kiểu được sinh tự động; migration là các file SQL có phiên bản và có sẵn cơ chế seed cho CWRM-12. README của repo cũng đã ghi Prisma cho backend. Đánh đổi: xem ghi chú về ràng buộc PostgreSQL và khóa hàng ở mục Hệ quả. |
| JWT Bearer thay vì session cookie | Chọn JWT Bearer | Ở môi trường phát triển, Next.js và NestJS chạy hai cổng riêng; Bearer token trong header không cần cấu hình cookie cross-site và không phát sinh CSRF qua cookie, backend không phải lưu phiên. Đánh đổi: không thu hồi được token trước hạn và client phải giữ token an toàn, nên hạn dùng access token cần ngắn. |
| Enum mã ổn định thay vì nhãn hiển thị làm giá trị | Chọn UPPER_SNAKE_CASE | Nhãn UI có thể dịch/đổi mà không thay payload hoặc dữ liệu. Dữ liệu demo hiện dùng nhãn sẽ cần ánh xạ ở UI. |
| UUID thay vì khóa số tự tăng | Chọn UUID | ID không đoán được theo thứ tự nên khó dò tài nguyên của workspace khác; điều này hỗ trợ NQ01 nhưng không thay cho kiểm tra quyền. ID tạo được ở backend trước khi ghi và ổn định khi seed lại dữ liệu. Đánh đổi: khóa và index lớn hơn số nguyên, chấp nhận được ở quy mô đồ án. |
| Một backend REST thay vì GraphQL | Chọn REST `/api/v1` | OpenAPI cho frontend và Risk/AI một hợp đồng đọc được và kiểm tra tự động được trong khi backend chưa xong; các thao tác chuyển trạng thái được biểu diễn thành action endpoint có điều kiện quyền riêng. GraphQL không được yêu cầu trong Scope. |

Các lý do trên là cân nhắc kỹ thuật cho MVP, không phải tuyên bố đo hiệu năng hoặc kết quả benchmark.

## Hệ quả

- CWRM-11 định nghĩa contract OpenAPI 3.0.3 ở `docs/api/openapi.yaml`, phiên bản `0.1.0-draft`, phủ toàn bộ S01–S12 ngay từ bản nháp (quyết định D6); CWRM-12 hiện thực schema, migration và seed theo ADR sau khi review.
- Backend có thể giữ transaction ở ranh giới nghiệp vụ, khóa hàng task khi duyệt Open Work/cấp assignment, và dùng `tasks.version` để phát hiện cập nhật cũ; client nhận `409 VERSION_CONFLICT` hoặc `409 CAPACITY_EXCEEDED` thay vì ghi đè âm thầm.
- ERD dựa vào CHECK, partial unique index, composite FK và khóa hàng `SELECT ... FOR UPDATE`. CWRM-12 cần kiểm tra với phiên bản Prisma được dùng: ràng buộc nào không khai báo được trong Prisma schema thì viết trực tiếp trong file SQL migration; khóa hàng dự kiến dùng truy vấn thô bên trong transaction.
- Mã role/skill chuyên môn và nhãn RACI là dữ liệu nghiệp vụ riêng, không phải quyền API. API guard chỉ dùng Manager/Member theo workspace/team và quan hệ A/R tương ứng.
- Tất cả thời điểm lưu dạng UTC (`timestamptz`); frontend hiển thị theo `Asia/Ho_Chi_Minh`.
- AI chỉ được gọi từ backend qua một port/interface không phụ thuộc nhà cung cấp. Lựa chọn provider, model và hợp đồng gọi cụ thể thuộc CWRM-16; ADR này không chốt OpenAI hay nhà cung cấp nào.
- Không đưa bí mật AI vào frontend, repository hoặc phản hồi API. Cấu hình khóa chỉ ở môi trường phía máy chủ.
- Không có refresh token nghĩa là không có luồng gia hạn token trong MVP; client cần đăng nhập lại sau khi access token hết hạn.
- Bản contract là draft cho phép review và đổi có kiểm soát. Khi có thay đổi phải cập nhật ADR/API/ERD cùng decision log, không âm thầm sửa baseline nghiệp vụ.

## Câu hỏi mở

1. Backend chạy cổng nào khi vào CWRM-12? OpenAPI dùng `http://localhost:3001/api/v1` làm ví dụ; cổng chưa được chốt.
2. Phiên bản Node.js, NestJS, Next.js, Prisma và PostgreSQL sẽ được ghim ở CWRM-12 khi khởi tạo repository.
3. Hạn dùng access token và bcrypt cost là cấu hình môi trường; giá trị cụ thể chốt ở CWRM-12.
4. Ban góp ý `ruleVersion`, fingerprint và xử lý lỗi đầu vào Risk Engine. Các chi tiết này hiện là đề xuất ở CWRM-11_Architecture, không phải quyết định của Ban.

## Tài liệu căn cứ

Hai tài liệu đầu thuộc bộ tài liệu khởi động ngày 09/11/2026 của nhóm, lưu ngoài repository này:

- `00_Project_Scope_v0.1_ORIGINAL_UNCHANGED.md` — nghiệp vụ gốc, không sửa.
- `00_Project_Foundation_and_AI_Working_Guide.md` — mục 2–3 và 6.
- README của repository — quy ước nhánh `feature/CWRM-<ticket_id>-<tên_ngắn_gọn>` và commit `<type>(CWRM-<id>): <nội dung>`.

**Trạng thái phê duyệt:** Tech Lead chấp thuận ngày 11/11/2026; chờ phản hồi review của Hiệp và Ban. Chưa ghi nhận phê duyệt của toàn nhóm.
