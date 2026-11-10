import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import type { TaskSummary } from "@/lib/demo-data";

export function TaskTable({ tasks }: { tasks: TaskSummary[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Công việc</th>
            <th>Task Status</th>
            <th>Hình thức</th>
            <th>Assignment / Request</th>
            <th>R</th>
            <th>Hạn</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <Link href={`/tasks/${task.id}`} className="table-title">{task.title}</Link>
                <span className="table-subtitle">{task.id} · {task.team}</span>
              </td>
              <td><StatusBadge value={task.status} /></td>
              <td><StatusBadge value={task.assignmentMode} /></td>
              <td>
                {task.assignmentStatus ? <StatusBadge value={task.assignmentStatus} /> : task.requestStatus ? <StatusBadge value={task.requestStatus} /> : <span className="muted">Chưa có</span>}
              </td>
              <td>{task.responsible ?? <span className="muted">Chưa có R</span>}</td>
              <td>{task.deadlineLabel}</td>
              <td><StatusBadge value={task.riskLevel} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
