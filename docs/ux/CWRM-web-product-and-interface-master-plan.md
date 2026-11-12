# Kế hoạch tổng thể thiết kế web CWRM

Ngày khảo sát: 11/11/2026. Cập nhật theo yêu cầu thiết kế sản phẩm hoàn chỉnh: 11/11/2026. Trạng thái: **đề xuất để nhóm xem xét**, chưa thay Scope v0.1, chưa phải Scope v0.2 hay API contract đã duyệt. Tài liệu này mở rộng [kế hoạch tách giao diện theo vai trò](role-based-redesign-plan.md) thành bản tổ chức sản phẩm và giao diện đầu cuối.

**Đánh giá thẳng:** bản kế hoạch trước có bản đồ màn và gói việc nhưng **chưa đủ** làm kế hoạch sản xuất một web hoàn chỉnh. Nó thiếu quy trình theo cổng quyết định từ khám phá nhu cầu đến vận hành, đặc tả đăng nhập Google và tiêu chí kiểm tra mẫu Figma. Bản này bổ sung các phần đó. Không bắt đầu lập trình màn hình trước khi xác định yêu cầu, quyền, dữ liệu, luồng và tiêu chí chấp nhận.

**Lộ trình đọc tài liệu:** mục 0 cho toàn bộ quy trình; mục 1–4 chốt bài toán và phạm vi; mục 5–8 mô tả sản phẩm và UI đích; mục 9–13 là phụ thuộc, kiểm chứng và bàn giao; mục 14–18 là Figma, xác thực, quy trình chi tiết, ma trận chức năng và backlog thực hiện. Các quyết định chưa được nhóm xác nhận được ghi là *đề xuất*, không ngầm coi là baseline.

## 0. Quy trình làm sản phẩm trước khi viết giao diện

```text
0 Chuẩn bị nguồn và quyết định phạm vi
  → 1 Khảo sát người dùng và bài toán
  → 2 PRD, hành vi nghiệp vụ, tiêu chí chấp nhận
  → 3 Mô hình dữ liệu, quyền và hợp đồng API sơ bộ
  → 4 Kiến trúc thông tin và user flow
  → 5 Wireframe, prototype thấp, thử với người dùng
  → 6 Thiết kế giao diện hoàn chỉnh và prototype cao
  → 7 Chốt kỹ thuật, kế hoạch lát cắt và môi trường
  → 8 Lập trình từng luồng đầu cuối
  → 9 Kiểm thử tích hợp, bảo mật, khả dụng, hiệu năng
  → 10 UAT, phát hành, vận hành và cải tiến
```

**Không qua cổng chỉ vì đã tạo một tệp.** Mỗi bước có đầu vào, đầu ra và người kiểm tra tại mục 16. Một số việc kỹ thuật có thể làm song song với UX sau khi giao diện dữ liệu được thống nhất, nhưng không tạo UI đẹp dựa trên mock rồi mới phát hiện nghiệp vụ/API không hỗ trợ. Bản dùng được đầy đủ S01–S12 sẽ cần ước lượng lại so với dự thảo 246 giờ/5 tuần, đặc biệt khi thêm Google Sign-In, kiểm tra tài khoản trùng và các trạng thái bảo mật.

## 1. Quyết định thiết kế cốt lõi

CWRM là web điều phối công việc theo workspace và team, có hai quyền hệ thống **Manager** và **Member**. Giao diện phải đưa mỗi người đến công việc cần làm theo quyền trong workspace đang chọn. Một tài khoản có thể mang quyền khác nhau ở các workspace khác nhau; Manager cũng có thể là người thực hiện R của một task. Vì vậy dùng **một bộ thành phần và task detail chung**, nhưng trang đầu, điều hướng, dữ liệu và hành động được tính từ quyền workspace, tư cách trong team, quan hệ RACI/assignment và trạng thái task.

Giá trị khác biệt của CWRM so với một bảng Kanban thông thường là: **Direct Assignment có chấp nhận**, **Open Work có điều kiện role/skill và duyệt**, **một A và R có nguồn gốc rõ**, **blocker/dependency**, **risk có evidence**, và **AI chỉ tư vấn để Manager quyết định**. Giao diện phải làm các cơ chế này dễ hiểu, không biến chúng thành hàng chục thẻ kỹ thuật.

### Kết quả người dùng cần đạt

| Người dùng | Trong 5 giây sau khi vào web phải biết | Hành động ưu tiên |
| --- | --- | --- |
| Manager | Workspace/team nào, việc nào chờ quyết định, rủi ro nào cần xem | Duyệt, phân công, xử lý blocker/risk, tạo hoặc điều chỉnh task |
| Member | Lời mời nào chờ phản hồi, việc nào đang làm, việc nào bị chặn | Nhận/từ chối, bắt đầu, cập nhật, báo blocker, gửi Review, tìm Open Work |
| Manager đồng thời là R | Cả hàng quyết định với tư cách Manager và việc bản thân nhận làm | Thao tác R chỉ trên task đã Accepted; quyết định A chỉ trên task mình là A |

## 2. Phạm vi khảo sát thị trường

Không thể kiểm kê mọi website quản lý việc đang tồn tại hoặc xác nhận mọi tính năng qua tài khoản trả phí. Khảo sát này chọn **12 sản phẩm đại diện** ở các nhóm khác nhau, chỉ dùng tài liệu chính thức có thể kiểm tra ngày 11/11/2026. Chúng là nguồn tham khảo UX, không tự trở thành yêu cầu CWRM.

