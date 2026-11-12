# CWRM frontend

Next.js UI skeleton cho CWRM-14. Các màn hiện có: `/login`, `/manager`, `/tasks`, `/tasks/new`, `/tasks/[id]`, `/my-work`, `/open-work`, `/review`, `/risk`. Màn task detail minh họa Direct/Open, trạng thái request/assignment, blocker, dependency và Review/Done guard; các nút nghiệp vụ chưa ghi dữ liệu vì chưa có API nghiệp vụ. [Đối chiếu CWRM-14](../docs/ux/CWRM-14_Acceptance_Criteria_Verification.md) ghi rõ phần đã kiểm tra và bằng chứng còn thiếu.

```powershell
npm ci
npm run dev
```

Mở http://localhost:3000 (chuyển đến `/manager`). Dùng `npm run lint` và `npm run build` để kiểm tra. Scripts dùng Webpack vì môi trường Windows hiện tại chặn SWC native của Turbopack.

`src/lib/demo-data.ts` là dữ liệu minh họa theo Scope v0.1. `src/lib/api/client.ts` là đầu mối đọc task/risk; khi chưa đặt `NEXT_PUBLIC_API_BASE_URL` ứng dụng dùng dữ liệu mẫu. Nếu bật biến này, phải dùng URL gồm tiền tố `/api/v1` và cần phiên/token thật cho endpoint bảo vệ; backend CWRM-12 hiện chưa có API nghiệp vụ. `RiskSnapshot` mẫu bám fixture CWRM-15 của Ban, còn `TaskSummary` là view model đã làm phẳng, **chưa phải Task schema đầy đủ** trong OpenAPI CWRM-11 `0.2.0-draft`. Mọi nút cần backend đều bị khóa hoặc ghi rõ chưa lưu dữ liệu. Không đưa token vào biến `NEXT_PUBLIC`.
