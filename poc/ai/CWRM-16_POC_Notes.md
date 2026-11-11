# CWRM-16 — Gọi AI API giải thích risk (POC)

**Trạng thái:** mã POC đã chuẩn bị và kiểm tra cục bộ, chưa có request thật tới AI API (10/11/2026). OpenAI Responses API là lựa chọn thử nghiệm, chưa phải ADR/stack đã duyệt.

## Chạy thử có kiểm soát

Trên máy có Node.js hiện đại, vào thư mục `poc/ai`, đặt `OPENAI_API_KEY` và `OPENAI_MODEL` trong **biến môi trường phía server**; không ghi khóa vào file, lệnh commit, ảnh hoặc Jira. Chạy `node CWRM-16_ai-poc.mjs`. Input là fixture Marketing tổng hợp `CWRM-15_marketing-example.json`. Nếu thiếu cấu hình hoặc API lỗi, chương trình trả `ok: false` và vẫn giữ risk/evidence; không ghi hoặc sửa task. Chạy `node --test CWRM-16_ai-poc.test.mjs` để kiểm tra fallback, parse và evidence linkage cục bộ.

Khi có khóa hợp lệ, lưu bằng chứng đã **ẩn khóa**: thời điểm, model/provider, latency, usage, HTTP status, kết quả AI và ảnh/video hoặc log. Không coi test với stub là request API thật. Cần xác nhận `OPENAI_MODEL` được tài khoản cho phép và quota trước khi chạy. Xem [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) và [bảng giá chính thức](https://developers.openai.com/api/docs/pricing); giá phụ thuộc model và số token thực, nên chưa ghi chi phí giả định thành actual.

## Giới hạn và việc còn thiếu

- Chưa có API key/model trong môi trường hiện tại, nên chưa đáp ứng AC “demo request thật/response không hardcode”.
- Chưa tích hợp vào backend của Khôi vì repo/API contract CWRM-11/CWRM-12 chưa có trong thư mục này. Cần chốt cách lưu AI recommendation và kiểm tra snapshot fingerprint khi task đổi.
- Đầu ra POC không có quyền thao tác Manager. `store:false` hạn chế lưu response phía API, nhưng nhóm vẫn cần rà soát chính sách dữ liệu và log của hệ thống mình.
- Với AI trả lời từ chối, output thiếu hoặc tham chiếu evidence không có, POC trả fallback rõ ràng và giữ risk/evidence. Không coi AI là nguồn xác định risk level.
