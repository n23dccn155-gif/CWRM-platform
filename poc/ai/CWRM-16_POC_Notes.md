# CWRM-16 — Gọi AI API giải thích risk (POC)

**Trạng thái 12/11/2026:** đã cập nhật POC theo review CWRM-11 (OpenAPI 0.1.0-draft). Kiểm thử cục bộ bằng phản hồi giả lập. Lần gọi API thật chờ khóa và model được cấp quyền cho project. OpenAI Responses API là provider thử nghiệm.

## Chạy thử có kiểm soát

Trên máy có Node.js 20 trở lên, đặt `OPENAI_API_KEY` và `OPENAI_MODEL` trong biến môi trường phía server. Chọn model được project cấp quyền và có Structured Outputs. Chạy từ thư mục `poc/ai` với đường dẫn tới fixture tổng hợp ở checkout CWRM-15:

```text
node CWRM-16_ai-poc.mjs <path-to-CWRM-15_marketing-example.json>
node --test CWRM-16_ai-poc.test.mjs
```

CLI dùng fixture từ CWRM-15 để tránh lệch schema. CLI gắn ID snapshot minh họa cục bộ và thêm ngữ cảnh poster tổng hợp. Input cho provider chỉ gồm thông tin có cấu trúc về task, dependency, milestone, workload và risk/evidence. Caller phải lọc dữ liệu thật trước khi dùng adapter. Payload của fixture không có ID task, ID snapshot hay thông tin định danh người dùng.

Khi chạy thật, lưu JSON stdout đã rà soát vào thư mục cá nhân, kèm thời điểm, model/provider, latency, usage, HTTP status, request ID và kết quả AI. Bản ghi thành công phải có `ok: true`, summary, evidence IDs hợp lệ và 2–3 phương án. Lệnh chỉ gọi một lần, giới hạn tối đa 1.000 output tokens và timeout mặc định 20 giây. Nếu model trả kết quả incomplete vì giới hạn output, đánh giá lại giới hạn trước lần chạy mới.

## Giới hạn, quota và chi phí

- Chi phí theo model và token của lần gọi. Dùng `usage.input_tokens`, phần cached nếu có và `usage.output_tokens` với đơn giá tương ứng trên bảng giá để ước tính. Giá trị actual và quota project để trống đến khi có quyền kiểm tra project và kết quả thật. [Giá API](https://developers.openai.com/api/docs/pricing) · [Rate limits](https://developers.openai.com/api/docs/guides/rate-limits).
- POC trả `AI_TIMEOUT`, `AI_QUOTA_EXCEEDED`, `AI_PROVIDER_ERROR` hoặc `AI_OUTPUT_INVALID` với `retryable` và fallback từ evidence. 429 giới hạn tốc độ có thể thử lại theo thời gian provider chỉ dẫn. Quota hoặc ngân sách đã cạn cần xử lý phía project trước. [Mã lỗi OpenAI](https://developers.openai.com/api/docs/guides/error-codes).
- Adapter trả mã lỗi, trạng thái HTTP của provider và snapshot ID để backend ánh xạ 502/503 theo CWRM-11. Backend sẽ kiểm tra quyền Manager và snapshot còn hiện hành, lưu recommendation và giữ GET risk hoạt động khi AI lỗi.
- Structured Outputs hỗ trợ định dạng JSON. POC vẫn xác thực số phương án, evidence IDs và phản hồi từ chối/không hoàn tất. [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create) · [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

## Giới hạn và việc còn thiếu

- Cần một lần gọi thật từ môi trường được cấp cấu hình để hoàn tất AC của CWRM-16.
- Cần đối chiếu lại port và payload với Khôi trước khi ghép vào backend. POC chỉ tạo giải thích và phương án. Manager chịu trách nhiệm quyết định và thao tác.
