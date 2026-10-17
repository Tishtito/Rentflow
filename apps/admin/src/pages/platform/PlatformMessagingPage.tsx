import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ApiError,
  useDeliveryStats,
  usePlatformDeliveries,
  usePlatformWhatsApp,
  useRetryDelivery,
  useRetryFailedDeliveries,
} from '@rentflow/api';
import { channelLabel, formatDateTime, type PlatformDelivery, type PlatformWhatsAppNumber } from '@rentflow/core';
import {
  Button,
  Card,
  DataTable,
  DeliveryStatusBadge,
  ErrorState,
  EyeIcon,
  HomeIcon,
  FilterChips,
  LoadingState,
  Notice,
  PageHeader,
  Pager,
  RefreshIcon,
  SearchInput,
  StatCard,
  StatGrid,
  WhatsAppStatusBadge,
  actionsColumn,
} from '@rentflow/ui';

type Tab = 'messages' | 'whatsapp';
type Status = '' | 'failed' | 'sent' | 'delivered' | 'queued';
type Channel = '' | 'email' | 'whatsapp' | 'sms';

/** Bill emails and WhatsApp messages across every account: failures and resending, plus each landlord's WhatsApp number. */
export function PlatformMessagingPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'whatsapp' ? 'whatsapp' : 'messages';
  const stats = useDeliveryStats();
  const count = (status: string) => (stats.data?.last_24h ?? []).filter((s) => s.status === status).reduce((n, s) => n + s.count, 0);

  return (
    <>
      <PageHeader title="Messaging & delivery" subtitle="Bills and invitations sent by email and WhatsApp, for every account" />
      <StatGrid label="Last 24 hours">
        <StatCard label="Sent · 24 h" value={count('sent') + count('delivered')} />
        <StatCard label="Delivered · 24 h" value={count('delivered')} footnote="WhatsApp confirms delivery" />
        <StatCard label="Failed · 24 h" value={count('failed')} tone={count('failed') ? 'danger' : 'default'} />
        <StatCard
          label="Failed · waiting"
          value={stats.data?.failed_total ?? '—'}
          tone={stats.data?.failed_total ? 'warn' : 'default'}
          footnote="Not resent yet"
        />
      </StatGrid>
      <FilterChips<Tab>
        label="Section"
        value={tab}
        onChange={(v) => setParams(v === 'whatsapp' ? { tab: 'whatsapp' } : {}, { replace: true })}
        options={[
          { value: 'messages', label: 'Messages' },
          { value: 'whatsapp', label: 'WhatsApp numbers' },
        ]}
      />
      {tab === 'messages' ? <Messages /> : <WhatsAppNumbers />}
    </>
  );
}

