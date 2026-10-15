import { useState } from 'react';
import { ApiError, useAdminUser, useBillingRuns, useStartBillingRun } from '@rentflow/api';
import { BillingRunsTable, Button, Card, ErrorState, LoadingState, Notice, PageHeader, TextField } from '@rentflow/ui';

/**
 * Billing runs (GET/POST /api/admin/billing-runs). Charge rates and the cycle settings are
 * designed (ChargeRateCard, RateHistoryTable) and are wired up when their API exists.
 */
export function BillingSettingsPage() {
  const user = useAdminUser().data;
  const runs = useBillingRuns();
  const start = useStartBillingRun();
  const [runDate, setRunDate] = useState('');
  const canRun = user?.role === 'landlord';
  const error = start.error instanceof ApiError ? start.error : null;

  return (
    <>
      <PageHeader
        title="Billing settings"
        subtitle="Bills are made automatically every day at 06:00 for leases whose 30-day cycle has ended. Bills already sent never change."
      />

      <div className="flex flex-wrap items-start gap-6">
        <Card id="runs" title="Billing runs" description="Each run lists how many bills it made and which leases it skipped." padded={false} className="min-w-0 flex-[3_1_560px]">
          {runs.isPending ? (
            <LoadingState />
          ) : runs.isError ? (
            <ErrorState className="m-4" message={runs.error.message} onRetry={() => void runs.refetch()} />
          ) : (
            <BillingRunsTable runs={runs.data.data} />
          )}
        </Card>

        {canRun && (
          <Card id="run-now" title="Run billing now" description="Safe to repeat: leases already billed for the period are skipped." className="min-w-0 flex-[1_1_320px] gap-4">
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                start.mutate(runDate ? { run_date: runDate } : {});
              }}
            >
              <TextField
                label="Bill as of"
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                hint="Leave empty for today."
                error={error?.field('run_date')}
              />
              {start.isSuccess && <Notice tone="success">Billing run started. It shows in the list when it finishes.</Notice>}
              {error && !error.field('run_date') && <Notice tone="danger">{error.message}</Notice>}
              <Button type="submit" variant="primary" disabled={start.isPending}>
                {start.isPending ? 'Starting…' : 'Run billing'}
              </Button>
            </form>
          </Card>
        )}
      </div>

      <Card id="charges" title="Charges & cycle">
        <span className="text-sm text-muted">Changing rates and the billing cycle from here is coming soon.</span>
      </Card>
    </>
  );
}
