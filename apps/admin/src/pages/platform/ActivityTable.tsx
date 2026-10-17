import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTime, type AuditEntry } from '@rentflow/core';
import { Badge, EyeIcon, EyeOffIcon, HomeIcon, RowActions } from '@rentflow/ui';

const actorLabel = { user: null, tenant: 'Tenant', system: 'System', guest: 'Not logged in' } as const;

/** Activity-log rows: when, who, what, where; a row opens to show what was sent (secrets redacted). */
export function ActivityTable({ entries, showAccount = true }: { entries: AuditEntry[]; showAccount?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);

  if (entries.length === 0) return <p className="m-0 px-4 py-6 text-sm text-muted">No activity yet.</p>;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Activity</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 font-semibold">When</th>
              <th className="px-4 py-2.5 font-semibold">Who</th>
              <th className="px-4 py-2.5 font-semibold">What</th>
              {showAccount && <th className="px-4 py-2.5 font-semibold">Account</th>}
              <th className="px-2 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <Fragment key={e.id}>
                <tr className="border-t border-line-soft align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatDateTime(e.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {e.actor_name ?? actorLabel[e.actor_type] ?? '—'}
                      {e.actor_type === 'tenant' && <Badge>Tenant</Badge>}
                      {e.via_platform && <Badge tone="gold">Platform</Badge>}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {e.summary}
                    {e.subject_type && (
                      <span className="text-muted">
                        {' '}
                        · {e.subject_type.replace(/_/g, ' ')} #{e.subject_id}
                      </span>
                    )}
                  </td>
                  {showAccount && (
                    <td className="px-4 py-2.5">
                      {e.account ? (
                        <Link to={`/platform/accounts/${e.account.id}`}>{e.account.name}</Link>
                      ) : (
                        <span className="text-muted">Platform</span>
                      )}
                    </td>
                  )}
                  <td className="px-2 py-1 text-right">
                    <RowActions
                      actions={[
                        {
                          label: open === e.id ? 'Hide details' : `Details of "${e.summary}"`,
                          icon: open === e.id ? EyeOffIcon : EyeIcon,
                          onClick: () => setOpen(open === e.id ? null : e.id),
                          hidden: !e.data,
                        },
                        {
                          label: `View ${e.account?.name ?? 'account'}`,
                          icon: HomeIcon,
                          to: `/platform/accounts/${e.account?.id}`,
                          hidden: !e.account || !showAccount,
                        },
                      ]}
                    />
                  </td>
                </tr>
                {open === e.id && e.data && (
                  <tr>
                    <td colSpan={showAccount ? 5 : 4} className="bg-canvas px-4 py-3">
                      <pre className="m-0 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs text-subtle">
                        {JSON.stringify(e.data, null, 2)}
                      </pre>
                      <p className="m-0 mt-1 text-xs text-muted">
                        {e.action}
                        {e.ip && ` · ${e.ip}`}
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: a card per entry. */}
      <ul aria-label="Activity" className="m-0 flex list-none flex-col gap-3 p-3 md:hidden">
        {entries.map((e) => (
          <li key={e.id} className="rounded-lg border border-line bg-surface p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 font-semibold">
                {e.summary}
                {e.subject_type && (
                  <span className="font-normal text-muted">
                    {' '}
                    · {e.subject_type.replace(/_/g, ' ')} #{e.subject_id}
                  </span>
                )}
              </span>
              <span className="-mr-2 -mt-2 shrink-0">
                <RowActions
                  actions={[
                    {
                      label: open === e.id ? 'Hide details' : `Details of "${e.summary}"`,
                      icon: open === e.id ? EyeOffIcon : EyeIcon,
                      onClick: () => setOpen(open === e.id ? null : e.id),
                      hidden: !e.data,
                    },
                  ]}
                />
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-muted">
              <span>{formatDateTime(e.created_at)}</span>
              <span>·</span>
              <span className="text-ink">{e.actor_name ?? actorLabel[e.actor_type] ?? '—'}</span>
              {e.actor_type === 'tenant' && <Badge>Tenant</Badge>}
              {e.via_platform && <Badge tone="gold">Platform</Badge>}
            </div>
            {showAccount && (
              <div className="mt-1 text-muted">
                {e.account ? <Link to={`/platform/accounts/${e.account.id}`}>{e.account.name}</Link> : 'Platform'}
              </div>
            )}
            {open === e.id && e.data && (
              <pre className="m-0 mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-canvas p-3 text-xs text-subtle">
                {JSON.stringify(e.data, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
