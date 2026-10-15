import { useEffect, useState } from 'react';
import { ApiError, useAdminUser, useDisconnectWhatsApp, useSaveWhatsApp, useWhatsAppConnection, type SaveWhatsAppBody } from '@rentflow/api';
import { formatDateTime } from '@rentflow/core';
import { Badge, Button, Card, ErrorState, LoadingState, Notice, PageHeader, TextField, WhatsAppStatusBadge } from '@rentflow/ui';

const empty: Required<SaveWhatsAppBody> = {
  phone_number_id: '',
  business_account_id: '',
  access_token: '',
  app_secret: '',
  template_name: 'rentflow_bill_issued',
  template_language: 'en',
};

/** Bills by WhatsApp from the landlord's own number (GET/PUT/DELETE /api/admin/whatsapp). */
export function WhatsAppSettingsPage() {
  const canEdit = useAdminUser().data?.role === 'landlord';
  const connection = useWhatsAppConnection();
  const save = useSaveWhatsApp();
  const disconnect = useDisconnectWhatsApp();
  const [form, setForm] = useState(empty);

  const current = connection.data;
  useEffect(() => {
    if (current) {
      setForm((f) => ({
        ...f,
        phone_number_id: current.phone_number_id,
        business_account_id: current.business_account_id,
        template_name: current.template_name,
        template_language: current.template_language,
      }));
    }
  }, [current]);

  if (connection.isPending) return <LoadingState />;
  if (connection.isError) return <ErrorState message={connection.error.message} onRetry={() => void connection.refetch()} />;

  const error = save.error instanceof ApiError ? save.error : null;
  const set = (key: keyof SaveWhatsAppBody) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  const active = current?.status === 'active';

  return (
    <>
      <PageHeader
        title="WhatsApp"
        subtitle="Send bills from your own WhatsApp Business number, using your Meta app."
        badge={current ? <WhatsAppStatusBadge status={current.status} /> : <Badge>Not connected</Badge>}
      />

      <div className="flex flex-wrap items-start gap-6">
        <Card id="credentials" title={current ? 'Update connection' : 'Connect WhatsApp'} className="min-w-0 flex-[3_1_480px] gap-4">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                ...form,
                // Empty = keep the stored secret.
                access_token: form.access_token || undefined,
                app_secret: form.app_secret || undefined,
              });
            }}
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <TextField label="Phone number ID" required inputMode="numeric" value={form.phone_number_id} onChange={set('phone_number_id')} error={error?.field('phone_number_id')} disabled={!canEdit} />
              <TextField label="WhatsApp Business Account ID" required inputMode="numeric" value={form.business_account_id} onChange={set('business_account_id')} error={error?.field('business_account_id')} disabled={!canEdit} />
            </div>
            <TextField
              label="Access token"
              type="password"
              autoComplete="off"
              required={!current}
              value={form.access_token}
              onChange={set('access_token')}
              hint={current ? 'Leave empty to keep the saved token.' : 'A permanent System User token with whatsapp_business_messaging.'}
              error={error?.field('access_token')}
              disabled={!canEdit}
            />
            <TextField
              label="App secret"
              type="password"
              autoComplete="off"
              required={!current}
              value={form.app_secret}
              onChange={set('app_secret')}
              hint={current ? 'Leave empty to keep the saved secret.' : 'Meta app → App settings → Basic.'}
              error={error?.field('app_secret')}
              disabled={!canEdit}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Template name" value={form.template_name} onChange={set('template_name')} error={error?.field('template_name')} disabled={!canEdit} />
              <TextField label="Language" value={form.template_language} onChange={set('template_language')} error={error?.field('template_language')} disabled={!canEdit} />
            </div>
            {save.isSuccess && <Notice tone="success">Saved. Meta accepted the credentials.</Notice>}
            {error && Object.keys(error.errors).length === 0 && <Notice tone="danger">{error.message}</Notice>}
            {canEdit && (
              <div className="flex flex-wrap gap-2.5">
                <Button type="submit" variant="primary" disabled={save.isPending}>
                  {save.isPending ? 'Checking with Meta…' : current ? 'Save' : 'Connect'}
                </Button>
                {active && (
                  <Button type="button" variant="danger-outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
                    Disconnect
                  </Button>
                )}
              </div>
            )}
          </form>
        </Card>

        {current && (
          <Card id="meta" title="Paste into Meta" description="WhatsApp → Configuration → Webhook, field “messages”." className="min-w-0 flex-[1_1_320px] gap-3">
            <dl className="m-0 flex flex-col gap-3 text-sm">
              <Detail label="Number">{current.display_phone_number ?? '—'}{current.verified_name && ` · ${current.verified_name}`}</Detail>
              <Detail label="Callback URL" copy={current.webhook_url} />
              <Detail label="Verify token" copy={current.webhook_verify_token} />
              {current.verified_at && <Detail label="Checked">{formatDateTime(current.verified_at)}</Detail>}
            </dl>
          </Card>
        )}
      </div>
    </>
  );
}

function Detail({ label, copy, children }: { label: string; copy?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 flex items-center justify-between gap-2 break-all font-medium">
        {copy ?? children}
        {copy && (
          <Button
            type="button"
            size="md"
            variant="ghost"
            onClick={() =>
              void navigator.clipboard.writeText(copy).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
            }
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </dd>
    </div>
  );
}
