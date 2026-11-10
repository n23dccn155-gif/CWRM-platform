"""Render four CWRM-13 user flows as standalone SVGs for FigJam import."""

from html import escape
from pathlib import Path
import textwrap

OUT = Path(__file__).resolve().parent

FLOWS = [
    {
        "file": "01-direct-assignment.svg",
        "title": "01 · Direct Assignment",
        "subtitle": "Manager giao trực tiếp · Member có quyền nhận hoặc từ chối",
        "steps": [
            ("Manager", "Tạo task To Do; chỉ định đúng một A", "action"),
            ("Manager", "Gửi đề nghị Direct cho Member trong team", "action"),
            ("Hệ thống", "Pending Acceptance; chưa có R", "state"),
            ("Member", "Chấp nhận lời mời?", "decision"),
            ("Hệ thống", "Assignment Accepted; sinh trách nhiệm R", "state"),
            ("Member", "Start khi dependency đã Done", "action"),
        ],
        "branches": {3: ("Không", "Declined; Manager chọn người khác để giao lại")},
        "yes": {3: "Có"},
        "footer": "Accepted không tự đổi Task Status sang In Progress. Member phải chủ động Start.",
    },
    {
        "file": "02-open-work.svg",
        "title": "02 · Open Work",
        "subtitle": "Ứng tuyển theo Role/Skill · Manager duyệt khi còn chỗ",
        "steps": [
            ("Manager", "Tạo Open Work: A, Role/Skill và số chỗ", "action"),
            ("Member", "Xem việc mở trong team", "action"),
            ("Hệ thống", "Đủ điều kiện Role/Skill?", "decision"),
            ("Member", "Gửi request Pending; chưa có R", "state"),
            ("Manager", "Duyệt request khi còn chỗ?", "decision"),
            ("Hệ thống", "Approved → Assignment Accepted; sinh R", "state"),
            ("Member", "Start khi dependency đã Done", "action"),
        ],
        "branches": {
            2: ("Không", "Nêu rõ điều kiện thiếu; khóa gửi request"),
            4: ("Không", "Rejected; không tạo Assignment hoặc R"),
        },
        "yes": {2: "Có", 4: "Có"},
        "footer": "Eligibility và số chỗ phải được kiểm tra lại ở backend lúc gửi và lúc duyệt.",
    },
    {
        "file": "03-execution-risk-ai.svg",
        "title": "03 · Thực hiện, blocker và risk",
        "subtitle": "Risk Engine tạo evidence · AI chỉ cố vấn · Manager quyết định",
        "steps": [
            ("Member", "Start task; cập nhật progress và effort", "action"),
            ("Member", "Báo blocker kèm mô tả", "action"),
            ("Hệ thống", "Task Blocked; lưu thời điểm blocker mở", "state"),
            ("Risk Engine", "Đánh giá rule từ dữ liệu task mới", "action"),
            ("Hệ thống", "Lưu riskLevel, ruleVersion và evidence", "state"),
            ("Manager", "Xem evidence; tùy chọn hỏi AI giải thích", "action"),
            ("Manager", "Chọn xử lý, nhập lý do", "action"),
            ("Hệ thống", "Ghi audit và đánh giá lại risk", "state"),
        ],
        "branches": {5: ("AI lỗi", "Evidence vẫn xem được; Manager có thể xử lý")},
        "yes": {},
        "footer": "Ví dụ R03: 40 giờ / progress 30% → Medium; Priority High nâng High. Blocker không tự kích hoạt R03.",
    },
    {
        "file": "04-review-dependency.svg",
        "title": "04 · Review và dependency",
        "subtitle": "R gửi kết quả · A nghiệm thu · Task sau chỉ được phép Start",
        "steps": [
            ("Hệ thống", "Task tiền nhiệm đã Done?", "decision"),
            ("Member", "Start và thực hiện task", "action"),
            ("Hệ thống", "Progress 100% và hết blocker?", "decision"),
            ("Member", "Gửi Review cho A", "action"),
            ("Manager (A)", "Duyệt nghiệm thu?", "decision"),
            ("Hệ thống", "Task Done", "state"),
            ("Hệ thống", "Task kế tiếp được phép Start", "state"),
        ],
        "branches": {
            0: ("Chưa", "Start bị khóa; nêu rõ task tiền nhiệm"),
            2: ("Chưa", "Review bị khóa; hiển thị progress/blocker"),
            4: ("Trả lại", "Về In Progress, bắt buộc có lý do"),
        },
        "yes": {0: "Rồi", 2: "Đủ", 4: "Duyệt"},
        "footer": "Done không tự Start task sau. Risk High không tự khóa Review; blocker mở mới là guard.",
    },
]