function Messages() {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? '') as Status;
  const accountId = params.get('account') ? Number(params.get('account')) : undefined;
  const [channel, setChannel] = useState<Channel>('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const deliveries = usePlatformDeliveries({
    status: status || undefined,
    channel: channel || undefined,
    account_id: accountId,
    q: debounced || undefined,
    page,
  });
  const retry = useRetryDelivery();
  const retryAll = useRetryFailedDeliveries();
  const error = retry.error ?? retryAll.error;

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-end gap-4 px-4 pb-1.5 pt-4">
        <SearchInput
          label="Search messages"
          placeholder="Recipient or error"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-[300px]"
        />
        <FilterChips<Status>
          label="Status"
          value={status}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            if (v) next.set('status', v);
            else next.delete('status');
            setParams(next, { replace: true });
            setPage(1);
          }}
          options={[
            { value: '', label: 'All' },
            { value: 'failed', label: 'Failed' },
            { value: 'sent', label: 'Sent' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'queued', label: 'Queued' },
          ]}
        />
        <FilterChips<Channel>
          label="Channel"
          value={channel}
          onChange={(v) => {
            setChannel(v);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Any' },
            { value: 'email', label: 'Email' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'sms', label: 'SMS' },
          ]}
        />
        <Button className="ml-auto" disabled={retryAll.isPending} onClick={() => retryAll.mutate(accountId ?? null)}>
          {retryAll.isPending ? 'Resending…' : accountId ? 'Resend failed (this account)' : 'Resend all failed'}
        </Button>
      </div>
      {accountId && (
        <p className="m-0 px-4 text-xs text-muted">
          One account only · <Link to="/platform/messaging">show all accounts</Link>
        </p>
      )}
      {retryAll.isSuccess && (
        <Notice className="mx-4 mt-2" tone="success">
          Failed messages are being resent.
        </Notice>
      )}
      {error && (
        <Notice className="mx-4 mt-2" tone="danger">
          {error instanceof ApiError ? error.message : "Can't reach the server."}
        </Notice>
      )}
      {deliveries.isPending ? (
        <LoadingState />
      ) : deliveries.isError ? (
        <ErrorState className="m-4" message={deliveries.error.message} onRetry={() => void deliveries.refetch()} />
      ) : (
        <>
          <DataTable<PlatformDelivery>
            caption="Messages"
            rows={deliveries.data.data}
            rowKey={(d) => d.id}
            empty="No messages match."
            columns={[
              { key: 'when', header: 'When', cell: (d) => <span className="whitespace-nowrap">{formatDateTime(d.created_at)}</span> },
              {
                key: 'account',
                header: 'Account',
                cell: (d) => (d.account ? <Link to={`/platform/accounts/${d.account.id}`}>{d.account.name}</Link> : '—'),
              },
              {
                key: 'to',
                header: 'To',
                cell: (d) => (
                  <>
                    {d.tenant ?? d.recipient}
                    <span className="block text-xs text-muted">
                      {channelLabel[d.channel]} · {d.type.replace(/_/g, ' ')}
                      {d.tenant && ` · ${d.recipient}`}
                    </span>
                  </>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                cell: (d) => (
                  <>
                    <DeliveryStatusBadge status={d.status} />
                    {d.error && <span className="block max-w-[320px] text-xs text-danger-strong">{d.error}</span>}
                  </>
                ),
              },
              { key: 'tries', header: 'Tries', align: 'right', numeric: true, cell: (d) => d.attempts },
              actionsColumn<PlatformDelivery>((d) => [
                {
                  label: `Resend to ${d.recipient}`,
                  icon: RefreshIcon,
                  onClick: () => retry.mutate(d.id),
                  hidden: d.status !== 'failed',
                  disabled: retry.isPending && retry.variables === d.id,
                },
                {
                  label: `View ${d.account?.name ?? 'account'}`,
                  icon: HomeIcon,
                  to: `/platform/accounts/${d.account?.id}`,
                  hidden: !d.account,
                },
              ]),
            ]}
          />
          <Pager meta={deliveries.data.meta} page={page} onPage={setPage} busy={deliveries.isFetching} />
        </>
      )}
    </Card>
  );
}

function WhatsAppNumbers() {
  const numbers = usePlatformWhatsApp();

  return (
    <Card padded={false} description="Each landlord sends bills from their own WhatsApp Business number. Tokens are never shown.">
      {numbers.isPending ? (
        <LoadingState />
      ) : numbers.isError ? (
        <ErrorState className="m-4" message={numbers.error.message} onRetry={() => void numbers.refetch()} />
      ) : (
        <DataTable<PlatformWhatsAppNumber>
          caption="WhatsApp numbers"
          rows={numbers.data}
          rowKey={(n) => n.account_id}
          empty="No landlord has connected WhatsApp yet."
          columns={[
            { key: 'account', header: 'Account', cell: (n) => <Link to={`/platform/accounts/${n.account_id}`}>{n.account_name}</Link> },
            {
              key: 'number',
              header: 'Number',
              cell: (n) => (
                <>
                  {n.display_phone_number ?? '—'}
                  {n.verified_name && <span className="block text-xs text-muted">{n.verified_name}</span>}
                </>
              ),
            },
            { key: 'template', header: 'Template', cell: (n) => n.template_name },
            { key: 'sent', header: 'Sent · 7d', align: 'right', numeric: true, cell: (n) => n.sent_7d },
            {
              key: 'failed',
              header: 'Failed · 7d',
              align: 'right',
              numeric: true,
              cell: (n) => (n.failed_7d ? <span className="text-danger-strong">{n.failed_7d}</span> : 0),
            },
            { key: 'checked', header: 'Last checked', cell: (n) => (n.verified_at ? formatDateTime(n.verified_at) : '—') },
            { key: 'status', header: 'Status', cell: (n) => <WhatsAppStatusBadge status={n.status} /> },
            actionsColumn<PlatformWhatsAppNumber>((n) => [
              { label: `View ${n.account_name}`, icon: EyeIcon, to: `/platform/accounts/${n.account_id}` },
            ]),
          ]}
        />
      )}
    </Card>
  );
}
