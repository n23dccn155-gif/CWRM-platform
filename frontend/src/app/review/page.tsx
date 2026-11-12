import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { TaskTable } from "@/components/task-table";
import { listTasks } from "@/lib/api/client";

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default async function ReviewPage() {
  const demoTasks = await listTasks();
  const awaitingReview = demoTasks.filter((task) => task.status === "Review" || task.status === "REVIEW");
  const successors = demoTasks.filter((task) => task.predecessorId);

  return (
    <AppShell>
      <div className="review-page">
        <style>{`
          .ft-dependency-list { display: flex; flex-direction: column; gap: 12px; }
          .ft-flow { display: grid; grid-template-columns: minmax(0, 1fr) 78px minmax(0, 1fr); align-items: stretch; }
          .ft-node { display: flex; flex-direction: column; gap: 5px; min-width: 0; padding: 13px 15px; border: 1px solid var(--border); border-radius: 10px; background: var(--card-soft); transition: border-color .15s ease, background .15s ease; }
          .ft-node:hover { border-color: var(--accent-border); }
          .ft-node-pre { border-left: 3px solid var(--warn-text); }
          .ft-flow-locked .ft-node-target { border-left: 3px solid var(--border-strong); background: var(--card-muted); }
          .ft-flow-open .ft-node-target { border-left: 3px solid var(--accent); }
          .ft-node-kind { color: var(--faint); font-size: 9.5px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
          .ft-node strong { color: var(--heading); font-size: 13px; line-height: 1.3; }
          .ft-node-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-top: 1px; }
          .ft-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-variant-numeric: tabular-nums; font-size: 10px; font-weight: 700; letter-spacing: .02em; color: var(--faint); }
          .ft-link { position: relative; display: flex; align-items: center; justify-content: center; }
          .ft-link-line { position: relative; width: 100%; height: 1.5px; background: var(--border-strong); }
          .ft-link-line::after { content: ""; position: absolute; top: 50%; right: 5px; width: 6px; height: 6px; border-top: 1.5px solid var(--border-strong); border-right: 1.5px solid var(--border-strong); transform: translateY(-50%) rotate(45deg); }
          .ft-link-type { position: absolute; top: calc(50% - 19px); padding: 1px 5px; border-radius: 4px; background: var(--card); color: var(--faint); font-size: 8.5px; font-weight: 800; letter-spacing: .04em; }
          .ft-lock { display: inline-flex; align-items: center; gap: 5px; width: fit-content; margin-top: 4px; padding: 3px 8px; border: 1px solid var(--border); border-radius: 100px; background: var(--card); color: var(--faint); font-size: 10.5px; font-weight: 750; }
          .ft-lock svg { width: 12px; height: 12px; flex-shrink: 0; }
          .ft-lock-open { color: var(--accent-text); border-color: var(--accent-border); background: var(--accent-soft); }
          @media (max-width: 720px) {
            .ft-flow { grid-template-columns: 1fr; row-gap: 6px; }
            .ft-link { height: 26px; }
            .ft-link-line { width: 1.5px; height: 100%; }
            .ft-link-line::after { top: auto; right: auto; bottom: 3px; left: 50%; transform: translateX(-50%) rotate(135deg); }
            .ft-link-type { top: 50%; left: calc(50% + 10px); transform: translateY(-50%); }
          }
        `}</style>
        <PageHeading
          eyebrow="Manager / Nghiệm thu và phụ thuộc"
          title="Quyết định Done, mở quyền Start"
          description="R gửi Review khi progress đạt 100% và không còn blocker. A nghiệm thu hoặc trả lại có lý do; task kế tiếp chỉ được phép Start sau khi tiền nhiệm Done."
        />

        <section className="panel" aria-labelledby="review-queue-heading">
          <div className="section-header">
            <div><p className="eyebrow">Quyết định của A</p><h2 id="review-queue-heading">Hàng chờ Review</h2></div>
            <span className="count-label">{awaitingReview.length} task</span>
          </div>
          <TaskTable tasks={awaitingReview} />
          {awaitingReview.map((task) => (
            <div className="dependency-row" key={`${task.id}-result`}>
              <div>
                <strong>{task.title}</strong>
                <p>Kết quả R nộp: {task.reviewResultText ?? "Chưa có mô tả văn bản"}</p>
                {task.reviewResultUrl && <a className="text-link" href={task.reviewResultUrl}>Mở liên kết kết quả</a>}
              </div>
              <Link className="button button-primary" href={`/tasks/${task.id}`}>Xem nghiệm thu</Link>
            </div>
          ))}
          <div className="rule-callout">
            <strong>Hai quyết định hợp lệ</strong>
            <span>Duyệt → Done. Trả lại → In Progress kèm lý do. Progress 100% và Risk High không tự quyết định thay A.</span>
          </div>
        </section>

        <section className="panel section-gap" aria-labelledby="dependency-list-heading">
          <div className="section-header">
            <div><p className="eyebrow">Finish-to-Start</p><h2 id="dependency-list-heading">Task phụ thuộc</h2></div>
            <span className="count-label">{successors.length} task</span>
          </div>
          <div className="ft-dependency-list">
            {successors.map((task) => {
              const predecessor = demoTasks.find((item) => item.id === task.predecessorId);
              const unlocked = predecessor?.status === "Done";
              const lockLabel = unlocked
                ? "Sẵn sàng Start"
                : `Chờ ${predecessor?.title ? `"${predecessor.title}"` : "tiền nhiệm"} Done`;
              return (
                <div className={`ft-flow ${unlocked ? "ft-flow-open" : "ft-flow-locked"}`} key={task.id}>
                  <Link className="ft-node ft-node-pre" href={`/tasks/${predecessor?.id ?? task.predecessorId}`}>
                    <span className="ft-node-kind">Tiền nhiệm</span>
                    <strong>{predecessor?.title ?? task.predecessorId}</strong>
                    <span className="ft-node-meta">
                      <span className="ft-code">{predecessor?.id ?? task.predecessorId}</span>
                      {predecessor && <StatusBadge value={predecessor.status} />}
                    </span>
                  </Link>
                  <div className="ft-link" aria-hidden="true">
                    <span className="ft-link-line" />
                    <span className="ft-link-type">F→S</span>
                  </div>
                  <Link className="ft-node ft-node-target" href={`/tasks/${task.id}`}>
                    <span className="ft-node-kind">Task kế tiếp</span>
                    <strong>{task.title}</strong>
                    <span className="ft-node-meta">
                      <span className="ft-code">{task.id}</span>
                      <StatusBadge value={unlocked ? "Được phép Start" : "Start bị khóa"} />
                    </span>
                    {!unlocked ? (
                      <span className="ft-lock">
                        <LockIcon />
                        {lockLabel}
                      </span>
                    ) : (
                      <span className="ft-lock ft-lock-open">{lockLabel}</span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="helper-note">Mũi tên F→S chỉ mở khóa sau khi tiền nhiệm được A duyệt Done. Hệ thống không tự chuyển task kế tiếp sang In Progress.</p>
        </section>
        <p className="helper-note">Đây là bản xem trước với dữ liệu mẫu. Các quyết định nghiệp vụ và việc mở khóa Start cần backend kiểm tra quyền, điều kiện và ghi audit.</p>
      </div>
    </AppShell>
  );
}
