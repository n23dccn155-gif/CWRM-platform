# CWRM frontend

Next.js UI skeleton cho CWRM-14. Các màn hiện có: `/login`, `/manager`, `/tasks`, `/tasks/new`, `/tasks/[id]`, `/my-work`, `/open-work`, `/risk`. Màn task detail minh họa Direct/Open, trạng thái request/assignment, blocker, dependency và Review/Done guard; các nút nghiệp vụ chưa ghi dữ liệu vì chưa có backend. [Flow và wireframe local](../docs/ux/CWRM-13-user-flow-wireframes.md) ghi các màn cần đồng bộ vào Figma.

```powershell
npm ci
npm run dev
```

Mở http://localhost:3000 (chuyển đến `/manager`). Dùng `npm run lint` và `npm run build` để kiểm tra. Scripts dùng Webpack vì môi trường Windows hiện tại chặn SWC native của Turbopack.

`src/lib/demo-data.ts` là dữ liệu minh họa theo Scope v0.1. Riêng `RiskSnapshot` và màn `/risk` bám bản schema ứng viên CWRM-15 của Ban: level `Low/Medium/High`, `baseLevel`, `ruleVersion`, `evaluatedAt`, `triggeredRules`, `inputFingerprint` và từng evidence có ID/nguồn/trường/giá trị. Đây **chưa phải API contract được duyệt**; fingerprint trong mock không phải hash thực. Mọi nút cần backend đều bị khóa hoặc ghi rõ chưa lưu dữ liệu. Khi Khôi hoàn tất CWRM-11, đối chiếu ERD/OpenAPI/ADR trước khi thay mock bằng API thật.
