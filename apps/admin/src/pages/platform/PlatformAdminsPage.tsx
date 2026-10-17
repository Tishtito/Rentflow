import { useState } from 'react';
import {
  ApiError,
  useInvitePlatformAdmin,
  usePlatformAdmins,
  usePlatformAdminStatus,
  useRemovePlatformAdmin,
  useResendPlatformAdminInvite,
} from '@rentflow/api';
import { formatDateTime, type PlatformAdmin } from '@rentflow/core';
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  LoadingState,
  MailIcon,
  Notice,
  PageHeader,
  PauseIcon,
  PlayIcon,
  SidePanel,
  TextField,
  TrashIcon,
  actionsColumn,
} from '@rentflow/ui';
import { fieldErrors, formMessage } from '../../errors';

/** The people who run Rentflow itself (full access to every account). */
export function PlatformAdminsPage() {
  const admins = usePlatformAdmins();
  const status = usePlatformAdminStatus();
  const remove = useRemovePlatformAdmin();
  const reinvite = useResendPlatformAdminInvite();
  const [inviting, setInviting] = useState(false);
  // Suspend and remove need a second click on the same icon.
  const [confirm, setConfirm] = useState<{ id: number; action: 'suspend' | 'remove' } | null>(null);
  const error = status.error ?? remove.error ?? reinvite.error;

  return (
    <>
      <PageHeader
        title="Platform admins"
        subtitle="Full access to every landlord account. There is always at least one active admin."
        actions={
          <Button variant="primary" onClick={() => setInviting(true)}>
            + Invite admin
          </Button>
        }
      />
      {error && (
        <Notice tone="danger">
          {error instanceof ApiError ? (Object.values(error.errors)[0]?.[0] ?? error.message) : "Can't reach the server."}
        </Notice>
      )}
      {reinvite.isSuccess && <Notice tone="success">Invitation sent again.</Notice>}
      {/* The panel sits beside the table on wide screens and wraps below it on narrow ones. */}
      <div className="flex flex-wrap items-start gap-6">
        <Card padded={false} className="min-w-0 flex-[3_1_560px]">
          {admins.isPending ? (
            <LoadingState />
          ) : admins.isError ? (
            <ErrorState className="m-4" message={admins.error.message} onRetry={() => void admins.refetch()} />
          ) : (
            <DataTable<PlatformAdmin>
              caption="Platform admins"
              rows={admins.data}
              rowKey={(a) => a.id}
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  cell: (a) => (
                    <span className="flex flex-col">
                      <strong className="font-semibold">
                        {a.name}
                        {a.is_me && ' (you)'}
                      </strong>
                      <span className="text-xs text-muted">{a.email}</span>
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (a) =>
                    a.status === 'active' ? (
                      <Badge tone="success">Active</Badge>
                    ) : a.status === 'invited' ? (
                      <Badge tone="info">Invited</Badge>
                    ) : (
                      <Badge tone="danger">Suspended</Badge>
                    ),
                },
                {
                  key: 'login',
                  header: 'Last login',
                  cell: (a) => (a.last_login_at ? formatDateTime(a.last_login_at) : <span className="text-muted">Never</span>),
                },
                actionsColumn<PlatformAdmin>((a) => {
                  const confirming = (action: 'suspend' | 'remove') => confirm?.id === a.id && confirm.action === action;
                  const twoStep = (action: 'suspend' | 'remove', run: () => void) => () =>
                    confirming(action) ? (setConfirm(null), run()) : setConfirm({ id: a.id, action });
                  return [
                    {
                      label: `Resend invitation to ${a.name}`,
                      icon: MailIcon,
                      onClick: () => reinvite.mutate(a.id),
                      hidden: a.is_me || a.status !== 'invited',
                      disabled: reinvite.isPending,
                    },
                    {
                      label: `Suspend ${a.name}`,
                      icon: PauseIcon,
                      tone: 'danger',
                      onClick: twoStep('suspend', () => status.mutate({ id: a.id, status: 'suspended' })),
                      pending: confirming('suspend') ? 'Click again' : undefined,
                      hidden: a.is_me || a.status !== 'active',
                      disabled: status.isPending,
                    },
                    {
                      label: `Reactivate ${a.name}`,
                      icon: PlayIcon,
                      onClick: () => status.mutate({ id: a.id, status: 'active' }),
                      hidden: a.is_me || a.status !== 'suspended',
                      disabled: status.isPending,
                    },
                    {
                      label: `Remove ${a.name}`,
                      icon: TrashIcon,
                      tone: 'danger',
                      onClick: twoStep('remove', () => remove.mutate(a.id)),
                      pending: confirming('remove') ? 'Click again' : undefined,
                      hidden: a.is_me,
                      disabled: remove.isPending,
                    },
                  ];
                }),
              ]}
            />
          )}
        </Card>
        {inviting && <InvitePanel onClose={() => setInviting(false)} />}
      </div>
    </>
  );
}

function InvitePanel({ onClose }: { onClose: () => void }) {
  const invite = useInvitePlatformAdmin();
  const [f, setF] = useState({ name: '', email: '' });
  const errors = fieldErrors(invite.error);
  const message = formMessage(invite.error, ['name', 'email']);

  return (
    <SidePanel title="Invite a platform admin" subtitle="They get an email to set a password" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutate(f, { onSuccess: onClose });
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        <Notice tone="warn">Platform admins can open and change every landlord account.</Notice>
        <TextField label="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} />
        <TextField
          label="Email"
          type="email"
          required
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
          error={errors.email}
        />
        <Button type="submit" variant="primary" size="lg" disabled={invite.isPending}>
          {invite.isPending ? 'Sending…' : 'Send invitation'}
        </Button>
      </form>
    </SidePanel>
  );
}
