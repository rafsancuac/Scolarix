import "server-only";

import { db } from "@/server/db";
import { can, type Role } from "@/server/auth/policy";
import { formatDate } from "@/lib/format";

/**
 * Operational statistics from live queries. Each block is shown only when the
 * viewer's role holds the matching capability (rule 14, §17.6); a block the
 * viewer may not see is omitted entirely rather than rendered blank.
 */
export async function AdminStats({ role }: { role: Role }) {
  const now = new Date();
  const [usersByRole, activeSessions, orderCount, openTickets, recentAudit] = await Promise.all([
    can(role, "users.view") ? db.user.groupBy({ by: ["role"], where: { deletedAt: null }, _count: { _all: true } }) : null,
    can(role, "users.view") ? db.session.count({ where: { revokedAt: null, expiresAt: { gt: now }, absoluteExpiresAt: { gt: now } } }) : null,
    can(role, "finance.view") ? db.order.count() : null,
    can(role, "customer.pii.view") ? db.ticket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }) : null,
    can(role, "audit.view") ? db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, action: true, entity: true, actorRole: true, createdAt: true } }) : null,
  ]);

  return (
    <section aria-labelledby="live-stats" className="container-page pt-10">
      <h2 id="live-stats" className="text-h3 font-semibold text-primary">Live platform data</h2>
      <p className="mt-1 text-caption text-muted">Each figure below is a database query run when this page loaded.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {usersByRole ? (
          <div className="card p-5">
            <p className="text-caption text-muted">Accounts</p>
            <p className="tnum mt-1 text-h2 font-bold text-primary">{usersByRole.reduce((n, r) => n + r._count._all, 0)}</p>
            <ul className="mt-2 space-y-0.5 text-caption text-secondary">
              {usersByRole.map((r) => (
                <li key={r.role} className="flex justify-between"><span>{r.role.toLowerCase().replace("_", " ")}</span><span className="tnum">{r._count._all}</span></li>
              ))}
            </ul>
          </div>
        ) : null}
        {activeSessions !== null ? (
          <div className="card p-5">
            <p className="text-caption text-muted">Active sessions</p>
            <p className="tnum mt-1 text-h2 font-bold text-primary">{activeSessions}</p>
          </div>
        ) : null}
        {orderCount !== null ? (
          <div className="card p-5">
            <p className="text-caption text-muted">Orders</p>
            <p className="tnum mt-1 text-h2 font-bold text-primary">{orderCount}</p>
            {orderCount === 0 ? <p className="mt-2 text-caption text-secondary">No orders yet — checkout is not enabled without payment credentials.</p> : null}
          </div>
        ) : null}
        {openTickets !== null ? (
          <div className="card p-5">
            <p className="text-caption text-muted">Open tickets</p>
            <p className="tnum mt-1 text-h2 font-bold text-primary">{openTickets}</p>
          </div>
        ) : null}
      </div>

      {recentAudit ? (
        <div className="card mt-4 p-5">
          <h3 className="text-body font-semibold text-primary">Recent audit log</h3>
          {recentAudit.length === 0 ? (
            <p className="mt-3 text-caption text-muted">No audited actions yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-caption">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="flex justify-between gap-3 py-2">
                  <span className="text-primary">{entry.action} <span className="text-muted">· {entry.entity}{entry.actorRole ? ` · ${entry.actorRole.toLowerCase()}` : ""}</span></span>
                  <time dateTime={entry.createdAt.toISOString()} className="tnum shrink-0 text-muted">{formatDate(entry.createdAt.toISOString())}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