| Nhóm | Sản phẩm và bằng chứng | Mẫu đáng học | Quyết định cho CWRM |
| --- | --- | --- | --- |
| Điều phối tổng quát | [Asana My Tasks](https://help.asana.com/s/article/my-tasks), [project permissions](https://help.asana.com/s/article/individual-project-permissions), [Approvals](https://help.asana.com/s/article/approvals) | Việc cá nhân tập trung; quyền xem/sửa rõ; hàng duyệt có phản hồi. | “Việc của tôi” và “Chờ tôi duyệt” là hai điểm vào riêng; kết quả duyệt hiện ngay trong task. |
| Nhiều chế độ xem | [ClickUp Views](https://clickup.com/features/views), [permissions](https://help.clickup.com/hc/en-us/articles/6309221065495-Permissions-in-detail) | List/board/workload phục vụ cách đọc khác nhau; quyền phụ thuộc role và vị trí đối tượng. | List là mặc định, board là một chế độ xem bổ sung; quyền API phải xét đối tượng. Không sao chép mức tùy biến lớn. |
| Điều phối bằng bảng | [monday.com My Work](https://support.monday.com/hc/en-us/articles/360019300579-My-Work), [Workload](https://support.monday.com/hc/en-us/articles/360010166559-Resource-management-with-Workload) | Gom việc được giao từ nhiều bảng; Manager xem tải người. | Một hàng công việc cá nhân; workload chỉ là ngữ cảnh hỗ trợ Manager, không là bộ tối ưu lịch tự động. |
| Phần mềm và quy trình | [Jira boards/reports](https://www.atlassian.com/software/jira/features), [project permissions](https://confluence.atlassian.com/jirasoftwarecloud/how-can-i-restrict-users-access-to-a-specific-project-on-my-jira-site-1384126342.html) | Board/filter/role theo phạm vi; báo cáo phục vụ điều hành. | Bộ lọc rõ trong danh sách và kiểm tra quyền ở máy chủ. Không đưa backlog/sprint vào CWRM chỉ vì nhóm phát triển dùng Jira. |
| Công việc tập trung | [Linear My Issues](https://linear.app/docs/my-issues), [roles](https://linear.app/docs/members-roles), [Triage](https://linear.app/docs/triage) | Xếp việc theo mức cần chú ý; hàng chờ quyết định tách khỏi danh sách thông thường. | Dashboard Manager ưu tiên “Cần quyết định”; Member ưu tiên lời mời, blocker, hạn gần. |
| Kanban đơn giản | [Trello My Work](https://support.atlassian.com/trello/docs/my-work/), [board permissions](https://support.atlassian.com/trello/docs/configure-board-permissions/) | Xem việc của mình xuyên các bảng; board dễ quét. | Board chỉ thể hiện Task Status; không trộn trạng thái request/assignment vào cột. |
| Văn phòng phổ thông | [Microsoft Planner My Tasks](https://support.microsoft.com/en-us/planner/training/manage-your-tasks-in-microsoft-planner), [Charts](https://support.microsoft.com/en-us/planner/view-charts-of-your-plan-s-progress) | Điểm vào cá nhân đơn giản và biểu đồ tiến độ cho người điều phối. | Giữ số liệu tổng quan gọn, có click tới danh sách gốc. |
| Tài liệu và việc | [Notion projects/tasks](https://www.notion.com/en-gb/help/guides/getting-started-with-projects-and-tasks), [permissions](https://www.notion.com/help/sharing-and-permissions) | Task đi kèm ngữ cảnh và quyền xem theo nội dung. | Mô tả, kết quả, hội thoại và lịch sử ở một task detail; không xây trình soạn tài liệu riêng. |
| Hội thoại trong task | [Asana task comments](https://help.asana.com/s/article/task-comments-and-attachments), [Jira work item comments](https://support.atlassian.com/jira-software-cloud/docs/watch-share-and-comment-on-a-work-item/), [ClickUp task comments](https://help.clickup.com/hc/en-us/articles/44421277995415-Task-comments-now-work-like-Chat) | Các sản phẩm gắn trao đổi với đúng công việc và dẫn người xem trở lại task; ClickUp trình bày comment gần cách đọc chat. | Tạo một luồng “Trao đổi” theo từng task, tin mới và người/thời gian rõ; giữ lịch sử thao tác nghiệp vụ tách khỏi lời nhắn. |
| Mã nguồn mở | [OpenProject work packages](https://www.openproject.org/docs/user-guide/work-packages/), [roles](https://www.openproject.org/docs/user-guide/members/) | Bảng danh sách, chi tiết và quyền theo phạm vi dự án. | Task detail có thuộc tính rõ; Scope CWRM vẫn dùng workspace/team, không tạo đối tượng Project mới. |
| Quản lý tải | [Wrike Workload](https://help.wrike.com/hc/en-us/articles/1500005226322-Creating-Workload-Charts), [access roles](https://help.wrike.com/hc/en-us/articles/209603589-Access-Roles-in-Wrike) | Tải người hỗ trợ quyết định phân bổ. | Hiển thị số việc/effort tổng hợp khi Manager phân công; không suy diễn capacity thành điều kiện cấm nhận việc. |
| Dịch vụ theo nhóm | [Teamwork Workload Planner](https://support.teamwork.com/projects/workload/workload-planner-overview), [task permissions](https://support.teamwork.com/projects/using-teamwork/task-and-milestone-permissions) | Chỉ hiện việc nằm trong phạm vi xem; task và người được giao liên kết với kế hoạch tải. | Team membership chi phối danh sách; ẩn nội dung ngoài quyền kể cả qua search/deep link. |
| Công việc gọn | [Todoist team roles](https://www.todoist.com/help/account-and-billing/teams/team-roles-and-access-uGkyLrJQz), [team tasks](https://www.todoist.com/help/todoist/teams/manage-team-tasks-in-todoist-S99543QzY) | Vai trò nhóm và việc cá nhân đơn giản. | Giữ nhãn và thao tác ngắn gọn; CWRM vẫn hỗ trợ nhiều R theo Scope, nên không sao chép quy tắc một assignee. |

**Tổng hợp:** Mẫu lặp lại trong thị trường là (1) điểm vào công việc cá nhân, (2) góc nhìn điều phối có bộ lọc, (3) hành động theo quyền/phạm vi, (4) detail làm nơi giữ ngữ cảnh. CWRM bổ sung luồng nhận việc, nghiệm thu và risk có evidence. Chưa thấy lý do để bê nguyên mô hình portfolio, Gantt tương tác, tài liệu cộng tác, timesheet hoặc custom workflow vào MVP.

## 3. Kiểm kê và thứ tự ưu tiên nguồn nội bộ

Kiểm kê ban đầu bằng `rg --files` (không tính `node_modules`) có 246 tệp dự án: 55 HTML, 39 DOCX, 35 PDF, 25 Markdown, 21 JSON, 19 XLSX, 15 TSX và các loại khác. Ba PDF xuất Figma/flow nằm trực tiếp ở `Hiep` nay đã được đưa vào bảng nguồn bên dưới; các số đếm ban đầu chỉ là mốc kiểm kê, không phải tổng số tệp hiện hành. Nhiều tệp `LT`/`Lý thuyết` là bản trùng byte; Scope và bộ hồ sơ khởi động cũng có bản sao. Không cộng các bản sao thành bằng chứng độc lập.

| Nguồn đã kiểm tra | Dùng để quyết định | Giới hạn |
| --- | --- | --- |
| [Scope v0.1 gốc](../../../Hiep/Nguon_du_an/00_Project_Scope_v0.1_ORIGINAL_UNCHANGED.md) | S01–S12, quyền, trạng thái, risk, NQ01–09, AC01–14, ngoài phạm vi | Ưu tiên nghiệp vụ đến khi Scope v0.2 được nhóm chốt. Không sửa trực tiếp. |
| [Foundation](../../../Hiep/Nguon_du_an/00_Project_Foundation_and_AI_Working_Guide.md) và [Current State 09/11](../../../Hiep/Nguon_du_an/02_Project_Current_State_09-11-2026.md) | Quy tắc phối hợp, phân biệt baseline và đề xuất, tình trạng tại mốc 09/11 | Snapshot cũ hơn Jira ngày 11/11. |
| [Master Execution Plan](../../../Hiep/Nguon_du_an/01_Master_Execution_Plan_Full.md) | 51 WP, phụ thuộc CWRM-11/13/14/15, kế hoạch 5 tuần và dung lượng người | Dự thảo chưa chốt baseline; không tự tạo Jira issue từ WP. |
| [CWRM-13 local](CWRM-13-user-flow-wireframes.md) và [handoff 10/11](../../../Hiep/CWRM-13/CWRM-13_Review_va_Figma_Handoff_2026-11-10.md) | Bốn flow, wireframe và khoảng trống Figma/prototype được ghi nhận | Trạng thái tài liệu tại 10/11; Jira hiện đã ghi CWRM-13 Done. |
| [Wireframe 8 trang](../../../Hiep/CWRM-13%20_%20Wireframe%20Manager%20v%C3%A0%20Member%20v0.1.pdf), [User flow tổng quan](../../../Hiep/User%20flow.pdf) và [flow Direct/4 nhánh](../../../Hiep/CWRM-13%20_%20Direct%20Assignment%20user%20flow.pdf) | Bản xuất PDF người dùng cung cấp để audit từng trang và bốn luồng | Là ảnh chụp tại thời điểm xuất; không chứng minh prototype Figma đã nối hoặc phiên bản online hiện tại đã đồng bộ. |
| [Đặc tả CWRM-13 trong nguồn dự án](../../../Hiep/Nguon_du_an/CWRM_Bo_Tai_Lieu_Khoi_Dong_09-11-2026/CWRM-13_User_Flow_va_Wireframe_Manager_Member.md) | Sơ đồ tuần tự, hành trình bốn chặng, mô tả SC-01–SC-07 và design tokens để audit nội dung | Là Markdown mô tả, không phải bản xuất hình hoặc bằng chứng frame Figma/FigJam hiện tại. Mã SC khác mã SC trong handoff 10/11. |
| [Hướng dẫn tiểu luận và rubric](../../../LT/Huong_Dan_Tieu_Luan_QLDAPM.pdf) | Báo cáo, quản trị dự án Hybrid, ba persona khảo sát/UAT, Word/Excel/Git/demo, điều kiện chất lượng | Rubric nói về **đồ án**. WBS/CPM/PERT/EMV là hồ sơ thực hiện, không mặc nhiên là màn hình của web. |
| Giáo trình [Scope/WBS/Backlog](../../../LT/QLDA_Bai4_Scope_WBS_Backlog.pdf), [PERT/CPM](../../../LT/QLDA_Bai5_PERT.pdf), [nguồn lực](../../../LT/QLDA_Bai6_Phan_bo_nguon_luc.pdf), [rủi ro](../../../LT/QLDA_Bai07_TaiChinh_RuiRo.pdf), [tiến độ](../../../LT/QLDA_Bai8_tien_do.pdf), [release](../../../LT/QLDA_Bai9_release.pdf) | Kỷ luật ranh giới phạm vi, phụ thuộc công việc, bằng chứng phân bổ và UAT/release | Phần lớn ví dụ là TROLYAI hoặc quản trị dự án phát triển CWRM, không phải chức năng bắt buộc của người dùng CWRM. |
| [Bản chốt ý tưởng v1.0](../../../Hiep/Nguon_du_an/Ban_chot_de_tai_v1.0_Collaborative_Work_Coordination_and_Risk_Management_Platform.md) | Product vision và hai luồng giao việc | Scope v0.1 chi tiết hơn được ưu tiên nếu khác nhau. |
| Frontend `CWRM-platform/frontend/src` | Hiện trạng màn và component; chỗ phải thay | Bản UI skeleton/mock, không phải tích hợp API. |
| Jira [CWRM-8](https://ddinhbao05.atlassian.net/browse/CWRM-8), [CWRM-9](https://ddinhbao05.atlassian.net/browse/CWRM-9), [CWRM-11](https://ddinhbao05.atlassian.net/browse/CWRM-11), [CWRM-13](https://ddinhbao05.atlassian.net/browse/CWRM-13), [CWRM-14](https://ddinhbao05.atlassian.net/browse/CWRM-14), [CWRM-15](https://ddinhbao05.atlassian.net/browse/CWRM-15) | Trạng thái thực thi mới nhất kiểm tra ngày 11/11: CWRM-8/13 Done, CWRM-11/14/15 In Progress, CWRM-9 To Do | Trạng thái Jira không tự chứng minh toàn bộ nội dung thiết kế đã đạt chất lượng mong muốn; đọc evidence trước khi dùng làm baseline. |

**Quy tắc xung đột:** Scope v0.1 gốc > bản foundation/handoff cho nghiệp vụ; Jira hiện hành > snapshot 09/11 cho tiến độ; ERD/OpenAPI/ADR được duyệt > mock frontend cho contract. Tài liệu triển khai cũ ngày 16/10 có stack và lịch khác; dùng để hiểu lịch sử, không dùng làm quyết định hiện hành. Nếu muốn mở rộng hoặc giảm S01–S12, lập Change Request nội bộ.

## 4. Định nghĩa sản phẩm và mô hình thông tin

### 4.1 Ba persona để thiết kế, hai quyền để phân quyền

Rubric cần tối thiểu ba persona. Đề xuất persona thử nghiệm: **Manager điều phối nhiều team**, **Member được mời Direct**, **Member tìm Open Work theo skill**. Hai Member là hai bối cảnh nhu cầu, cùng một quyền hệ thống. Có thể dùng ba người thử khác nhau khi UAT; đây là giả thuyết persona cần đối chiếu với khảo sát CWRM-8, không phải kết quả khảo sát đã xác nhận.

### 4.2 Cấu trúc thông tin

`Tài khoản → Workspace (quyền Manager/Member) → Team → Task` và `Team → Milestone → Task (tùy chọn)`. Task có đúng một A; R có thể chưa có khi chờ nhận việc, sau đó một hoặc nhiều R đến từ Assignment Accepted. Role chuyên môn và Skill là nhãn điều kiện của Open Work, không phải quyền hệ thống. Task Status, Assignment Status, Request Status, risk level và alert state phải có nhãn/biểu đạt riêng.

### 4.3 Ranh giới MVP

Thiết kế trọn S01–S12 và AC01–14 của Scope v0.1, **cộng hai đề xuất do người dùng yêu cầu: Google Sign-In và không gian trao đổi/tài liệu đầy đủ cho từng task**. S08 v0.1 đã có bình luận văn bản; **@mention, tệp/ảnh/video, khu tra cứu tệp/link, trạng thái chưa đọc và cập nhật tin gần thời gian thực vượt Scope v0.1** (S03/S08/S11 và mục ngoài phạm vi). Ghi thành Change Request cho Scope v0.2 hoặc phiên baseline tiếp theo, ước lượng lại trước khi cam kết release. Không tự xem các chức năng mới là đã được nhóm duyệt chỉ vì có trong kế hoạch. Không thêm `Project` riêng, subtask, checklist, task lặp, calendar/Gantt tương tác, timesheet, nhóm chat ngoài task, hệ thống thông báo đa mục đích, tùy biến workflow/risk rules, báo cáo BI hay AI tự hành động. Chế độ board có thể là **cách xem cùng task**, không sinh workflow mới. Giao diện mobile web dùng được ở mức cơ bản, desktop là mục tiêu nghiệm thu NQ08; không làm ứng dụng native.

## 5. Kiến trúc trải nghiệm và bản đồ điều hướng

### 5.1 Điểm vào

`/register` để **đăng ký tài khoản CWRM bằng địa chỉ email đang có và tự đặt mật khẩu**, hoặc chọn Google ở `/login` hay `/register` để dùng tài khoản Google đang có → phiên CWRM → nếu có nhiều workspace thì `/workspaces` → vào `/:workspaceSlug`. Web **không tạo địa chỉ/hộp thư email**. Người đã đăng ký tài khoản CWRM bằng email thì dùng email/mật khẩu đó để đăng nhập; người chọn Google lần đầu được tạo tài khoản CWRM sau khi Google xác thực và hoàn tất thông tin tối thiểu nếu thiếu. Chọn workspace ở đầu sidebar. Quyền lấy từ membership của workspace hiện hành, không từ dropdown “đổi vai”. Mọi tài khoản đã đăng nhập có thể tạo workspace mới và trở thành Manager ở workspace mới. Lời mời workspace là một trạng thái riêng trước khi người được mời có quyền truy cập. Chi tiết và trường hợp email trùng ở mục 15.

### 5.2 Sidebar theo vai trò

| Manager | Member | Chung |
| --- | --- | --- |
| Tổng quan; Công việc; Chờ xử lý (request + Review); Rủi ro; Đội ngũ | Việc của tôi; Việc mở; Công việc nhóm | Bộ chọn workspace; tìm kiếm task trong phạm vi; hồ sơ; đăng xuất; trợ giúp ngắn |

Manager thấy “Việc của tôi” khi có assignment/lời mời bản thân. Member xem risk/evidence ngay trong task thuộc team, không thấy dashboard risk toàn workspace. Menu “Chờ xử lý” là hàng nghiệp vụ, không xây hệ thống Inbox đa mục đích trái S11. Alert risk riêng có badge/cửa sổ từ topbar và danh sách trong màn rủi ro/việc của tôi theo quyền.

### 5.3 Route đề xuất để lập trình

| Route logic | Màn | Quyền/dữ liệu |
| --- | --- | --- |
| `/login`, `/register`, `/workspaces`, `/workspaces/new`, `/invites` | Tài khoản và chọn workspace | Chưa đăng nhập/đã đăng nhập tương ứng |
| `/w/[workspace]/overview` | Manager dashboard | Manager |
| `/w/[workspace]/tasks` | Danh sách/board task | Manager mọi team; Member team mình |
| `/w/[workspace]/tasks/new` | Tạo task | Manager |
| `/w/[workspace]/tasks/[id]` | Task detail chung | Người có quyền với team/task |
| `/w/[workspace]/my-work` | Việc của tôi | Member, hoặc Manager có việc cá nhân |
| `/w/[workspace]/open-work` | Việc mở | Member và Manager tham gia team nếu đủ điều kiện |
| `/w/[workspace]/decisions` | Request/Review chờ quyết định | Manager; Review chỉ với task mình là A |
| `/w/[workspace]/risks` | Risk dashboard + cảnh báo | Manager |
| `/w/[workspace]/teams`, `/members`, `/skills` | Quản lý đội ngũ/danh mục | Manager; Member chỉ trang hồ sơ/nhãn của mình |

Đây là tên route đề xuất, không phải contract đã chốt. Khi triển khai có thể giữ alias/redirect từ route skeleton cũ; quyền và phạm vi không được dựa vào tên route. URL trực tiếp trái quyền phải trả lỗi từ server/API.

## 6. Đặc tả màn hình để vẽ và triển khai

Mỗi màn cần bản desktop 1440 px, desktop hẹp 1024 px và mobile web 390 px cho các luồng cốt lõi; trạng thái loading, empty, error, forbidden và success được vẽ cùng màn. Ưu tiên thiết kế như sau.

| ID | Màn | Nội dung trên màn đầu | Hành động/chú ý |
| --- | --- | --- | --- |
| U01 | Đăng nhập/đăng ký | Form ngắn, lỗi cạnh trường, tình trạng phiên | Không dẫn mọi người mặc định tới Manager. |
| U02 | Chọn/tạo workspace, lời mời | Workspace + vai trò, lời mời Pending | Accept/Decline; workspace trống có hướng dẫn tạo team. |
| M01 | Manager tổng quan | “Cần tôi xử lý” theo Review, request, risk High/Medium, blocker; sau đó KPI và task | Hàng nào cũng drill down; KPI không thay danh sách hành động. |
| M02 | Công việc | List mặc định, tìm kiếm/filter/sort theo team, status, A/R, hạn, priority, risk; board là tùy chọn | Board cột Task Status; request/assignment là badge phụ. |
| M03 | Tạo/sửa task | Thông tin cơ bản: tên, team, A, hạn, priority, số người cần, Direct/Open; nâng cao: milestone, estimate, dependency, deadline type | Một nhánh nhận việc tại thời điểm tạo; xem trước điều kiện và lỗi trước khi lưu. |
| M04 | Chờ xử lý | Hai tab “Yêu cầu nhận việc” và “Chờ nghiệm thu”; số lượng, task, người gửi, hạn | Approve/Reject hoặc Done/Trả lại có dialog xác nhận/lý do. |
| M05 | Rủi ro | Bộ lọc mức, team, hạn; risk row có evidence tóm tắt và thời điểm đánh giá | Chi tiết rule/evidence, snapshot cũ, AI theo yêu cầu, hành động Manager có lý do. |
| M06 | Đội ngũ | Team, thành viên, quyền workspace, role/skill, task responsibility còn mở | Chặn hạ/gỡ quyền làm mất A/R; giải thích cách xử lý. |
| W01 | Việc của tôi | Nhóm “Cần phản hồi”, “Đang làm”, “Bị chặn/chờ”, “Chờ duyệt”, “Đã xong” | Xếp theo hành động/hạn; chỉ task mà người dùng là R hoặc lời mời của mình. |
| W02 | Việc mở | Công việc theo team, đủ/chưa đủ điều kiện, chỗ còn lại, deadline, role/skill | Request/Withdraw, trạng thái Pending/Rejected/Approved; lý do thiếu điều kiện. |
| W03 | Công việc nhóm | Task có thể xem trong team, filter nhẹ; biểu tượng `Trao đổi` và số tin chưa đọc theo task nếu CR được duyệt | Mở đúng hội thoại của task/xem risk theo quyền; không thấy nút quản lý. |
| T01 | Task detail chung | Header: tên/status/hạn/risk; tiếp là “Bước tiếp theo”; mô tả/kết quả; A/R; blocker/dependency; evidence; nút `Trao đổi` mở cuộc trò chuyện của task; tab **Lịch sử** riêng | Nhắn tin, gửi/xem tệp và link, @mention, mở kho tệp/link theo quyền nếu CR được duyệt; action bar nghiệp vụ vẫn theo quyền và trạng thái. |
| T02 | Trao đổi & tài liệu của task (subview của T01, có deep link) | Hội thoại theo thời gian; composer văn bản/link/đính kèm; khu `Tệp & liên kết` lọc Tài liệu/Ảnh/Video/Link | Mở từ biểu tượng hội thoại ở task row/T01; quay lại giữ task; tệp và tin cùng phạm vi quyền task, Done chỉ đọc theo baseline trừ khi CR quy định khác. |
| P01 | Hồ sơ/cài đặt cá nhân | Tên, workspace membership, team, role/skill chuyên môn | Member xem nhãn của mình; không tự sửa để vượt eligibility. |

### Hai khung màn quan trọng

```text
MANAGER / TỔNG QUAN
Workspace ▼   Tìm task...                       Risk alert   Tài khoản
Tổng quan | Công việc | Chờ xử lý | Rủi ro | Đội ngũ
Hôm nay cần bạn quyết định                         + Tạo công việc
[3 chờ nghiệm thu] [2 request] [1 risk High] [1 blocker mở]
Hàng ưu tiên: TASK-103  Poster chiến dịch | Review | hạn 12/11
             A: bạn  R: Lan  [Duyệt kết quả] [Xem task]
... danh sách ưu tiên có bằng chứng và hành động ...
Tiến độ theo team / bộ lọc / số liệu tổng hợp nằm dưới
```

```text
TASK DETAIL (cùng cấu trúc cho mọi vai trò)
← Công việc     TASK-103  Thiết kế poster          [Blocked] [Risk High]
Team A · Hạn 12/11 · A: Bảo · R: Lan, Hiệp · Tiến độ 30%
[Bước tiếp theo: giải quyết blocker X] [Hành động hợp lệ theo người xem]
Mô tả và kết quả  |  Phân công/Request  |  Blocker/Dependency
Rủi ro: vì sao mức High? rule + evidence + thời điểm/snapshot
Trao đổi (12) [2 mới] → mở T02
  [Lan · 09:42] “@Bảo, thiếu bản nội dung chốt.” [📎 brief.pdf]
  [Bảo · 10:05] “Xem bản mới ở https://...” [Ảnh xem trước]
  [Nhập lời nhắn…] [@] [📎] [Gửi]     [Tệp & liên kết]
Lịch sử: blocker, đổi hạn, Review/Done có người, thời điểm và lý do
```

## 7. Luồng nghiệp vụ và quyền phải hiện trong UI

1. **Direct:** Manager tạo To Do, một A, số người cần → gửi đề nghị cho người trong team → đúng người nhận Accept/Decline (Decline cần lý do) → Accepted tạo R nhưng task vẫn To Do → R Start khi đủ tiền nhiệm Done. Pending proposal chiếm chỗ theo S04.
2. **Open Work:** Manager mở task To Do với role/skill/số chỗ → Member xem điều kiện thiếu hoặc gửi request → Pending chưa có R → Member có thể Withdraw → Manager duyệt khi còn chỗ và eligibility còn đúng → Approved tạo Accepted/R; Reject có lý do. Đủ chỗ hoặc task đã bắt đầu thì đóng đăng ký.
3. **Thực hiện:** R Accepted Start; cập nhật progress/effort khi In Progress/Blocked; báo blocker làm task Blocked; giải quyết blocker cuối cùng đưa về In Progress theo quy tắc nghiệp vụ; giữ lịch sử người/thời gian.
4. **Dependency và Review:** task sau chỉ được Start khi mọi predecessor trực tiếp Done; progress 100 và hết blocker mới gửi Review; chỉ A hiện hành duyệt Done hoặc trả In Progress có lý do và progress mới 0–99. Review không đồng nghĩa Done.
5. **Risk/AI:** risk snapshot Low/Medium/High có rule, evidence, evaluatedAt/version; Manager xem mức Medium/High và chủ động gọi AI; AI lỗi vẫn xem evidence; gợi ý cũ khi dữ liệu đổi phải ghi “không còn hiện hành”; Manager chọn thao tác thật có reason/audit rồi đánh giá lại risk, không mặc định về Low.

### 7.1 Không gian trao đổi và tài liệu theo task (S08 + Change Request)

**Ý tưởng sản phẩm:** mỗi task có một cuộc trò chuyện và một kho tra cứu những gì đã gửi trong cuộc trò chuyện đó. Trên task row/card và T01 có biểu tượng bong bóng thoại với nhãn **`Trao đổi`** (tên đề xuất dễ hiểu hơn “Nhắn tin”, có thể thử với người dùng). Bấm mở T02, giữ tên task và đường quay lại luôn thấy được. Cách đọc tin, ô soạn, nút kẹp giấy và @ quen thuộc như ứng dụng nhắn tin; dữ liệu vẫn thuộc **task** và quyền của workspace/team. [Asana](https://help.asana.com/s/article/task-comments-and-attachments) nhóm văn bản cùng tệp trong comment; [ClickUp](https://help.clickup.com/hc/en-us/articles/6309666546199-Add-attachments-to-tasks) cho xem mọi tệp của task; [Jira](https://support.atlassian.com/jira-software-cloud/docs/watch-share-and-comment-on-a-work-item/) hỗ trợ @mention trong bình luận. Đây là mẫu tham khảo, không sao chép giao diện thương hiệu của họ.

**Ranh giới baseline:** S08 v0.1 chỉ có bình luận văn bản; S03/S08 và mục ngoài phạm vi loại kho tệp riêng, chat realtime, mention. Thiết kế dưới đây là **đích đề xuất cho web hoàn chỉnh**, cần CR cho CWRM-9/Scope v0.2 hoặc baseline tiếp theo trước khi chốt effort, lưu trữ, lịch và AC. Không gọi phần đính kèm/@/realtime là đã có trong sản phẩm hiện tại.

| Vùng giao diện T02 | Hành vi và trạng thái cần thiết kế |
| --- | --- |
| Điểm vào | Icon bong bóng + chữ `Trao đổi`, số tin chưa đọc trên task card/list/T01; deep link trở về đúng task và tab hội thoại. Khi không có tin, hiển thị lời mời đặt câu hỏi. Desktop là panel đủ rộng để đọc hội thoại bên cạnh ngữ cảnh task; mobile là màn một cột có back rõ. |
| Hội thoại | Tin theo thời gian với avatar/tên, mốc ngày, giờ, nội dung, @mention có liên kết người, thẻ link, thumbnail ảnh/video, thẻ tệp tên/loại/dung lượng. Tin của mình và người khác phân biệt vừa đủ; không dùng màu làm dấu hiệu duy nhất. Tin dài, nhiều tệp, tin lỗi và nội dung đã lưu có trạng thái riêng. |
| Ô soạn | Nhập văn bản và URL; `@` mở danh sách **người còn quyền xem task**; nút kẹp giấy chọn tệp/ảnh/video, kéo thả và dán ảnh; danh sách tệp đợi gửi có tên/dung lượng, thanh tiến độ, bỏ từng tệp; `Gửi` chỉ hoạt động khi có nội dung hoặc ít nhất một tệp sẵn sàng. Hiện đang gửi, gửi xong, thất bại/thử lại; không nhân bản tin khi mạng chập chờn. |
| Link | URL `http/https` trong tin có thể bấm và hiện domain; tự trích vào tab `Liên kết` với người gửi, thời điểm và nút trở về tin gốc. Link ngoài chỉ được **lưu địa chỉ**, không tự đưa tài liệu của Google Drive/OneDrive vào kho CWRM hoặc thay quyền truy cập của dịch vụ ngoài. Metadata/preview tự động chỉ làm nếu Backend có quy trình fetch an toàn. |
| Tệp/ảnh/video | Một tin có thể gồm văn bản + nhiều đính kèm. Ảnh mở lightbox, video định dạng được hỗ trợ mở player, tài liệu có thể tải xuống; loại chưa preview được hiện file card và download. Mỗi file luôn có link về tin gốc. Chỉ hiện tệp sau khi upload/kiểm tra thành công; file lỗi có thông báo và thử lại. |
| `Tệp & liên kết` | Nút ở header mở ngăn bên phải trên desktop hoặc sheet/trang riêng trên mobile. Tab `Tất cả`, `Tài liệu`, `Ảnh`, `Video`, `Liên kết`; số lượng, tìm theo tên file/nội dung link, lọc người gửi và thời gian; chọn mục → xem/tải hoặc nhảy về đúng tin. Đây là **chỉ mục của nội dung đã gửi**, không một bản sao tệp khác. |
| Tin mới và @ | Badge chưa đọc theo user/task, vạch `Tin mới` trong hội thoại; @mention chỉ tới người có quyền xem task và tạo tín hiệu trong ứng dụng dẫn tới đúng tin. Gửi tin mới có thể báo cho người tham gia task theo quy tắc được nhóm chốt, tránh báo lại cho người gửi và tránh spam. Không tự cấp quyền xem task cho người bị tag. |
| Cập nhật gần thời gian thực | Người đang mở T02 thấy tin mới mà không cần tải cả trang; kiến trúc chọn WebSocket/SSE hoặc cơ chế tương đương ở D04, có fallback polling/reconnect/backfill theo ID để không mất/nhân đôi tin. Không hứa “đã gửi” cho tới khi máy chủ lưu thành công. Trạng thái đang gõ và gọi video không nằm trong yêu cầu này. |
| Lịch sử và hoàn thành | `Trao đổi` giữ nội dung người dùng; `Lịch sử` riêng giữ action chính thức và audit. Nhắn “đã xong” không tự chuyển Done; đính kèm file không tự gửi Review. Theo S03 v0.1, task Done và hội thoại/tệp liên quan chuyển **chỉ đọc** nhưng còn tra cứu; nếu muốn nhắn tiếp sau Done, phải đổi quy tắc bằng CR. Chính sách sửa/xóa/giữ dữ liệu cần nhóm chốt trước thiết kế cuối; mặc định đề xuất không xóa cứng tin/tệp đã dùng làm bằng chứng công việc. |
| Quyền | Manager trong workspace có thể xem task; Member chỉ task thuộc team đang tham gia. Đọc/gửi tin, upload, preview, tìm, tải và mở URL tệp đều kiểm tra lại quyền ở máy chủ. R/A/C/I không tự cấp quyền ngoài team. Người bị gỡ khỏi team mất quyền truy cập cả tin và tệp, kể cả qua link cũ; @mention không vượt phạm vi này. |

**Mô hình dữ liệu/contract cần D04 chốt:** `TaskMessage(id, taskId, authorId, body, createdAt, serverOrder, clientRequestId)`; `TaskAttachment(id, taskId, messageId, storageKey, originalName, mimeDetected, size, status, uploadedBy, createdAt)`; `TaskLink(id, taskId, messageId, url, domain)`; `MessageMention(messageId, userId)`; `TaskReadCursor(taskId, userId, lastSeenOrder)`. Tệp nhị phân ở object storage riêng tư; DB lưu metadata/chỉ mục. API tối thiểu gồm lấy tin phân trang, tạo tin + tham chiếu tệp đã upload, khởi tạo/hoàn tất upload, lấy quyền xem/tải, danh sách tệp/link theo task, cập nhật đã đọc và kênh tin mới. Chốt transaction để không sinh tin trỏ vào tệp chưa sẵn sàng hoặc tệp mồ côi; quy định dọn upload bỏ dở, backup và khôi phục **cả DB lẫn storage**.

**Chính sách tệp cần chốt ở cổng D03/D04/D07:** danh sách MIME/đuôi cho tài liệu, ảnh và video (ứng viên: PDF, DOCX, XLSX, PPTX, TXT, PNG, JPEG, WEBP, MP4); giới hạn mỗi tệp và quota workspace theo chi phí thật (ứng viên để ước lượng: ảnh 10 MB, tài liệu 25 MB, MP4 100 MB, 1 GB/workspace); số tệp mỗi tin; thời gian lưu sau Done; quyền xóa/chỉnh sửa; xử lý file vi phạm. Không lưu tệp trong thư mục public hay để URL tải vĩnh viễn. Theo [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), phải kiểm tra quyền, kích thước, loại thực của tệp, đổi tên lưu trữ, quét/kiểm tra trước khi phát cho người khác và bảo vệ đường tải. URL ngoài được escape và chỉ nhận giao thức an toàn; không tự fetch URL do người dùng nhập nếu chưa có bảo vệ SSRF.

**Thứ tự hiện thực trong cùng mục tiêu tính năng:** (1) tin văn bản + URL lưu DB và quyền; (2) upload tệp/ảnh/video + preview/download + `Tệp & liên kết`; (3) @mention + chưa đọc + cập nhật gần thời gian thực. Ba lát có thể bàn giao riêng nhưng **chỉ gọi tính năng đáp ứng yêu cầu người dùng khi cả ba qua test**. Không dùng một ô comment tĩnh để đánh dấu “đã có chat và kho tài liệu”.

**Kiểm thử nghiệm thu bắt buộc:** hai người cùng team nhắn qua hai trình duyệt và thấy tin mới; gửi URL, ảnh, PDF, MP4 rồi tìm lại từng loại trong `Tệp & liên kết` và nhảy về tin gốc; @ đúng người, người ngoài team không hiện trong gợi ý và không nhận quyền; tải trực tiếp file qua URL khi đã mất membership phải bị chặn; file sai loại/quá cỡ/bị từ chối không xuất hiện như file dùng được; tải dở/thử lại không tạo hai tin; mở lại task sau một tuần vẫn thấy nội dung; Done chỉ đọc; nhắn “đã giải quyết blocker” không đổi blocker nếu chưa dùng action nghiệp vụ. Kiểm tra cả mạng ngắt/reconnect, file ngoài quyền, XSS ở văn bản/link/tên file và quota đầy.

### Ma trận hiển thị hành động tối thiểu

| Hành động | Điều kiện UI | Kiểm tra máy chủ |
| --- | --- | --- |
| Tạo/sửa task, quản lý team/member/role/skill | Manager trong workspace | Workspace role, team scope, ràng buộc A/R và trạng thái |
| Accept/Decline Direct | Đúng người được mời, proposal Pending | Proposal còn hiệu lực và không vượt số người cần |
| Request/Withdraw Open Work | Thuộc team, đủ role/skill, To Do, còn chỗ, chưa là R | Kiểm tra eligibility/chỗ lần nữa; chống thao tác đồng thời |
| Approve/Reject request | Manager và request Pending | Scope, eligibility, chỗ, trạng thái tại thời điểm ghi |
| Start/progress/blocker/submit Review | R Accepted, trạng thái phù hợp | R còn hiệu lực, dependency/blocker/progress guard |
| Approve Done/Return | Manager là A của task đang Review | A hiện hành, kết quả/lý do, optimistic locking |
| Mở T02, đọc/gửi tin, @, upload/xem/tải tệp và kho link | Manager workspace hoặc Member trong team, task chưa Done để ghi | Task/workspace/team membership hiện hành cho **từng API và từng tệp**; loại/cỡ/quota/trạng thái scan, mention hợp lệ, chống gửi lặp; Done chỉ đọc |
| Xem risk evidence | Manager toàn workspace; Member task trong team | Lọc dữ liệu theo quyền, không lộ task khác qua workload |
| Gọi AI và can thiệp | Manager, snapshot Medium/High hợp lệ | Snapshot hiện hành, quyền, action hợp lệ, audit và re-evaluate |

Ẩn nút là hướng dẫn sử dụng; **không** được xem là phân quyền. Màn 403 thân thiện và API guard là điều kiện NQ01.

## 8. Ngôn ngữ hình ảnh và hệ component

### 8.1 Phong cách

Web công cụ làm việc: sáng, gọn, tin cậy, có nhịp thông tin. Đề xuất nền xám rất nhạt, bề mặt trắng, chữ xanh than; màu nhấn xanh lục lam dùng cho thao tác chính; vàng/đỏ cho cảnh báo, xanh lá cho kết quả tốt. Màu không thay nhãn chữ. Tránh header lớn, gradient trang trí, nhiều thẻ chỉ số, panel lồng nhau và đoạn giải thích quy tắc dài ở vùng đầu màn. Chỉ tối đa một CTA chính trên một vùng.

Typography đề xuất: font sans hỗ trợ tiếng Việt tốt (Inter hoặc system), tiêu đề trang 28–32 px, tiêu đề vùng 18–22 px, nội dung 14–16 px, nhãn phụ tối thiểu 12 px. Lưới khoảng cách 4/8/12/16/24/32; vùng nội dung desktop khoảng 1200–1440 px, sidebar 232–256 px, task detail có cột chính và cột ngữ cảnh. Dùng line-height thoáng cho phần giải thích evidence.

### 8.2 Thành phần phải thiết kế trước màn

App shell theo quyền; workspace switcher; topbar/search; task row; board card; status chip cho **năm loại trạng thái khác nhau**; risk alert row; action queue row; progress display; filter bar; tab; form field; direct/open choice; people/skill picker; dependency picker; dialog nhập lý do; blocker timeline; evidence list; AI recommendation panel; **icon Trao đổi + unread badge, message list, composer, @picker, attachment queue/progress, image/video/file card, media viewer, `Tệp & liên kết` drawer và tìm kiếm**; activity log riêng; skeleton; empty/forbidden/error/success state; toast. Component phải có hover/focus/disabled/loading, nhãn tiếng Việt, bàn phím và tương phản dễ đọc. Không cho thẻ màu/risk làm nguồn thông tin duy nhất.

### 8.3 Responsive

Desktop ≥1024 px là thiết kế chính. 768–1023 px: sidebar thu gọn, bảng bớt cột. ≤767 px: menu dạng drawer, task list thành hàng xếp dọc, filter mở sheet, task detail một cột, action bar ở cuối vùng nhìn. Thiết kế mobile web để theo dõi và hành động cốt lõi; form quản trị phức tạp có thể ưu tiên desktop nhưng phải thông báo rõ, không vỡ bố cục.

## 9. Phụ thuộc dữ liệu và các quyết định còn mở

**CWRM-11:** cần ERD/OpenAPI/ADR chốt membership hiện hành, quyền team, action availability hoặc mã lỗi, state của assignment/request, số chỗ, version chống ghi đè, task visibility, **TaskMessage/TaskAttachment/TaskLink/MessageMention/TaskReadCursor** theo mục 7.1, upload state, private storage, download authorization, quota, event ordering/reconnect, risk snapshot/stale, alert, audit. Phần vượt Scope v0.1 chỉ thành contract triển khai sau CR; không trộn hội thoại với audit log. Frontend không tự đặt tên endpoint hoặc coi `demo-data.ts` là contract.

**CWRM-15:** risk schema hiện là ứng viên cho R01–R03. Scope v0.1 còn R01–R12; thiết kế evidence phải mở rộng được và biểu diễn `Low` không có rule, snapshot lỗi/cũ, task Done có lịch sử. Nếu nhóm giảm số rule phải có CR.

**CWRM-9:** Scope v0.2 đang To Do tại lần kiểm tra Jira ngày 11/11. Kế hoạch này bám Scope v0.1; mọi hạng mục mới ngoài đó chỉ là đề xuất. CR cần ghi riêng Google Sign-In và **T02 trao đổi/tài liệu**: file/loại/cỡ/quota, @mention, unread, cập nhật gần thời gian thực, chi phí storage/băng thông, chính sách giữ/xóa và AC. Cần PM quyết định rõ mức hoàn thiện high fidelity, bản Figma hiện tại có giữ hay vẽ lại, và lịch UAT thực tế sau khi có bản chạy.

**Mâu thuẫn cần giải quyết trước triển khai:** snapshot local 09/11 ghi Sprint tương lai và CWRM-13 chưa Done, nhưng Jira hiện ghi Sprint active và CWRM-13 Done. Dùng Jira cho tiến độ, kiểm tra link/evidence Figma để đánh giá chất lượng thiết kế. Bản kế hoạch cũ ngày 16/10 đề xuất Vite/Ant Design và bảy tuần, trong khi repo hiện là Next.js và Master Plan mới là năm tuần; không trộn hai lịch/stack.

## 10. Tổ chức triển khai sau khi bạn phân subagent

Không giao nhiều agent sửa cùng một file. Các gói dưới đây là **đơn vị bàn giao đề xuất**, chưa tạo agent/Jira issue hoặc thay phân công nhóm. Mỗi gói nhận cùng Scope v0.1, tài liệu này, hợp đồng dữ liệu được duyệt; đầu ra có link, giả định, AC đã đối chiếu và điểm giao tiếp với gói khác.

| Gói | Đầu ra và vùng sở hữu | Bắt đầu khi | Tiêu chí bàn giao |
| --- | --- | --- | --- |
| A. Product UX | Persona được đối chiếu khảo sát, sitemap, journey Direct/Open/Review/Risk, ma trận quyền × trạng thái, copy tiếng Việt, Figma wireflow | Scope v0.1 và CWRM-8/13 | Mỗi bước có người thao tác, dữ liệu, guard, lỗi, đường quay lại; PM/Backend review. |
| B. Visual system | Tokens, component library, 3 breakpoint, trạng thái tương tác, mẫu list/row/detail/dialog | Gói A chốt khung | Một component biểu đạt nhất quán; kiểm tra focus, tương phản, mật độ. |
| C. Auth/workspace/team UI | U01–U02, M06, P01; shell theo workspace role, chọn team | A/B và contract S01–S02 | Đổi workspace đổi menu/dữ liệu; lời mời/empty/403; role cuối cùng guard. |
| D. Manager work UI | M01–M04, M02/M03; task list/board, form, hàng quyết định | A/B, contract S03–S06 | Direct/Open tách, Review chỉ A; filter/drill-down và lý do Reject/Return. |
| E. Member work UI | W01–W03, lời mời, Open Work, request, tiến độ/blocker | A/B, contract S04–S09 | Eligibility giải thích được; Accepted không tự Start; guard dependency/blocker. |
| F. Shared task detail | T01/T02 layout, action state, RACI, dependency, evidence, **điểm vào Trao đổi và lịch sử riêng** | A/B và contract S03–S10 + CR T02 | Cùng layout cho hai vai trò; mở/đóng T02, không lộ action/dữ liệu; Done chỉ đọc. |
| G. Risk/AI UI | M05, alert, evidence, snapshot cũ, AI, Manager action | A/B, risk/API contract S10–S12 | Gọi AI thật qua backend khi tích hợp; fallback; action có reason/audit và re-evaluate. |
| H. Task conversation/media | T02 composer, file/link cabinet, @, unread, upload/download, delivery/reconnect; contract với F | D03/D04, F task shell | Một task trao đổi được giữa hai người, tài liệu tra lại được, mọi đường tải giữ quyền; nghiệm thu CR T02. |
| I. Integration/QA | API client, route/data guards, E2E flows, accessibility/responsive/performance/UAT evidence | C–H từng lát | AC01–14, NQ01–09 và AC bổ sung T02; reload không mất trạng thái; lỗi không bị giả thành success. |

**Thứ tự tích hợp:** A → B + contract review → C/F foundation → D/E theo lát Direct rồi Open; H bắt đầu sau contract và dùng task shell của F; G Risk/AI; I kiểm thử xuyên suốt. Từng lát phải chạy end-to-end với API khi backend sẵn sàng; mock dùng cho thiết kế và phát triển giao diện, không làm bằng chứng nghiệm thu. Gói F định nghĩa interface T01/T02 trước khi D/E/H thêm action; gói I tham gia từ đầu để viết kịch bản.

**Cách chia tệp khi lập trình:** một người sở hữu shell/navigation và tokens; mỗi màn theo route tách file; component dùng chung chỉ gói B/F sửa qua PR review; contract types tập trung trong một lớp được Backend/Frontend thống nhất. Không chia subagent theo “mỗi người một trang” nếu các trang cùng phụ thuộc action state, vì sẽ tạo UI không nhất quán.

### Cổng chất lượng

| Cổng | Đầu ra cần xem | Điều kiện qua |
| --- | --- | --- |
| G-UX | sitemap, ma trận quyền, wireflow, screen inventory | Scope không bị đổi; PM/Backend hiểu từng guard và dữ liệu. |
| G-Visual | component library và 6 màn then chốt (Manager tổng quan, danh sách, tạo task, Member My Work, Open Work, task detail) + T02 | Người thử tìm đúng hành động; T02 mở từ icon, tìm lại ảnh/tệp/link; không còn menu vai trò trộn lẫn. |
| G-Prototype | prototype các luồng chính + nhánh từ chối/lỗi | Demo được tám nhiệm vụ UAT ở mục 11, gồm gửi tin/tệp/@, mở kho liên quan và đổi workspace. |
| G-Integration | UI với API/DB thật, test phân quyền và nghiệp vụ | AC01–12 và NQ01–08 có kết quả kiểm chứng; AI lỗi không chặn task. |
| G-Release | UAT, bug triage, tài liệu chạy, seed, video | Theo rubric: UAT ≥95%, không còn Sev1/2 mở; các chỉ số phải đo thật, không ghi giả. |

## 11. Kiểm thử thiết kế và dữ liệu minh họa

### Nhiệm vụ UAT quan sát được

1. Manager tìm và xử lý một request Open Work, giải thích vì sao người kia chưa là R trước khi duyệt.
2. Member nhận Direct, xác định task vẫn To Do và chờ predecessor trước khi Start.
3. Member thiếu Figma tìm được lý do không thể request; Member đủ skill gửi request và rút khi Pending.
4. R báo hai blocker, giải quyết một blocker, xác định vì sao chưa gửi Review được.
5. A duyệt hoặc trả kết quả; người thử tìm được lý do trả và trạng thái task sau đó.
6. A và Member cùng team mở T02, nhắn gần thời gian thực, gửi link/ảnh/PDF/MP4 và @ nhau; tìm lại từng mục ở `Tệp & liên kết`, tải lại vẫn đọc được; người ngoài team không thấy hoặc tải được; lời nhắn không tự đổi blocker/Review/Done.
7. Manager chỉ ra evidence của risk High, yêu cầu AI, xử lý một hành động có lý do, xem snapshot sau đánh giá lại.
8. Cùng tài khoản đổi workspace Manager→Member; kiểm tra menu, dữ liệu, URL trái quyền.

Ghi số lần bấm nhầm, thời gian tìm hành động, câu giải thích của người thử và lỗi nghiệp vụ. Không chỉ hỏi “giao diện có đẹp không”. Nên dùng dữ liệu demo Marketing đúng Scope, thêm một workspace phụ để thử đổi quyền; dữ liệu có task Direct, Open đủ/thiếu điều kiện, chờ dependency, Blocked, Review, Done, snapshot Low/Medium/High và AI lỗi. Dùng seed/test clock cho tình huống theo giờ, không giả rằng đã chờ thật.

### Tiêu chí chất lượng giao diện

- Người dùng biết workspace/quyền hiện hành và hành động tiếp theo trong 5 giây ở màn đầu.
- Các hàng task vẫn quét được khi có 100 task; filter/sort có trạng thái trống và khôi phục được.
- Không trộn Task Status với Assignment/Request Status; risk là kết quả engine, priority là quyết định Manager.
- Không lộ nội dung team khác trong list, search, direct URL, risk evidence, workload hoặc dữ liệu trả về API.
- Form lỗi nêu nguyên nhân và cách sửa; thao tác có pending/success/failure và dữ liệu sau reload khớp máy chủ.
- Bàn phím, focus, nhãn form, contrast và bố cục mobile web được kiểm tra trên các màn cốt lõi.
- Hiệu năng mục tiêu NQ07 (3 giây với dữ liệu demo đã nêu trong Scope) được đo sau tích hợp; không tuyên bố đạt từ mock.

## 12. Việc cần chốt bởi nhóm trước khi xây hoàn chỉnh

1. CWRM-9 có ban hành Scope v0.2 không; nếu có, đối chiếu thay đổi với S01–S12 và cập nhật tài liệu này trước khi code mở rộng.
2. CWRM-11 chốt ERD/OpenAPI/ADR, đặc biệt quyền theo workspace/team, request/assignment, action guard, task version và risk snapshot.
3. PM/Hiệp xác nhận ba persona từ khảo sát CWRM-8 và mức Figma cần hoàn thiện; Jira Done của CWRM-13 không thay đánh giá chất lượng trực quan/prototype.
4. Ban/Khôi chốt risk schema/rule version và cách báo snapshot cũ, lỗi AI và cảnh báo.
5. Nhóm quyết định gói nào là Jira Task hiện có/gói nào cần Change Request hoặc WP mới; kế hoạch 51 WP/246 giờ vẫn là dự thảo, nên cần đo lại công sức sau khi chốt phạm vi giao diện.

## 13. Danh sách kiểm tra bàn giao cho subagent tương lai

Mỗi nhiệm vụ nên cung cấp: (a) mục tiêu người dùng và màn/flow ID, (b) Sxx/ACxx/NQxx, (c) file nguồn và contract phiên bản, (d) vùng tệp được sở hữu, (e) trạng thái thường/lỗi/empty/forbidden, (f) tiêu chí nghiệm thu có thể chạy, (g) phụ thuộc và ai review. Đầu ra cần gồm file thay đổi, ảnh/prototype hoặc đường chạy, kiểm thử đã thực sự thực hiện, quyết định thiết kế và rủi ro còn lại. Không tự đánh dấu hoàn thành vì đã vẽ một màn tĩnh.

## 14. Đánh giá hai mẫu Figma và cách tái sử dụng

Hai nguồn người dùng đưa:

- [Figma Design: wireframe Manager và Member v0.1](https://www.figma.com/design/qXIOGnqtzXJyJB4Tv4GYFQ/CWRM-13-%7C-Wireframe-Manager-v%C3%A0-Member-v0.1?node-id=0-1)
- [FigJam: User flow](https://www.figma.com/board/AYGbljSDqFh9YbnGQ5sU8h/User-flow?node-id=0-1)

**Nguồn kiểm tra ngày 11/11:** người dùng đính chính đường dẫn và ba bản xuất nằm trực tiếp tại `Hiep`: [wireframe 8 trang](../../../Hiep/CWRM-13%20_%20Wireframe%20Manager%20v%C3%A0%20Member%20v0.1.pdf), [User flow tổng quan](../../../Hiep/User%20flow.pdf), [Direct Assignment user flow](../../../Hiep/CWRM-13%20_%20Direct%20Assignment%20user%20flow.pdf). Đã trích xuất chữ và render/xem từng trang; hai sơ đồ flow đều là một trang canvas rất rộng. Tài liệu [CWRM-13 Markdown](../../../Hiep/Nguon_du_an/CWRM_Bo_Tai_Lieu_Khoi_Dong_09-11-2026/CWRM-13_User_Flow_va_Wireframe_Manager_Member.md) là nguồn mô tả bổ trợ, không thay ảnh PDF. Hai URL online vẫn không truy cập được; bản PDF phản ánh **thời điểm xuất**, chưa xác minh liên kết prototype hay những chỉnh sửa online sau đó.

### 14.1 Quyết định theo từng trang wireframe PDF

| Trang PDF → màn đích | Quyết định | Bằng chứng quan sát và việc phải làm | Căn cứ |
| --- | --- | --- | --- |
| 1 Đăng nhập → U01 | **Vẽ lại** | Một card email/mật khẩu ở giữa canvas, không có đăng ký, Google, quên mật khẩu/xử lý lỗi, trạng thái phiên hoặc điều hướng đến workspace. Tạo hai lối vào email và Google theo mục 15; bổ sung đăng ký và các trạng thái cần thiết. Giữ tinh thần form ngắn, nhãn rõ | S01 + CR Google; AC01 |
| 2 Dashboard Manager → M01/M04/M05 | **Sửa lớn** | Có KPI và bảng risk/evidence hữu ích, nhưng KPI chiếm hàng đầu trong khi việc chờ quyết định nằm dưới. Cột `R` ghi `Designer`/`Content` là **role chuyên môn**, không phải tên người đã Accepted làm R; sửa dữ liệu mẫu và nhãn. Nút `Xem evidence` nằm cuối bảng, không gắn hàng nào. Sidebar Manager còn `Việc của tôi`, `Open Work` như Member; chuyển sang menu theo quyền và hàng “Cần tôi xử lý” cho request/Review/blocker/risk | S01, S05–S06, S10–S11; AC03–05 |
| 3 Tạo công việc → M03 | **Sửa lớn** | Bố cục hai cột dùng được, nhưng giá trị `Direct / Open Work`, `Fixed / Flexible`, `Manager của team` là chữ trong ô trông như đã chọn mà chưa có chọn thật. Link “Thêm chi tiết” chỉ liệt kê trường; không có nhánh chọn assignee/role/skill, kiểm tra dữ liệu hoặc bước xác nhận. Thiết kế form theo nhánh và guard trước khi `Tạo task` | S02–S06, S09; AC02–04 |
| 4 Việc của tôi → W01/T01 | **Sửa lớn** | Phân biệt lời mời Pending với task R Accepted và nút Review bị khóa là nền tảng tốt. Trang chỉ có một lời mời + một task, chưa có thao tác Start, nhập progress/effort/kết quả, xem chi tiết, lý do Decline, trạng thái chờ Review/Done. Chia theo hàng việc cần phản hồi và việc đang làm; đưa thao tác sâu vào Task Detail | S04, S06–S08; AC02, AC05 |
| 5 Chi tiết và phân công → T01/T02/M03 | **Vẽ lại bố cục, giữ quy tắc** | Phân biệt Task/Assignment/Request và R chưa tạo là đúng. Nhưng phần lớn trang là **đoạn chú thích nghiệp vụ chen giữa các ô dạng form**; không thấy nơi trao đổi/tài liệu. Tổ chức lại thành header trạng thái, hành động kế tiếp, mô tả/kết quả, A/R, request, blocker/dependency, evidence, nút **Trao đổi** mở T02 và **Lịch sử** riêng; vẽ thêm khung hội thoại và `Tệp & liên kết` ở desktop/mobile | S03–S10 + CR T02; AC02–08 |
| 6 Review và Dependency → M04/T01 | **Vẽ lại bố cục, giữ logic** | Quy tắc 100% + hết blocker, A duyệt/return và Done chỉ mở Start đều có. Tuy nhiên chỉ có nút `Duyệt Done`; “Trả lại + lý do” nằm trong văn bản, không thành action/dialog. `Review Pending` trong ô Task Status làm mờ ranh giới Task Status `Review` với request/assignment. `SC-01 đã Done` dùng mã màn như mã task tiền nhiệm; thay bằng task ID/tên thật và liên kết. Thêm kết quả cần nghiệm thu, hàng chờ, lý do Return và progress mới | S06–S09; AC05–08 |
| 7 Open Work → W02 | **Giữ cấu trúc card, sửa trạng thái** | Hai thẻ đủ/thiếu Skill và nút gửi bị khóa có giải thích là phần tái sử dụng tốt. Ở thẻ dưới, chú thích cạnh nút **chồng lên vùng nút disabled**. Bổ sung deadline/chỗ còn lại, filter, Pending/Withdrawn/Rejected/Approved, lý do và cập nhật sau duyệt; sửa khoảng cách và kiểm tra responsive | S02, S05; AC03 |
| 8 Chi tiết rủi ro/AI → M05/T01 | **Sửa lớn** | Hai cột evidence và AI giúp tách nguồn, ví dụ R03 Medium → High được mô tả đúng. Nhưng evidence mới là tên trường, chưa có giá trị/ID/nguồn; `evaluatedAt`/`ruleVersion` chỉ là lời nhắc. Cột AI đang **hiện sẵn ba gợi ý dù nút `Yêu cầu AI giải thích` chưa bấm**; thiết kế idle/loading/success/error/stale. `Mở form xử lý` cần chọn hành động cụ thể, lý do và guard | S10–S12; AC09–12 |

**Đánh giá thị giác:** các trang dùng cùng khung 1440×900, nền xám sáng, card trắng và header xanh đậm nên đủ làm wireframe sơ bộ. Chưa có hệ phân cấp nội dung/hành động nhất quán: các trang 5–6 nhồi quy tắc dài trong thân giao diện; trang 2 để bảng quyết định dưới KPI; trang 7 có chữ chồng nút. Đây là lý do phải thiết kế lại trải nghiệm và component states, không chỉ đổi màu hoặc thêm icon. PDF không có biến thể màn hẹp/mobile và không thể hiện trạng thái tương tác; cần tạo trong bước D06–D07.

### 14.2 Đối chiếu hai bản xuất user flow

| PDF | Giá trị giữ lại | Vấn đề thấy trên bản xuất → việc tiếp theo |
| --- | --- | --- |
| [User flow tổng quan](../../../Hiep/User%20flow.pdf) | Bốn nhánh Direct, Open, blocker/risk/AI, Review/dependency; đã nêu Declined có lý do, Withdrawn, Reject, AI lỗi và Return | Cả bốn nhánh trải ngang **một canvas 6650×2874**, khó đọc theo một đường đi; không có swimlane rõ Manager/Member/System, không gắn mã màn/API/AC và không có auth/workspace. Tách thành 6–8 flow theo mục tiêu, mỗi node ghi actor, dữ liệu và kết quả; nối điểm vào/ra giữa các flow |
| [Direct Assignment user flow](../../../Hiep/CWRM-13%20_%20Direct%20Assignment%20user%20flow.pdf) | Có một flow tổng quan phía trên và bốn sơ đồ tóm tắt phía dưới, nhấn mạnh Accepted tạo R nhưng không tự Start; Open approved tạo Accepted/R; AI chỉ cố vấn | Tên tệp nói Direct nhưng trang còn chứa Open/Risk/Review, nội dung lặp trên canvas **17746×13550**. Chuyển thành bốn tệp/frame rõ mục đích, bỏ bản lặp, vẽ nhánh guard/lỗi/quay lại đến mức người khác dùng làm test case được |

**Thiếu ở cả hai bản:** đăng ký tài khoản CWRM bằng email đang có/Google, chọn/tạo workspace và lời mời; tài khoản đổi workspace với quyền khác nhau; **T02 nhắn tin/đính kèm/@/kho tệp-link và quyền đọc/gửi/tải**; lỗi auth/403; đóng request khi đủ chỗ hoặc task bắt đầu; xử lý đồng thời; stale risk và recovery; nhiệm vụ người dùng qua nhiều màn. Đây là đầu vào bắt buộc cho Bước 4, trước khi vẽ hi-fi.

### 14.3 Kết quả audit đặc tả chữ và cách sử dụng

| Thành phần trong nguồn | Tận dụng cụ thể | Cần sửa/bổ sung trước khi vẽ hi-fi | Màn đích và căn cứ |
| --- | --- | --- | --- |
| Sequence và journey bốn chặng | Giữ xương sống Direct → Accepted → thực hiện → Review/Done, nhánh Open Work và mô hình risk/evidence/AI chỉ cố vấn | Vẽ **các flow riêng** với điểm vào, guard, kết quả và đường quay lại. Thêm Declined có lý do, Withdrawn/Rejected/hết chỗ/thiếu skill, dependency chưa xong, Review trả lại, blocker nhiều lần, AI lỗi/stale. Bổ sung auth email/Google và workspace/invite; sơ đồ tuần tự hiện chỉ là ví dụ thành công | U01–U02, M03–M05, W01–W02, T01; S01, S04–S12 |
| SC-01 Manager Dashboard | Giữ bảng việc cần can thiệp, risk level cùng evidence; số liệu có liên kết về task gốc | Chuyển hàng “cần tôi xử lý” (request, Review, blocker, risk) lên trước KPI; làm rõ scope workspace/team và thời điểm risk. **Bỏ bộ chuyển Manager/Member View tự do**; menu theo membership của workspace hiện hành | M01/M04/M05; S01, S05–S06, S10–S11 |
| SC-02 Member My Work | Giữ lời mời nhận việc, hạn, A/R, blocker và nộp Review | Tách Pending Acceptance khỏi task đã là R; Decline cần lý do; Accepted không tự Start. Slider 0–100 chỉ khả dụng khi In Progress/Blocked; báo blocker cần timeline và phân biệt với risk. Chia nhóm theo việc cần phản hồi/đang làm/bị chặn/chờ duyệt/đã xong | W01/T01; S04, S06–S08 |
| SC-03 Kanban | Giữ board như một cách xem năm Task Status và biểu đạt khóa dependency | Bổ sung list mặc định, filter/sort, giới hạn kéo thả theo quyền/guard hoặc tạm không cho kéo; Review chỉ A duyệt, Done chỉ đọc; badge Assignment/Request không tạo cột Task Status mới | M02/W03/T01; S03–S09 |
| SC-04 Create Task | Giữ chia Direct/Open và ý tưởng tiết lộ dần | Đặc tả chữ chỉ nêu bốn trường ban đầu; PDF trang 3 đã thêm team, A, số người cần nhưng chưa có lựa chọn thực hay nhánh đủ dữ liệu trước lưu. Phân rõ bước tối thiểu và điều kiện bắt buộc: Direct chọn Member cùng team; Open đặt role/skill/capacity; kiểm tra dependency và deadline. Handoff 10/11 gọi `SC-02b` là bước chi tiết, **không được đồng nhất mã SC giữa hai tài liệu** | M03/T01; S02–S06, S09 |
| SC-05 Blocker Modal | Giữ mô tả vấn đề, mức ảnh hưởng và xác nhận | Mức ảnh hưởng chỉ là dữ liệu diễn giải, không tự quyết định risk. Hiện ai được báo/giải quyết, blocker mở khác, thời điểm, ghi chú xử lý; chỉ hết **mọi** blocker mới về In Progress. Có lỗi lưu và khả năng thử lại | W01/T01; S07–S08, S10 |
| SC-06 Open Work | Giữ nhãn đủ điều kiện, lý do thiếu role/skill và số chỗ | Bổ sung Pending/Withdrawn/Rejected/Approved, rút request, lý do bị từ chối, kiểm tra lại số chỗ và điều kiện lúc Manager duyệt; Approved tạo Accepted, không yêu cầu nhận lần hai. Ghi rõ người ngoài team không nhìn thấy việc | W02/M04/T01; S02, S05–S06 |
| SC-07 AI Drawer | Giữ snapshot rule/evidence, AI giải thích và phương án cho Manager | Tách evidence của Risk Engine với lời AI; AI timeout/stale có trạng thái rõ. Nút hành động mở **luồng nghiệp vụ có kiểm tra quyền, dữ liệu và lý do**, không sửa dữ liệu từ AI. Không hứa risk hạ sau can thiệp; đánh giá lại theo rule | M05/T01; S10–S12 |
| Tokens màu/chữ/khoảng cách | Dùng làm **ứng viên** cho design system, nhãn trạng thái có cả chữ/icon | Kiểm tra contrast trên các cặp màu thực, focus/disabled/loading, mật độ bảng và responsive trước khi chốt. Không suy ra chất lượng bố cục Figma từ JSON tokens | D03/D07; NQ accessibility |

**Khoảng trống xuyên suốt:** cả Markdown và tám trang PDF chưa mô tả đủ màn đăng ký/đăng nhập Google, xác minh phiên, chọn/tạo workspace và lời mời, quản lý team/role/skill, hàng Manager duyệt request/Review, task detail hoạt động được, **T02 cùng kho tệp/link**, hồ sơ, empty/loading/error/forbidden và mobile. Bổ sung theo bản đồ U/M/W/T/P ở mục 6. Những khoảng trống này là kết luận về **bản xuất đã xem**, không khẳng định bản Figma online mới hơn chắc chắn còn thiếu.

**Quy tắc ID:** `SC-01…SC-07` ở tài liệu nguồn là **mã mục mô tả**, còn `SC-02b`, `SC-04`, `SC-06` trong handoff 10/11 là **tên frame online tại thời điểm khác**. Dùng mã U/M/W/T/P ở mục 6 làm đích chuẩn; khi có export, lập bảng `file → trang/frame/node gốc → mã đích` thay vì dựa vào số SC trùng ngẫu nhiên.

### 14.4 Việc kiểm tra tiếp trong Figma/prototype sau khi thiết kế lại

| Mục kiểm | Cách xác nhận | Quyết định sau kiểm tra |
| --- | --- | --- |
| Bao phủ | Từng frame/node khớp màn U01–P01, flow Direct/Open/Review/Risk | Giữ ý tưởng / sửa / vẽ mới; ghi frame ID |
| Quyền | Menu Manager/Member, A/R, team scope, đổi workspace | Sửa nếu gộp vai hoặc hiển thị hành động trái quyền |
| Trạng thái | Task, assignment, request, risk, alert có biểu đạt riêng | Sửa nếu Accepted bị dùng làm Task Status |
| Ngoại lệ | Decline/Reject/Withdraw, hết chỗ, thiếu skill, dependency, blocker, AI lỗi | Bổ sung nhánh và màn trạng thái thiếu |
| Dữ liệu | Trường cần cho form/detail/evidence có thể map với Scope/API | Gắn nhãn “chờ CWRM-11” nếu chưa có contract |
| Khả dụng | Hành động chính rõ, thứ tự đọc, chú thích không chồng, độ tương phản | Vẽ lại vùng khó dùng; không chỉ chỉnh trang trí |
| Prototype | Link giữa các màn, quay lại, kết quả hành động | Tạo prototype chạy được cho tám nhiệm vụ UAT ở mục 11 |
| Responsive | Màn desktop hẹp/mobile web cốt lõi | Thiết kế bổ sung nếu chỉ có canvas desktop |

Bảng ở mục 14.1 đã có quyết định theo **trang PDF**. Khi sửa Figma, thêm `page → frame/node ID online → màn U/M/W/T/P → owner → trạng thái review`, ảnh trước/sau và liên kết prototype. PDF không chứng minh link tương tác, hành vi hover/focus, quy tắc responsive hoặc thành phần đã được nhóm duyệt; kiểm tra trực tiếp các mục này sau D06–D07.

## 15. Đặc tả xác thực hai đường đăng nhập

**Làm rõ khái niệm:** “Đăng ký” là **tạo tài khoản sử dụng web CWRM**, nhập **địa chỉ email người dùng đã có** và đặt mật khẩu CWRM. CWRM không tạo địa chỉ email, hộp thư Gmail hay tài khoản Google. Người dùng yêu cầu hai đường: **(1) đăng ký tài khoản CWRM bằng email/mật khẩu, sau đó đăng nhập; (2) chọn “Tiếp tục với Google” bằng tài khoản Google đã có, CWRM tạo hồ sơ đăng nhập nội bộ ở lần đầu**. Đường Google là thay đổi so với S01 v0.1; ghi Change Request trước khi đưa vào baseline mới. Không buộc người chọn Google phải đặt mật khẩu CWRM hay đăng ký lần hai.

### 15.1 Màn và nội dung

| Màn | Thành phần | Điều hướng |
| --- | --- | --- |
| Đăng ký tài khoản CWRM | Tên hiển thị, **địa chỉ email đang dùng**, mật khẩu CWRM, xác nhận mật khẩu, điều khoản nếu thực sự áp dụng, nút “Tạo tài khoản CWRM”, nút “Tiếp tục với Google”, link “Đã có tài khoản? Đăng nhập” | Tạo tài khoản CWRM thành công → thông báo → đăng nhập theo yêu cầu; lỗi cạnh trường |
| Đăng nhập CWRM | Địa chỉ email đã đăng ký với CWRM, mật khẩu CWRM, “Đăng nhập”, phân cách “hoặc”, nút Google chính thức, link “Chưa có tài khoản? Đăng ký” | Thành công → workspace picker/trang đầu theo quyền |
| Lần đầu Google | Tên/email Google đã cung cấp; chỉ hỏi dữ liệu tối thiểu còn thiếu | Tạo tài khoản CWRM và phiên đăng nhập → workspace picker hoặc lời mời đang chờ |
| Tài khoản đã có cùng email | Thông báo có tài khoản email trước đó và hướng dẫn đăng nhập email/mật khẩu để liên kết Google trong hồ sơ | Không tự nối hai danh tính chỉ vì chuỗi email khớp |
| Không có workspace | Trạng thái chào mừng, tạo workspace hoặc nhận lời mời | Người tạo workspace trở thành Manager của workspace đó |
| Phiên hết hạn/đăng xuất | Thông báo rõ, về login, giữ `returnTo` an toàn nếu có | Không lưu token Google hoặc session trong `localStorage` |

Nếu muốn web vận hành công khai đầy đủ, bổ sung **xác minh email và đặt lại mật khẩu** vào cùng Change Request hoặc một giai đoạn phát hành được duyệt; Scope v0.1 hiện loại trừ chúng. Không trình bày “quên mật khẩu” như nút hoạt động nếu chưa có dịch vụ gửi email và quy trình bảo mật thật. Tài khoản Google có thể không có mật khẩu cục bộ; muốn thêm mật khẩu phải qua bước xác minh danh tính và thiết kế riêng.

### 15.2 Luồng chức năng

```text
Email có sẵn: người dùng nhập email + tự đặt mật khẩu tại Register
     → CWRM kiểm tra/ghi tài khoản CWRM (không tạo hộp thư email)
     → thông báo thành công → Login bằng email đó + mật khẩu CWRM
     → tạo phiên CWRM → chọn workspace

Google: Click nút Google → Google chọn tài khoản/đồng ý
      → backend kiểm chứng ID token → tìm Google `sub`
      → đã liên kết: tạo phiên CWRM
      → chưa liên kết và email chưa có: tạo tài khoản CWRM + liên kết Google + phiên
      → email đã thuộc tài khoản CWRM: yêu cầu đăng nhập tài khoản đó để liên kết
      → chọn workspace hoặc xử lý lời mời
```

Đối với Google, dùng **Google Identity Services** để render nút chính thức, không tự vẽ một nút giả rồi cố kích hoạt luồng bằng JavaScript. Google nêu luồng nút này hỗ trợ đăng ký/đăng nhập và cần tương tác người dùng. Backend phải kiểm tra ID token, gồm chữ ký, `aud`, `iss`, `exp`; dùng `sub` làm định danh Google ổn định, không dùng email làm khóa Google. Tài khoản CWRM có `userId` riêng; bảng liên kết danh tính `provider + providerSubject` có ràng buộc duy nhất. Tham khảo [Google button](https://developers.google.com/identity/gsi/web/guides/display-button), [Google server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) và [Google HTML API](https://developers.google.com/identity/gsi/web/reference/html-reference).

Phiên CWRM nên dùng cookie `HttpOnly`, `Secure`, `SameSite` phù hợp với kiến trúc triển khai, hết hạn và hủy ở máy chủ khi logout; không để session token trong `localStorage`. Mật khẩu cục bộ được băm bằng thuật toán lưu mật khẩu chậm như Argon2id, không lưu plaintext. Rate limit đăng nhập, thông báo lỗi không tiết lộ tài khoản có tồn tại hay không, chống CSRF trong luồng POST và kiểm thử đổi phiên là yêu cầu kỹ thuật cần chốt cùng Backend. Tham khảo [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) và [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet).

### 15.3 Trường hợp biên và test cần có

| Trường hợp | Kết quả mong đợi |
| --- | --- |
| Email đã gắn với tài khoản CWRM khác | Không tạo tài khoản CWRM trùng; hướng dẫn đăng nhập/khôi phục theo tính năng đã triển khai |
| Mật khẩu sai, nhiều lần thử | Lỗi chung, rate limit, không tiết lộ tài khoản |
| Google bị hủy hoặc popup bị chặn | Ở lại login; thông báo và cho thử lại/email login |
| Token Google sai/hết hạn/sai audience | Backend từ chối; không tạo phiên hoặc membership |
| Google email trùng tài khoản email chưa liên kết | Luồng liên kết sau khi chứng minh quyền sở hữu tài khoản cũ; không auto merge |
| Google lần đầu không có workspace | Tạo user và phiên, hiện tạo workspace/nhận lời mời |
| Đã có lời mời gửi tới email trước khi dùng Google | Chỉ hiện lời mời đúng tài khoản sau xác thực; không tự gia nhập workspace trước khi Accept |
| Tài khoản ở nhiều workspace với vai trò khác nhau | Đổi workspace cập nhật quyền/menu/data; URL trực tiếp trái quyền bị chặn |
| Logout, phiên hết hạn, Google còn đăng nhập | Logout CWRM phải chặn API CWRM; Google còn phiên không mặc nhiên cấp lại quyền nếu người dùng chưa thực hiện luồng đăng nhập |

**Đầu ra trước khi code auth:** sơ đồ trạng thái User/Identity/Session/Invite, UX của 6 màn/trạng thái trên, threat model ngắn, OpenAPI auth được Backend/Frontend duyệt, Google Cloud Web client và origin/redirect cho local/staging/production, test cases. Google cho biết cần cấu hình client ID và authorized origins theo môi trường trong [hướng dẫn setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). Không ghi client secret vào frontend/repo.

## 16. Quy trình sản xuất từng bước và cổng quyết định

Các bước dưới đây là thứ tự **ra quyết định và tạo bằng chứng**, không phải lịch cố định. Có thể chạy tác vụ độc lập song song sau khi đầu vào tương ứng ổn định. Mỗi cổng có một người chịu trách nhiệm chốt trong nhóm; subagent chỉ tạo đầu ra và bằng chứng, không tự phê duyệt Scope/API.

### Bước 0 — Thiết lập nguồn, mục tiêu và phạm vi

**Đầu vào:** Scope v0.1, bản chốt ý tưởng, rubric, Jira, repo, ba PDF xuất wireframe/flow đã audit ở mục 14. **Làm:** lập chỉ mục tài liệu và phiên bản; phân biệt product scope với hồ sơ quản trị môn học; ghi mâu thuẫn, hai Change Request **Google Sign-In** và **T02 trao đổi/tài liệu**, thời hạn và năng lực thực tế. **Đầu ra:** source register, decision log, danh sách câu hỏi, phạm vi v0.2 đề xuất và mục tiêu release. **Qua cổng khi:** PM/nhóm xác nhận nguồn ưu tiên, mục tiêu, ranh giới và người chốt từng quyết định. Chưa phải lúc thiết kế hi-fi.

### Bước 1 — Khám phá người dùng và quy trình hiện tại

**Đầu vào:** CWRM-8, ba persona giả thuyết, mẫu khảo sát/phỏng vấn. **Làm:** phỏng vấn ít nhất một người có bối cảnh điều phối và người nhận việc; ghi công việc đang làm, nơi bàn giao, lý do trễ, cách xử lý blocker/risk; quan sát cách họ hiểu Direct/Open; phân biệt dữ liệu thu được với suy đoán. **Đầu ra:** persona có bằng chứng, journey hiện tại, pain points được xếp hạng, nhiệm vụ UAT. **Qua cổng khi:** PM và UX xác nhận người thử thực, các giả thuyết còn chưa kiểm chứng được đánh dấu; không tự lấy screenshot của sản phẩm khác làm nhu cầu người dùng.

### Bước 2 — Đặc tả sản phẩm kiểm thử được

**Đầu vào:** kết quả Bước 1 và Scope. **Làm:** viết PRD gồm mục tiêu, S01–S12, auth mở rộng, **T02/CR hội thoại và kho tài liệu task**, quy tắc, phạm vi, ngoài phạm vi, vai trò, stories/BDD, AC, NQ, dữ liệu demo; lập ma trận requirement → màn → API → test. Chốt người dùng có cần nhắn sau Done, giới hạn tệp/quota, lưu/xóa, @/thông báo và độ trễ tin. **Đầu ra:** PRD/Scope v0.2 đề xuất, backlog có ưu tiên và phụ thuộc. **Qua cổng khi:** mọi chức năng có điều kiện chấp nhận cụ thể, các thay đổi so với Scope gốc có CR/Decision Log; PM quyết định baseline trước khi hứa tính năng.

### Bước 3 — Mô hình miền, quyền, dữ liệu và khả thi kỹ thuật

**Đầu vào:** PRD/Scope đã chốt. **Làm:** sơ đồ thực thể User/Identity/Workspace/Team/Task/Assignment/Request/**TaskMessage/Attachment/Link/Mention/ReadCursor**/Risk/Alert/Audit; state machine task và assignment/request tách nhau; ma trận quyền `actor × workspace × team × A/R × state`; contract đọc/gửi/upload/download/search/realtime, lỗi, phân trang, idempotency, Done chỉ đọc; đánh giá chi phí private storage, xử lý video, quét tệp, backup, Google/AI và concurrency. **Đầu ra:** ERD, OpenAPI/contract phiên bản, ADR về storage/delivery, sơ đồ sự kiện/guard. **Qua cổng khi:** Backend, Frontend, Risk/AI và QA review cùng ví dụ request/response, không còn chỗ UI phải đoán state hoặc quyền. Có thể làm phác thảo flow UX song song, nhưng hi-fi chỉ dùng contract đã rõ.

### Bước 4 — Kiến trúc thông tin và user flow

**Đầu vào:** persona, PRD, ma trận quyền và dữ liệu. **Làm:** sitemap từng vai trò, luồng đăng ký/email login/Google login, đổi workspace, Direct, Open, progress/blocker/dependency, **T02 nhắn/upload/@/tìm lại file-link**, Review, Risk/AI; vẽ success, decline/reject, lỗi upload/mạng, empty, forbidden và quay lại; gắn ID màn U/M/W/T/P. **Đầu ra:** FigJam user flow và bảng `bước → người → dữ liệu → quyền → màn → API → AC`. **Qua cổng khi:** người khác có thể đi hết luồng chỉ từ sơ đồ, không cần tác giả giải thích; PM/Backend/QA cùng kiểm tra.

### Bước 5 — Wireframe thấp và kiểm tra nhiệm vụ

**Đầu vào:** flow đã review, quyết định theo tám trang PDF ở mục 14. **Làm:** giữ cấu trúc có ích, sửa/vẽ lại các màn theo bảng audit; vẽ skeleton content và hierarchy cho mọi màn, gồm **T02 desktop/mobile, composer, file card, media cabinet và trạng thái upload**; nối prototype thấp; cho persona thử tìm hành động mà không hướng dẫn. **Đầu ra:** bộ wireframe có chú thích và báo cáo kiểm tra, danh sách sửa. **Qua cổng khi:** người thử mở được chat từ task, gửi/tìm lại đúng tệp và phân biệt lời nhắn với action nghiệp vụ; các luồng khác vẫn đi được; từng trang cũ có đối chiếu frame mới và ảnh trước/sau.

### Bước 6 — Thiết kế hi-fi và design system

**Đầu vào:** wireframe đã sửa, nội dung tiếng Việt và contract. **Làm:** chốt màu/chữ/lưới/icon, component variants, desktop/hẹp/mobile web, states loading/empty/error, prototype tương tác; review contrast, focus, nhãn và nội dung. **Đầu ra:** Figma hi-fi có library, prototype tám nhiệm vụ UAT ở mục 11, bảng token và quy tắc responsive. **Qua cổng khi:** PM/UX/Frontend có thể chỉ ra từng component, trạng thái, breakpoint và hành động; không còn “màn đẹp” thiếu luồng.

### Bước 7 — Lập kế hoạch kỹ thuật và môi trường

**Đầu vào:** design và contract đã duyệt. **Làm:** phân lát cắt end-to-end, WBS/ước lượng theo năng lực thật, phụ thuộc, chiến lược branch/PR, seed/test clock, CI, môi trường local/staging, bí mật Google/AI, **storage/virus scan/preview/delivery, quota và băng thông**, migration, backup/rollback; tính lại tác động của Google Sign-In và T02. **Đầu ra:** execution plan mới, Jira issues có DoR/DoD, repo cấu hình mẫu, test plan và dự toán lưu trữ/vận hành. **Qua cổng khi:** từng lát có owner/reviewer, dữ liệu, API, UI, test và đường demo; tổng effort có buffer thực tế. Master Plan 246 giờ là bản dự thảo, không chứng minh đủ công suất cho phạm vi mới.

### Bước 8 — Xây từng lát dọc chạy thật

**Thứ tự lát:** (A) auth email/Google + workspace/team/role → (B) task/milestone + quyền → (C) Direct end-to-end → (D) Open Work end-to-end → (E) progress/blocker/dependency/Review → (F) risk/evidence/alert → (G) AI và action Manager. **Lát T02** sau B: tin/link → upload/tài liệu/ảnh/video + cabinet → @/unread/delivery; tích hợp với T01 và quyền task, có thể chạy song song C–G sau contract. Mỗi lát gồm DB/migration, API guard, UI, error states, test và seed. **Qua cổng từng lát khi:** một người khác chạy được từ README, dữ liệu lưu và còn sau reload, route/tệp trái quyền bị từ chối, AC tương ứng có evidence. UI mock không thay tích hợp thật.

### Bước 9 — Tích hợp và kiểm tra hệ thống

**Làm:** E2E các luồng chính ở mục 11, test ma trận quyền qua URL/API/**download URL**, T02 theo mục 7.1 (tin/link/ảnh/doc/video/@/cabinet, Done, quota, malware/loại sai, XSS, lỗi mạng/reconnect/gửi lặp, backup restore), duyệt đồng thời không vượt slot, optimistic locking, dependency không vòng, risk rule/evidence, AI timeout, Google token sai, account linking, keyboard/responsive; kiểm tra performance theo NQ07 với dữ liệu 100 task và cấu hình ghi lại. **Đầu ra:** test report, defect log Sev1–4, bản sửa và regression. **Qua cổng khi:** không còn lỗi sai phân quyền, lộ tệp, mất dữ liệu, vượt slot, sai risk hoặc chặn luồng chính. Không tuyên bố NQ đạt nếu chưa đo.

### Bước 10 — UAT, phát hành và vận hành

**Làm:** người dùng đại diện thực hiện nhiệm vụ ở mục 11 trên staging, ghi kết quả/pass rate; chốt release decision; chuẩn bị seed, hướng dẫn sử dụng, runbook, backup/rollback, demo video 3–5 phút và hồ sơ môn học riêng. **Qua cổng khi:** tiêu chí đã thống nhất với nhóm và rubric đạt, 0 Sev1/2 còn mở, cài lại được từ hướng dẫn, demo dùng API/DB/AI thật. Sau phát hành, ghi phản hồi, sự cố và Change Request cho phiên tiếp theo, không sửa phạm vi lén trong bản đã nghiệm thu.

### Chuyển bước có điều kiện

Nếu Scope/API chưa chốt, subagent vẫn có thể **nghiên cứu, phác thảo flow, audit Figma, dựng design tokens thử nghiệm hoặc test plan**. Không được merge logic quyền, dữ liệu hay action giả định như hợp đồng đã duyệt. Khi một gate không đạt, quay về bước tạo đầu ra thiếu và ghi quyết định; không xử lý bằng cách thêm badge/chú thích trên màn để che mâu thuẫn nghiệp vụ.

## 17. Ma trận đầy đủ chức năng của web

Bảng này là checklist **toàn bộ phạm vi chức năng v0.1** cộng hai đề xuất của người dùng: Google Sign-In và T02 trao đổi/tài liệu. Hàng `CR-T02` là **ngoài baseline v0.1** đến khi nhóm chốt Scope mới. Mỗi hàng cần có thiết kế, API, test và trạng thái lỗi. “Đủ màn” không đồng nghĩa “đủ chức năng” nếu một hành động không lưu vào DB hoặc quyền chỉ được kiểm tra ở frontend.

| Nhóm | Người dùng nhìn thấy và làm được | Quy tắc/đối tượng Backend cần có | Bằng chứng nghiệm thu |
| --- | --- | --- | --- |
| S01 Tài khoản | **Đăng ký tài khoản CWRM bằng email có sẵn và mật khẩu tự đặt**; login/logout; Google; chọn/tạo workspace; lời mời trong ứng dụng Accept/Decline; hồ sơ | User, Identity, Session, WorkspaceMembership, Invitation; email duy nhất; không hạ Manager cuối; bảo vệ phiên; không tạo địa chỉ email | Tài khoản CWRM mới, đăng nhập lại, Google lần đầu/trở lại/trùng email; invite đúng người, truy cập trái quyền bị chặn |
| S02 Team/role/skill | Manager tạo/sửa team, thêm/gỡ người, quản lý nhãn role/skill; Member xem nhãn mình | TeamMembership, role/skill danh mục workspace; điều kiện không làm mất A/R; chuyên môn không cấp quyền Manager | Gán nhãn, lọc eligibility; thử Member tự sửa skill bị từ chối |
| S03 Task/milestone | Tạo/sửa/xem task, milestone; deadline fixed/flexible, priority, estimate, số người cần, một A, mode Direct/Open | Task thuộc một team; tạo To Do/progress 0; Done chỉ đọc; fixed deadline sửa có lý do | Manager tạo và sửa, Member xem đúng team; đổi deadline fixed có audit; lỗi thiếu A/hạn |
| S04 Direct | Manager gửi/đóng đề nghị, thêm hoặc kết thúc assignment có lý do; người được mời Accept/Decline | Pending/Accepted/Declined; không vượt số người cần; Accepted tạo R, không tự Start; không gỡ R cuối sai trạng thái | Hai nhánh phản hồi, reason và audit, task vẫn To Do sau Accept |
| S05 Open Work | Manager mở/đóng việc; Member lọc, request/withdraw; Manager approve/reject có lý do | Team/role/skill eligibility; request pending chưa có R; kiểm tra lại ở lúc duyệt; concurrency/slot | Đủ/thiếu skill, hết chỗ, Withdraw, Reject, Approve tạo R, hai lượt duyệt đồng thời không vượt slot |
| S06 RACI/Review | Task detail hiện A/R/C/I; A duyệt hoặc trả Review; Manager chuyển A hợp lệ | Một A; R sinh từ Accepted; C/I là người trong team; chỉ A hiện hành duyệt; reason khi trả/chuyển | Kiểm tra không tự thêm R, không nhiều A, Return có lý do và progress mới |
| S07 Status/progress/effort | R Start, cập nhật progress/effort/kết quả, gửi Review; hiển thị lịch sử | Chuyển To Do→In Progress→Blocked/Review→Done/Return; progress 100 chưa Done; optimistic locking | Chuyển trạng thái hợp lệ/sai quyền, cập nhật đồng thời không ghi đè, reload giữ số liệu |
| S08 Blocker/trao đổi baseline | R báo blocker; R/Manager giải quyết có ghi chú; Member cùng team bình luận văn bản trên task | Nhiều blocker, Open/Resolved, task Blocked khi còn Open; bình luận văn bản lưu theo task, đọc/gửi theo quyền workspace/team; Done chỉ đọc | Hai người bình luận và tải lại còn tin; người ngoài team bị chặn ở UI/API; lời bình luận không tự đổi blocker/status |
| **CR-T02 Trao đổi/tài liệu task** | Icon `Trao đổi` trên task → T02; nhắn tin, URL, ảnh/tài liệu/video, @mention; thấy tin mới; tìm/xem/tải trong `Tệp & liên kết` theo loại và quay về tin gốc | TaskMessage/Attachment/Link/Mention/ReadCursor; private storage, upload state/quét/quota, phân quyền mọi đường tải, event ordering/reconnect, backup DB + file; chốt chính sách giữ/xóa | Hai trình duyệt thấy tin mới; gửi và tra lại link/ảnh/PDF/MP4; @ chỉ người có quyền; mất quyền team không tải được file cũ; lỗi/loại sai/quota/mạng không gây lộ hoặc mất dữ liệu |
| S09 Dependency | Manager thêm/gỡ quan hệ cùng team khi task sau còn To Do; R thấy lý do chờ Start | Finish-to-Start, không vòng, không tự phụ thuộc, mọi predecessor Done mới Start | Tạo cycle bị chặn; predecessor Review chưa đủ; Done mở quyền Start nhưng không tự Start |
| S10 Risk/evidence | Badge và giải thích Low/Medium/High ở task; Manager xem chi tiết/rule/time/version | Snapshot từ rule, evidence ID/source/field/value, stale/error, đánh giá lại dữ liệu liên quan | Rule boundary cases, evidence đối chiếu được; Member không thấy tên task ngoài quyền qua workload |
| S11 Dashboard/alert/history | Manager lọc status/risk/team/A/R/hạn; A/R nhận alert risk; task có activity | Alert open/updated/resolved/recurred, không tạo trùng; audit người/thời gian/trước/sau/lý do | Tăng/giảm/tái phát risk đúng; đã đọc khác resolved; dashboard drill-down |
| S12 AI/action | Manager yêu cầu AI, xem giải thích gắn evidence, 2–3 phương án; chọn thao tác thật | AI server-side, cache theo snapshot, timeout/fallback, stale guard; action có quyền/reason/audit/risk re-evaluate | Gọi AI thật thành công và lỗi; AI không đổi task; action trước/sau và evidence mới |

**Nguyên tắc mức hoàn thiện:** mỗi tính năng phải có đường vào, thao tác thành công, lỗi, dữ liệu rỗng, quyền trái phép, trạng thái sau reload, kiểm thử và tài liệu hướng dẫn. Một màn tĩnh hoặc nút disabled không đạt. Với hành động có hai vai trò, kiểm tra cả bên khởi tạo và bên nhận kết quả. Với hành động đổi trạng thái, kiểm tra lịch sử/audit và tác động tới risk/alert/dependency.

## 18. Backlog thiết kế và triển khai theo phụ thuộc

Mã D/F/Q dưới đây là **mã công việc đề xuất trong kế hoạch này**, không phải Jira key. Chỉ tạo Jira issue sau khi PM xác nhận phạm vi và tránh trùng WP hiện có. Mỗi đầu ra cần gắn Sxx/ACxx/NQxx, owner, reviewer, ước lượng thật và bằng chứng.

| Mã | Công việc | Phụ thuộc | Đầu ra có thể kiểm tra |
| --- | --- | --- | --- |
| D01 | Hoàn tất audit PDF đã bắt đầu ở mục 14; đối chiếu frame ID online và lập bảng quyết định chính thức | Ba PDF, Scope, Figma khi truy cập được | Source register, page/frame map, ảnh đánh dấu, CR Google và CR-T02 |
| D02 | Khảo sát, persona và journey | D01, CWRM-8 | Biên bản người thử, ba persona có bằng chứng |
| D03 | PRD/Scope v0.2, stories, AC/NQ và traceability | D01–D02 | Ma trận Sxx/CR-T02→story→màn→API→test; giới hạn/quota/giữ dữ liệu và CR đã quyết |
| D04 | Domain/state/permission model, ERD/OpenAPI/ADR | D03, CWRM-11 | Contract và ví dụ lỗi/response; storage/realtime/backup/chi phí được review |
| D05 | Sitemap và flow auth/workspace/Direct/Open/**T02 nhắn-upload-@-tìm lại**/Review/Risk | D03–D04 | FigJam có nhánh lỗi, guard và quyền file/link |
| D06 | Wireframe tất cả U/M/W/T/P, gồm T02 và `Tệp & liên kết`; thử nghiệm thấp | D05, Figma audit | Prototype desktop/mobile và báo cáo sửa theo người thử |
| D07 | Design tokens và component library | D06 | Variants, states, composer/upload/media cabinet, responsive, accessibility checklist |
| D08 | Hi-fi prototype mọi màn/trạng thái chính | D07 | Prototype tám nhiệm vụ UAT ở mục 11 và handoff chú thích |
| F01 | Auth email, Google, session, invite, workspace role | D04, D08 | API/UI/DB/test; Google first-time + collision + logout |
| F02 | Team, role/skill, profile, milestone, task CRUD | F01, D08 | Manager tạo; Member xem đúng team; audit deadline |
| F03 | Direct và RACI | F02 | Accept/Decline→R, slot guard, task vẫn To Do |
| F04 | Open Work và duyệt request | F02–F03 hoặc shared assignment contract | Eligibility, Withdraw/Approve/Reject, concurrency test |
| F05 | Progress, blocker, bình luận văn bản S08, dependency, Review | F03–F04 | Một vòng task To Do→Done/Return; bình luận baseline lưu DB và đúng quyền |
| F06 | Risk engine/evidence/alert/dashboard | F02–F05, risk contract | Rule tests, snapshot, alert lifecycle, drill-down |
| F07 | AI thật và hành động Manager | F06 | Fallback, stale guard, action/audit, risk đánh giá lại |
| F08 | CR-T02: chat task, tệp/ảnh/video/link, @, unread, media cabinet và cập nhật tin | D03–D08, F01–F02, task shell F05 | Ba lát mục 7.1 chạy thật; test quyền tải/quota/scan/reconnect/backup; file tìm lại từ tin gốc |
| Q01 | Security, permissions, E2E, visual/responsive, performance | F01–F08 theo từng lát | Test report, defect log, NQ + AC-T02 evidence |
| Q02 | UAT, sửa lỗi, staging/release, runbook/demo | Q01 | AC01–14 + AC-T02 nếu CR được duyệt, người dùng thật, release decision và hướng dẫn chạy lại |

**Ước lượng:** không chép con số 246 giờ/5 tuần cũ cho backlog mở rộng. Sau D03–D04, mỗi owner ước lượng giờ cho từng Fxx/Qxx; riêng F08 phải tính **storage, băng thông, xử lý/quét/preview video, realtime, backup, kiểm thử quyền file và chi phí vận hành**; cộng review/tích hợp/UAT và buffer. Nếu vượt công suất, PM chọn đổi hạn, thêm năng lực hoặc ra CR giảm phạm vi được chấp thuận. Không lặng lẽ bỏ Google, CR-T02, security hoặc Sxx để giữ lịch.
