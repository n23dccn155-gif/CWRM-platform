# Kế hoạch thiết kế lại giao diện CWRM theo vai trò

**Bản kế hoạch đầy đủ hơn:** [Kế hoạch tổng thể thiết kế web CWRM](CWRM-web-product-and-interface-master-plan.md). Tài liệu này giữ lại phần phân tích vai trò ban đầu.

Ngày lập: 11/11/2026. Phạm vi: kế hoạch UX/UI cho MVP, chưa phải đặc tả API hay bản thiết kế đã được duyệt.

## 1. Kết luận thiết kế

Giao diện hiện tại cần được thiết kế lại. Hai actor không nên xuất hiện như hai nhóm menu mà ai cũng nhìn thấy. Sau khi chọn workspace, hệ thống xác định quyền của tài khoản **trong workspace đó**, đưa người dùng tới điểm bắt đầu và menu phù hợp. Vẫn giữ một hệ thống thiết kế, một cấu trúc trang chi tiết task và các thành phần dùng chung để người dùng chuyển workspace không phải học lại sản phẩm.

Không gắn cứng `Manager` hoặc `Member` vào tài khoản: Scope v0.1 cho phép một tài khoản là Manager ở workspace A và Member ở workspace B. Manager cũng có thể là R trên một task; các thao tác thực hiện chỉ xuất hiện khi phân công đã Accepted. Quyền Manager của workspace, role/skill chuyên môn và RACI của task là ba khái niệm riêng.

## 2. Khảo sát sản phẩm tương tự

