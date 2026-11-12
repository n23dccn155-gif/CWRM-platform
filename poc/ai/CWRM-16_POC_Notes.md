# CWRM-16 — Gọi AI API giải thích risk (POC)

**Trạng thái 12/11/2026:** chuyển POC sang Gemini Developer API với model mặc định `gemini-3.1-flash-lite` sau khi lần thử OpenAI nhận HTTP 429. Hợp đồng đầu ra theo CWRM-11 giữ nguyên. Đã kiểm thử cục bộ với phản hồi Gemini giả lập. Lần gọi Gemini thật chờ API key của project có quota.

## Chạy thử có kiểm soát

Trên máy có Node.js 20 trở lên, lấy khóa Gemini từ [Google AI Studio](https://aistudio.google.com/apikey) và nhập vào `GEMINI_API_KEY` trong môi trường phía server. CLI mặc định dùng `gemini-3.1-flash-lite`. Có thể đặt `GEMINI_MODEL` để chọn model khác có Structured Outputs mà project cho phép. Chạy từ thư mục `poc/ai` với đường dẫn tới fixture tổng hợp ở checkout CWRM-15:

```text
node CWRM-16_ai-poc.mjs <path-to-CWRM-15_marketing-example.json>
node --test CWRM-16_ai-poc.test.mjs
```

CLI dùng fixture từ CWRM-15 để tránh lệch schema. CLI gắn ID snapshot minh họa cục bộ và thêm ngữ cảnh poster tổng hợp. Input cho provider chỉ gồm thông tin có cấu trúc về task, dependency, milestone, workload và risk/evidence. Caller phải lọc dữ liệu thật trước khi dùng adapter. Payload của fixture không có ID task, ID snapshot hay thông tin định danh người dùng.

Khi chạy thật, lưu JSON stdout đã rà soát vào thư mục cá nhân, kèm thời điểm, model/provider, latency, usage, HTTP status, response ID nếu có và kết quả AI. Bản ghi thành công phải có `ok: true`, summary, evidence IDs hợp lệ và 2–3 phương án. Lệnh chỉ gọi một lần, giới hạn tối đa 1.000 output tokens và timeout mặc định 20 giây. Nếu Gemini trả `MAX_TOKENS`, đánh giá lại giới hạn trước lần chạy mới.

### PowerShell trên máy Ban

Chạy khối này từ thư mục gốc của bản clone `CWRM-platform` đang mở nhánh CWRM-15, có worktree CWRM-16 trong `personal/worktrees/CWRM-16`. Khóa được nhập ẩn và gỡ khỏi môi trường sau lần chạy.

```powershell
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $utf8
$key = Read-Host 'Dán Gemini API key rồi nhấn Enter' -AsSecureString
$env:GEMINI_MODEL = 'gemini-3.1-flash-lite'
$log = ".\personal\CWRM-16-gemini-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
try {
    $env:GEMINI_API_KEY = [pscredential]::new('gemini', $key).GetNetworkCredential().Password
    $result = node '.\personal\worktrees\CWRM-16\poc\ai\CWRM-16_ai-poc.mjs' `
        '.\docs\risk\CWRM-15_marketing-example.json' | Out-String
    if (-not [string]::IsNullOrWhiteSpace($result)) {
        [System.IO.File]::WriteAllText((Join-Path (Get-Location).Path $log), $result, $utf8)
        Write-Host $result
        Write-Host "File kết quả: $log"
    }
} finally {
    Remove-Item Env:GEMINI_API_KEY, Env:GEMINI_MODEL -ErrorAction SilentlyContinue
    $key.Dispose()
}
```

## Giới hạn, quota và chi phí

- Google công bố Free Tier cho text input/output của Gemini 3.1 Flash-Lite. Quyền sử dụng và quota thực tế phụ thuộc project. Kiểm tra trong AI Studio trước khi chạy. Dùng `usage.input_tokens`, `usage.cached_input_tokens` và `usage.output_tokens` (gồm thinking token nếu có) để ghi bằng chứng và ước tính chi phí theo tier của lần gọi. [Giá Gemini API](https://ai.google.dev/gemini-api/docs/pricing) · [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
- POC trả `AI_TIMEOUT`, `AI_QUOTA_EXCEEDED`, `AI_PROVIDER_ERROR` hoặc `AI_OUTPUT_INVALID` với `retryable` và fallback từ evidence. HTTP 429 có thể mang thời gian đợi. Nếu không có thời gian thử lại trong kết quả, kiểm tra quota của project trước. [Khắc phục lỗi Gemini API](https://ai.google.dev/gemini-api/docs/troubleshooting).
- Adapter trả mã lỗi, trạng thái HTTP của provider và snapshot ID để backend ánh xạ 502/503 theo CWRM-11. Backend sẽ kiểm tra quyền Manager và snapshot còn hiện hành, lưu recommendation và giữ GET risk hoạt động khi AI lỗi.
- Gemini `generateContent` nhận khóa trong header `x-goog-api-key` và schema JSON trong `generationConfig`. POC xác thực lại số phương án, evidence IDs và trạng thái kết thúc của phản hồi. [GenerateContent API](https://ai.google.dev/api/generate-content) · [Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output).

## Giới hạn và việc còn thiếu

- Cần một lần gọi thật từ môi trường được cấp cấu hình để hoàn tất AC của CWRM-16.
- Cần đối chiếu lại port và payload với Khôi trước khi ghép vào backend. POC chỉ tạo giải thích và phương án. Manager chịu trách nhiệm quyết định và thao tác.
