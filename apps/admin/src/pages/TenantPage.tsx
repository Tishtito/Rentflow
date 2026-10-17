import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { downloadInvoicePdf, useApi, useCan, useEndLease, useResendInvitation, useTenantDetail, useUpdateTenant } from '@rentflow/api';
import { cn, formatAmount, formatDate, formatKES, formatPeriod, toCents, type AdminTenant, type Invoice } from '@rentflow/core';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  DataTable,
  ErrorState,
  EyeIcon,
  InvoiceStatusBadge,
  LeaseStatusBadge,
  LoadingState,
  Notice,
  PageHeader,
  PaymentHistoryList,
  ReceiptIcon,
  SidePanel,
  TextField,
  actionsColumn,
} from '@rentflow/ui';
import { fieldErrors, formMessage } from '../errors';

/** One tenant: contact, home and balance, bills and payments; edit, resend invitation, move out. */
export function TenantPage() {
  const id = Number(useParams().tenantId);
  const tenant = useTenantDetail(id);
  const can = useCan();
  const api = useApi();
  const canEdit = can('tenants.manage');
  const canEndLease = can('leases.manage');
  const invite = useResendInvitation();
  // ?edit=1 (the pencil in the tenants list) opens the edit panel straight away.
  const [params, setParams] = useSearchParams();
  const [panel, setPanelState] = useState<'edit' | 'end' | null>(params.get('edit') === '1' && canEdit ? 'edit' : null);
  const setPanel = (next: 'edit' | 'end' | null) => {
    setPanelState(next);
    if (!next && params.has('edit')) setParams({}, { replace: true });
  };

  if (tenant.isPending) return <LoadingState />;
  if (tenant.isError) return <ErrorState message={tenant.error.message} onRetry={() => void tenant.refetch()} />;
  const t = tenant.data;
  const lease = t.current_lease;
  const balance = lease?.balance ?? t.leases?.[0]?.balance ?? null;
  const inviteError = formMessage(invite.error);

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Tenants', to: '/admin/tenants' }, { label: t.full_name }]}
        title={t.full_name}
        badge={t.status === 'active' ? <Badge tone="success">Portal active</Badge> : t.status === 'invited' ? <Badge tone="info">Invited</Badge> : <Badge>Inactive</Badge>}
        actions={
          canEdit && (
            <>
              {t.status === 'invited' && t.email && (
                <Button onClick={() => invite.mutate(t.id)} disabled={invite.isPending}>
                  {invite.isPending ? 'Sending…' : 'Resend invitation'}
                </Button>
              )}
              <Button onClick={() => setPanel('edit')}>Edit details</Button>
              {lease && (
                <ButtonLink variant="primary" to={`/admin/payments?lease=${lease.id}`}>
                  Record payment
                </ButtonLink>
              )}
            </>
          )
        }
      />

      {invite.isSuccess && <Notice tone="success">Invitation emailed to {t.email}. The link works for 3 days.</Notice>}
      {inviteError && <Notice tone="danger">{inviteError}</Notice>}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-6">
          <Card title="Bills" padded={false} id="bills">
            <DataTable<Invoice>
              caption="Bills"
              rows={t.invoices ?? []}
              rowKey={(i) => i.id}
              empty="No bills yet."
              columns={[
                { key: 'no', header: 'Bill', cell: (i) => <Link to={`/admin/bills/${i.id}`}>{i.invoice_number}</Link> },
                { key: 'period', header: 'Period', cell: (i) => formatPeriod(i.period_start, i.period_end) },
                { key: 'total', header: 'Total (KES)', align: 'right', numeric: true, cell: (i) => formatAmount(i.total_due) },
                { key: 'status', header: 'Status', cell: (i) => <InvoiceStatusBadge status={i.status} /> },
                actionsColumn<Invoice>((i) => [
                  { label: `View bill ${i.invoice_number}`, icon: EyeIcon, to: `/admin/bills/${i.id}` },
                  { label: `Download ${i.invoice_number} (PDF)`, icon: ReceiptIcon, onClick: () => void downloadInvoicePdf(api, i) },
                ]),
              ]}
            />
          </Card>
          <Card title="Payments" id="payments">
            {(t.payments ?? []).length ? <PaymentHistoryList payments={t.payments ?? []} /> : <span className="text-sm text-muted">No payments yet.</span>}
          </Card>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          {panel === 'edit' && <EditTenantPanel tenant={t} onClose={() => setPanel(null)} />}
          {panel === 'end' && lease && <EndLeasePanel leaseId={lease.id} unit={lease.unit_number ?? ''} startDate={lease.start_date} onClose={() => setPanel(null)} />}

          <Card title={lease ? `House ${lease.unit_number}` : 'No current home'} description={lease?.property_name ?? 'This tenant has moved out.'} id="lease">
            {balance != null && (
              <span className={cn('num font-display text-[28px] font-bold', toCents(balance) > 0 ? 'text-warn-strong' : 'text-brand')}>
                {toCents(balance) < 0 ? `${formatKES(-toCents(balance) / 100)} credit` : formatKES(balance)}
              </span>
            )}
            {lease && (
              <dl className="num m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted">Rent</dt>
                <dd className="m-0">{formatKES(lease.monthly_rent)}</dd>
                <dt className="text-muted">Moved in</dt>
                <dd className="m-0">{formatDate(lease.start_date, { year: true })}</dd>
                <dt className="text-muted">Next bill</dt>
                <dd className="m-0">{formatDate(lease.next_billing_date, { year: true })}</dd>
                <dt className="text-muted">Lease</dt>
                <dd className="m-0">
                  <LeaseStatusBadge status={lease.status} />
                </dd>
              </dl>
            )}
            {canEndLease && lease && (
              <Button variant="danger-outline" className="self-start" onClick={() => setPanel('end')}>
                Move out…
              </Button>
            )}
          </Card>

          <Card title="Contact" id="contact">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">Phone</dt>
              <dd className="num m-0">{t.phone}</dd>
              <dt className="text-muted">Email</dt>
              <dd className="m-0 break-all">{t.email ?? '—'}</dd>
              <dt className="text-muted">National ID</dt>
              <dd className="num m-0">{t.national_id ?? '—'}</dd>
              {t.next_of_kin_name && (
                <>
                  <dt className="text-muted">Next of kin</dt>
                  <dd className="m-0">
                    {t.next_of_kin_name} {t.next_of_kin_phone && <span className="num text-muted">· {t.next_of_kin_phone}</span>}
                  </dd>
                </>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}

function EditTenantPanel({ tenant, onClose }: { tenant: AdminTenant; onClose: () => void }) {
  const save = useUpdateTenant();
  const [form, setForm] = useState({
    first_name: tenant.first_name,
    last_name: tenant.last_name,
    phone: tenant.phone,
    whatsapp_phone: tenant.whatsapp_phone ?? '',
    email: tenant.email ?? '',
    national_id: tenant.national_id ?? '',
    next_of_kin_name: tenant.next_of_kin_name ?? '',
    next_of_kin_phone: tenant.next_of_kin_phone ?? '',
  });
  const errors = fieldErrors(save.error);
  const message = formMessage(save.error, Object.keys(form));
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <SidePanel title="Edit details" subtitle={tenant.full_name} onClose={onClose} className="flex-none">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const blank = (v: string) => v.trim() || null;
          save.mutate(
            {
              id: tenant.id,
              first_name: form.first_name,
              last_name: form.last_name,
              phone: form.phone,
              whatsapp_phone: blank(form.whatsapp_phone),
              email: blank(form.email),
              national_id: blank(form.national_id),
              next_of_kin_name: blank(form.next_of_kin_name),
              next_of_kin_phone: blank(form.next_of_kin_phone),
            },
            { onSuccess: onClose },
          );
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <TextField label="First name" required value={form.first_name} onChange={set('first_name')} error={errors.first_name} />
          <TextField label="Last name" required value={form.last_name} onChange={set('last_name')} error={errors.last_name} />
          <TextField label="Phone" type="tel" required value={form.phone} onChange={set('phone')} error={errors.phone} />
          <TextField label="WhatsApp" type="tel" hint="If different" value={form.whatsapp_phone} onChange={set('whatsapp_phone')} error={errors.whatsapp_phone} />
        </div>
        <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="National ID" inputMode="numeric" value={form.national_id} onChange={set('national_id')} error={errors.national_id} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Next of kin" value={form.next_of_kin_name} onChange={set('next_of_kin_name')} error={errors.next_of_kin_name} />
          <TextField label="Their phone" type="tel" value={form.next_of_kin_phone} onChange={set('next_of_kin_phone')} error={errors.next_of_kin_phone} />
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </SidePanel>
  );
}

function EndLeasePanel({ leaseId, unit, startDate, onClose }: { leaseId: number; unit: string; startDate: string; onClose: () => void }) {
  const end = useEndLease();
  const [date, setDate] = useState('');
  const errors = fieldErrors(end.error);
  const message = formMessage(end.error, ['end_date']);

  return (
    <SidePanel title={`Move out of ${unit}`} subtitle="Ends the lease; the unit becomes vacant" onClose={onClose} className="flex-none">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          end.mutate({ leaseId, end_date: date }, { onSuccess: onClose });
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        <TextField label="Last day in the unit" type="date" required min={startDate} value={date} onChange={(e) => setDate(e.target.value)} error={errors.end_date} />
        <span className="text-xs text-muted">What the tenant still owes (or their credit) stays on their statement. No more bills are created.</span>
        <Button type="submit" variant="danger-outline" size="lg" disabled={end.isPending}>
          {end.isPending ? 'Saving…' : 'End lease'}
        </Button>
      </form>
    </SidePanel>
  );
}