def lines(value: str, width: int = 46):
    return textwrap.wrap(value, width=width, break_long_words=False, break_on_hyphens=False)


def svg_text(x: int, y: int, value: str, font_size: int, color: str, weight: int = 500, width: int = 46):
    chunks = lines(value, width)
    return "".join(
        f'<text x="{x}" y="{y + index * (font_size + 5)}" fill="{color}" '
        f'font-family="Inter, Segoe UI, Arial, sans-serif" font-size="{font_size}" font-weight="{weight}">{escape(chunk)}</text>'
        for index, chunk in enumerate(chunks)
    )


def card(x: int, y: int, actor: str, label: str, kind: str, width: int = 480):
    palette = {
        "action": ("#FFFFFF", "#C9D5E3", "#1F3A5F"),
        "state": ("#EAF7F3", "#80C5B3", "#0F766E"),
        "decision": ("#FFF5E9", "#E9B875", "#A45711"),
        "branch": ("#FFF2F0", "#E8B3AC", "#B42318"),
    }
    fill, stroke, accent = palette[kind]
    height = 82
    output = [f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="14" fill="{fill}" stroke="{stroke}" stroke-width="2"/>']
    output.append(f'<rect x="{x}" y="{y}" width="6" height="{height}" rx="3" fill="{accent}"/>')
    output.append(svg_text(x + 20, y + 22, actor.upper(), 11, accent, 800, 70))
    output.append(svg_text(x + 20, y + 48, label, 16, "#203047", 650, 47 if width == 480 else 32))
    return "".join(output)


def render(flow):
    count = len(flow["steps"])
    height = 195 + count * 112 + 72
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{height}" viewBox="0 0 1200 {height}">',
        '<defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0 L10 4 L0 8 Z" fill="#7890AA"/></marker></defs>',
        f'<rect width="1200" height="{height}" fill="#F8FAFC"/>',
        '<rect x="0" y="0" width="1200" height="9" fill="#1F3A5F"/>',
        svg_text(64, 58, "CWRM-13  /  USER FLOW", 13, "#0F766E", 800),
        svg_text(64, 100, flow["title"], 30, "#152B49", 800),
        svg_text(64, 132, flow["subtitle"], 15, "#586A80"),
    ]
    top = 170
    for index, (actor, label, kind) in enumerate(flow["steps"]):
        y = top + index * 112
        parts.append(card(140, y, actor, label, kind))
        if index < count - 1:
            parts.append(f'<path d="M380 {y + 82} V{y + 112 - 6}" fill="none" stroke="#7890AA" stroke-width="2.5" marker-end="url(#arrow)"/>')
            if index in flow["yes"]:
                parts.append(svg_text(397, y + 103, flow["yes"][index], 12, "#0F766E", 800))
        if index in flow["branches"]:
            edge_label, branch = flow["branches"][index]
            parts.append(f'<path d="M620 {y + 41} H760" fill="none" stroke="#7890AA" stroke-width="2.5" marker-end="url(#arrow)"/>')
            parts.append(svg_text(665, y + 30, edge_label, 12, "#B42318", 800))
            parts.append(card(770, y, "Nhánh khác", branch, "branch", 350))
    footer_y = top + count * 112 + 5
    parts.append(f'<rect x="64" y="{footer_y}" width="1072" height="56" rx="12" fill="#EAF0F6"/>')
    parts.append(svg_text(84, footer_y + 23, flow["footer"], 14, "#35506B", 600, 130))
    parts.append('</svg>')
    (OUT / flow["file"]).write_text("\n".join(parts), encoding="utf-8")


if __name__ == "__main__":
    for item in FLOWS:
        render(item)
        print(item["file"])
