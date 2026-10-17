import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCan, useResendStaffInvite, useTeam } from '@rentflow/api';
import { formatDate, type TeamMember } from '@rentflow/core';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  DataTable,
  ErrorState,
  LoadingState,
  MailIcon,
  Notice,
  PageHeader,
  PencilIcon,
  actionsColumn,
} from '@rentflow/ui';
import { StaffPanel } from '../panels/StaffPanel';

const statusBadge = {
  active: <Badge tone="success">Active</Badge>,
  invited: <Badge tone="info">Invited</Badge>,
  suspended: <Badge tone="danger">Suspended</Badge>,
};

/** The people who work in this account: roles, properties they look after, login status. */
export function TeamPage() {
  const can = useCan();
  const team = useTeam();
  const [panel, setPanel] = useState<{ member?: TeamMember } | null>(null);
  const canManage = can('team.manage');
  const reinvite = useResendStaffInvite();

  return (
    <>
      <PageHeader
        title="Team & roles"
        subtitle="Who can log in to this account and what they can do"
        actions={
          <>
            <ButtonLink to="/admin/team/roles">Roles</ButtonLink>
            {canManage && (
              <Button variant="primary" onClick={() => setPanel({})}>
                + Invite
              </Button>
            )}
          </>
        }
      />
      {reinvite.isSuccess && <Notice tone="success">Invitation sent again.</Notice>}
      {/* The panel sits beside the table on wide screens and wraps below it on narrow ones. */}
      <div className="flex flex-wrap items-start gap-6">
        <Card padded={false} className="min-w-0 flex-[3_1_560px]">
          {team.isPending ? (
            <LoadingState />
          ) : team.isError ? (
            <ErrorState className="m-4" message={team.error.message} onRetry={() => void team.refetch()} />
          ) : (
            <DataTable<TeamMember>
              caption="Team"
              rows={team.data}
              rowKey={(m) => m.id}
              empty="Nobody yet."
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  cell: (m) => (
                    <span className="flex flex-col">
                      {canManage ? (
                        <button
                          type="button"
                          className="min-h-touch border-0 bg-transparent p-0 text-left font-semibold text-brand"
                          onClick={() => setPanel({ member: m })}
                        >
                          {m.name}
                          {m.is_me && ' (you)'}
                        </button>
                      ) : (
                        <strong className="font-semibold">
                          {m.name}
                          {m.is_me && ' (you)'}
                        </strong>
                      )}
                      <span className="text-xs text-muted">{m.email}</span>
                    </span>
                  ),
                },
                {
                  key: 'roles',
                  header: 'Roles',
                  cell: (m) => (
                    <span className="flex flex-wrap gap-1">
                      {m.roles.map((r) => (
                        <Badge key={r.id} tone={r.name === 'Owner' ? 'gold' : 'neutral'}>
                          {r.name}
                        </Badge>
                      ))}
                    </span>
                  ),
                },
                {
                  key: 'properties',
                  header: 'Looks after',
                  cell: (m) =>
                    m.properties.length ? (
                      m.properties.map((p) => (
                        <Link key={p.id} to={`/admin/properties/${p.id}`} className="mr-2">
                          {p.name}
                        </Link>
                      ))
                    ) : (
                      <span className="text-muted">—</span>
                    ),
                },
                { key: 'status', header: 'Status', cell: (m) => statusBadge[m.status] },
                {
                  key: 'login',
                  header: 'Last login',
                  cell: (m) => (m.last_login_at ? formatDate(m.last_login_at) : <span className="text-muted">Never</span>),
                },
                actionsColumn<TeamMember>((m) => [
                  { label: `Edit ${m.name}`, icon: PencilIcon, onClick: () => setPanel({ member: m }), hidden: !canManage },
                  {
                    label: `Resend invitation to ${m.name}`,
                    icon: MailIcon,
                    onClick: () => reinvite.mutate(m.id),
                    hidden: !canManage || m.status !== 'invited',
                    disabled: reinvite.isPending,
                  },
                ]),
              ]}
            />
          )}
        </Card>
        {panel && <StaffPanel member={panel.member} onClose={() => setPanel(null)} />}
      </div>
    </>
  );
}