| Sản phẩm | Mẫu có thể học | Áp dụng cho CWRM |
| --- | --- | --- |
| [Asana: My Tasks](https://help.asana.com/s/article/my-tasks) và [quyền dự án](https://help.asana.com/s/article/individual-project-permissions) | Việc của cá nhân được gom thành một điểm vào; quyền xem và sửa được phân theo phạm vi. | Member bắt đầu tại “Việc của tôi”; Manager có bảng điều phối. Danh sách và chi tiết task chỉ trả dữ liệu trong phạm vi được phép. |
| [Linear: My Issues](https://linear.app/docs/my-issues) và [Members and roles](https://linear.app/docs/members-roles) | Gom việc cần tập trung theo mức ưu tiên; quyền quản trị tách khỏi công việc hằng ngày, guest chỉ thấy phạm vi được cấp. | Ưu tiên mục “Cần xử lý” thay cho bốn KPI chung chung; sidebar theo quyền hiện hành. |
| [ClickUp: Permissions in detail](https://help.clickup.com/hc/en-us/articles/6309221065495-Permissions-in-detail) | Khả năng thao tác còn phụ thuộc vào vị trí và từng đối tượng, không chỉ vai trò toàn cục. | Ẩn/khóa hành động theo quyền workspace **và** quan hệ với task (A, R, người được mời, người gửi request) **và** trạng thái. API phải kiểm tra lại. |
| [Asana: Approvals](https://help.asana.com/s/article/approvals) | Người duyệt có hàng việc và quyết định rõ; người nộp nhìn thấy phản hồi. | Review là một hàng chờ quyết định cho A; R thấy kết quả duyệt/trả lại ngay trong task. |

Đây là các nguyên tắc rút ra từ tài liệu chính thức, không phải đề xuất sao chép toàn bộ sản phẩm. CWRM giữ hai luồng Direct Assignment và Open Work, RACI, evidence và AI theo Scope v0.1.

## 3. Chẩn đoán bản hiện tại

1. `app-shell.tsx` luôn vẽ cả hai nhóm menu “Giao diện Manager” và “Giao diện Member”. Người dùng phải tự giả vờ đang đóng vai nào; không có quyền hiện hành ở cấp workspace.
2. `/` tự chuyển tới `/manager`; màn `/login` demo cũng dẫn tới `/manager`. Member không có điểm vào riêng.
3. Trang Manager mở bằng bốn thẻ số liệu rồi nhiều panel và bảng. Thứ tự này chưa trả lời ngay “quyết định nào cần tôi xử lý hôm nay?”. Trang Member dùng các thẻ công việc dài, làm lời mời, việc đang làm, việc chờ dependency và việc chờ duyệt khó quét nhanh.
4. Nội dung UI có nhiều thuật ngữ nội bộ như `Assignment Accepted`, `Risk High`, `Frontend skeleton`, lời giải thích API/mock và ghi chú quy tắc dài. Chúng làm giao diện giống tài liệu kiểm tra hơn là sản phẩm cho người dùng. Giữ thuật ngữ kỹ thuật trong tài liệu hoặc lớp chi tiết khi cần.
5. Task detail hiện trình bày nghiệp vụ qua các thẻ “flow stage”. Người dùng cần thấy trạng thái, người liên quan và **hành động tiếp theo** trước; trạng thái request/assignment và lịch sử nên xuống dưới.

Các nhận xét này dựa trên mã nguồn hiện có; chưa phải kết quả đánh giá bản Figma trực quan hoặc UAT.

## 4. Mô hình điều hướng mới

### Trước khi vào workspace

`Đăng nhập → Chọn workspace (nếu có nhiều) → Xác định quyền trong workspace → Trang đầu tương ứng`.

Nếu chỉ có một workspace thì vào thẳng. Bộ chọn workspace đặt ở đầu sidebar, luôn cho biết tên workspace và quyền hiện tại. “Tạo workspace” có thể nằm trong bộ chọn cho mọi tài khoản đã đăng nhập; người tạo trở thành Manager của workspace mới. Khi đổi workspace, làm mới dữ liệu và menu theo quyền mới. Không dùng nút “đổi vai” cho quyền thật. Bản demo chưa có auth có thể dùng **chuyển nhân vật demo** rõ ràng, chỉ trong môi trường demo.

### Menu Manager

1. **Tổng quan**: danh sách quyết định cần xử lý, rủi ro và tiến độ theo team.
2. **Công việc**: danh sách/board theo trạng thái, bộ lọc team, A/R, hạn, priority, risk; nút “Tạo công việc”.
3. **Chờ tôi duyệt**: request Open Work và task Review mà Manager là A; hai tab tách biệt.
4. **Rủi ro**: Medium/High, evidence và hành động quản lý có lý do.
5. **Đội ngũ**: team, thành viên, role/skill và quyền workspace.

Nếu Manager đang là R hoặc có lời mời Direct, hiện **Việc của tôi** như mục cá nhân. Nút tạo task là hành động chính ở Tổng quan/Công việc; không cần một mục “Tạo công việc” riêng trong sidebar.

### Menu Member

1. **Việc của tôi**: lời mời cần phản hồi; đang làm; bị chặn/chờ tiền nhiệm; chờ duyệt hoặc bị trả lại.
2. **Việc mở**: task trong team đủ phạm vi xem; lọc theo phù hợp role/skill, deadline và team; trạng thái request của bản thân.
3. **Công việc nhóm**: task được phép xem trong team để theo dõi và trao đổi; không hiện thao tác quản lý.

Member không thấy dashboard quản lý, danh sách quản trị thành viên, hàng duyệt hoặc AI. Risk/evidence của task thuộc team vẫn xem được ngay trong task. Không tạo một mục “Risk” tổng hợp cho Member.

### Màn dùng chung

**Task detail** giữ một cấu trúc: tiêu đề + trạng thái + hạn + tiến độ; khối “Việc cần làm tiếp theo”; mô tả/kết quả; người A/R và phân công; blocker/dependency; risk/evidence; trao đổi và lịch sử. Thanh hành động thay đổi theo quyền và trạng thái. Ví dụ: người được mời Direct thấy Chấp nhận/Từ chối; R Accepted thấy Bắt đầu hoặc Cập nhật tiến độ; A thấy Duyệt/Trả lại khi Review; Manager có hành động can thiệp kèm lý do. Người không có quyền vẫn có thể xem nội dung được phép, nhưng không nhận nút thao tác giả.

## 5. Bản đồ màn hình và trạng thái cần thiết

| Màn | Trạng thái/đầu ra cần thiết |
| --- | --- |
| Đăng nhập/chọn workspace | Chưa đăng nhập; một/nhiều workspace; lời mời workspace; không có workspace. |
| Manager tổng quan | “Cần tôi quyết định” ưu tiên Review, request, blocker/risk; số liệu gọn và danh sách task theo team ở lớp dưới. |
| Manager công việc/tạo task | List trước, board là tùy chọn; form tạo có bước cơ bản và nâng cao; chọn **một** nhánh Direct hoặc Open. |
| Manager chờ duyệt | Tab request Open Work và Review; lý do Reject/Trả lại; trạng thái hết chỗ và quyền A. |
| Manager rủi ro | Danh sách theo mức/hạn; detail hiển thị rule, thời điểm, evidence, cờ dữ liệu cũ; AI chỉ theo yêu cầu Manager. |
| Member việc của tôi | Lời mời Direct; task đang làm; chờ dependency; blocker; đã gửi Review; bị trả lại. Sắp theo mức cần hành động và hạn. |
| Member việc mở | Đủ điều kiện/chưa đủ điều kiện, còn chỗ/hết chỗ, chưa gửi/Pending/Withdrawn/Approved/Rejected. Giải thích điều kiện thiếu. |
| Task detail dùng chung | To Do, In Progress, Blocked, Review, Done; trạng thái assignment/request tách khỏi Task Status; thao tác theo A/R/người được mời. |

Không đưa đối tượng `Project` mới, portfolio, timesheet hoặc hệ thống thông báo đa mục đích vào MVP. Scope hiện dùng workspace → team → task/milestone.

## 6. Hướng thể hiện trực quan

- **Ưu tiên thông tin:** đầu màn là lời chào/ngữ cảnh ngắn và một danh sách có thể hành động; số liệu là phần hỗ trợ. Mỗi hàng task cho thấy tên, team, trạng thái, hạn, người chịu trách nhiệm và một cảnh báo quan trọng nhất. Click mở detail.
- **Mật độ:** dùng danh sách gọn cho nhiều task; card chỉ dành cho lời mời, quyết định hoặc tình huống nổi bật. Bớt panel lồng nhau, đoạn giải thích dài và badge trùng lặp.
- **Màu:** nền trung tính sáng, chữ đậm; một màu nhấn cho thao tác; màu rủi ro chỉ dùng cho risk/status tương ứng, luôn có nhãn chữ. Không dùng màu để phân biệt quyền Manager/Member.
- **Chữ và khoảng cách:** hệ thống cỡ chữ rõ ràng (tiêu đề trang, tiêu đề vùng, nội dung, chú thích); nhịp cách 8/16/24 px; tối đa 2–3 cấp nhấn trong một màn. Ngôn ngữ UI tiếng Việt đời thường: “Đã nhận việc”, “Chờ duyệt”, “Đang bị chặn”; mã nghiệp vụ nằm trong chi tiết hoặc tooltip.
- **Tương tác:** trạng thái loading/empty/error/success và lý do không thể thao tác phải được thiết kế cùng màn chính. Nút bị khóa cần giải thích điều kiện; không để hàng loạt nút disabled với ghi chú “chưa có API” trong bản trình diễn sản phẩm.
- **Responsive và accessibility:** desktop là chính theo NQ08; ở màn hẹp sidebar thu gọn, bảng chuyển thành danh sách, thanh hành động task vẫn dễ chạm. Điều hướng bàn phím, focus rõ, contrast, nhãn form và thông báo lỗi cạnh trường.

## 7. Luồng prototype phải chứng minh được

1. Manager tạo task Direct → Member thấy lời mời riêng → Accept/Decline → nếu Accepted thì R xuất hiện, task vẫn To Do → R Start khi dependency cho phép.
2. Manager mở Open Work → Member không đủ role/skill thấy lý do → Member đủ điều kiện gửi request → Manager Approve/Reject → Approved tạo R, không cần Accept lần hai.
3. R cập nhật tiến độ, báo blocker và xử lý → risk/evidence cập nhật → Manager xem và có thể yêu cầu AI giải thích → Manager thực hiện hành động hợp lệ có lý do.
4. R đạt 100%, hết blocker, gửi Review → A duyệt Done hoặc trả lại có lý do → task sau chỉ **được phép** Start khi tiền nhiệm Done.
5. Cùng tài khoản chuyển giữa hai workspace có quyền khác nhau; menu, trang đầu, dữ liệu và hành động đổi đúng. Truy cập URL trực tiếp trái quyền phải bị từ chối ở server/API, không chỉ ẩn link.

## 8. Thứ tự thực hiện

1. **Chốt UX:** vẽ sitemap hai vai trò, ma trận `quyền × quan hệ task × trạng thái`, wireflow 5 luồng trên và nội dung giao diện. Đối chiếu CWRM-13, Scope v0.1 với PM/Backend trước khi biến thành API contract.
2. **Thiết kế high fidelity:** design tokens, component library (sidebar, hàng task, status, alert, form, dialog lý do, empty/error), rồi dựng desktop cho Manager, Member và task detail dùng chung. Sau đó dựng responsive và prototype có nhánh lỗi.
3. **Kiểm tra nhanh:** cho ít nhất một người đóng vai Manager và một người đóng vai Member đi qua Direct, Open, blocker và Review; ghi thời gian tìm hành động, chỗ hiểu nhầm, sửa rồi kiểm tra lại.
4. **Triển khai frontend:** thay menu tĩnh bằng shell theo workspace role; route guard và dữ liệu theo quyền; kết nối backend sau khi CWRM-11 chốt; loại bỏ nhãn kỹ thuật khỏi luồng người dùng. Các thao tác nghiệp vụ cần API kiểm tra quyền và trạng thái, lưu audit.

## 9. Tiêu chí chấp nhận thiết kế

- Member không thấy menu và hành động quản lý; Manager không mất luồng thực hiện khi bản thân là R.
- Người dùng xác định được trong 5 giây: đang ở workspace nào, vai trò hiện tại, việc nào cần mình làm tiếp.
- Task detail phân biệt rõ Task Status, Assignment/Request Status, risk và RACI; một task chỉ có một nhánh Direct hoặc Open tại thời điểm tạo.
- Mọi thao tác quan trọng có trạng thái kết quả và lý do khi bị chặn; Review không bị hiểu là Done, risk High không tự chặn Review, AI không tự quyết định.
- Prototype bao phủ các nhánh chính và nhánh từ chối/lỗi; bàn giao được cho frontend/backend mà không phải suy đoán quyền.

## Nguồn nội bộ

- [Scope v0.1](../../../Hiep/Nguon_du_an/00_Project_Scope_v0.1_ORIGINAL_UNCHANGED.md), đặc biệt mục 6, S01–S12 và NQ08.
- [CWRM-13 user flow/wireframe hiện tại](CWRM-13-user-flow-wireframes.md).
- Mã frontend: `src/components/app-shell.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`, các trang Manager/Member/task.
