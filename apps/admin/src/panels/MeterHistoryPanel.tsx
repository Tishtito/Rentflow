import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, useCan, useCorrectReading, useMeterReadings } from '@rentflow/api';
import { formatDate, formatQuantity, type MeterReadingEntry } from '@rentflow/core';
import { Badge, Button, DataTable, ErrorState, LoadingState, Notice, PencilIcon, SidePanel, actionsColumn } from '@rentflow/ui';

/** One meter's readings: which bill used each, and a fix for a mistyped one that isn't billed yet. */
export function MeterHistoryPanel({ meterId, title, onClose }: { meterId: number; title: string; onClose: () => void }) {
  const history = useMeterReadings(meterId);
  const correct = useCorrectReading();
  const canRecord = useCan()('readings.record');
  const [editing, setEditing] = useState<{ id: number; value: string } | null>(null);
  const error =
    correct.error instanceof ApiError
      ? (correct.error.field('reading') ?? correct.error.message)
      : correct.error
        ? "Can't reach the server."
        : null;

  return (
    <SidePanel title={title} subtitle="Reading history" onClose={onClose}>
      {history.isPending ? (
        <LoadingState />
      ) : history.isError ? (
        <ErrorState message={history.error.message} onRetry={() => void history.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          {error && <Notice tone="danger">{error}</Notice>}
          {correct.isSuccess && !editing && <Notice tone="success">Reading corrected.</Notice>}
          <DataTable<MeterReadingEntry>
            caption="Readings"
            rows={history.data}
            rowKey={(r) => r.id}
            empty="No readings yet."
            columns={[
              {
                key: 'date',
                header: 'Date',
                cell: (r) => <span className="whitespace-nowrap">{formatDate(r.reading_date, { year: true })}</span>,
              },
              {
                key: 'reading',
                header: 'Reading',
                align: 'right',
                numeric: true,
                cell: (r) =>
                  editing?.id === r.id ? (
                    <form
                      className="flex items-center justify-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        correct.mutate({ id: r.id, reading: editing.value }, { onSuccess: () => setEditing(null) });
                      }}
                    >
                      <label className="sr-only" htmlFor={`fix-${r.id}`}>
                        Correct reading
                      </label>
                      <input
                        id={`fix-${r.id}`}
                        autoFocus
                        inputMode="decimal"
                        value={editing.value}
                        onChange={(e) => setEditing({ id: r.id, value: e.target.value })}
                        className="num min-h-touch w-[100px] rounded-md border border-line-strong px-2 text-right text-sm"
                      />
                      <Button size="md" type="submit" disabled={correct.isPending}>
                        Save
                      </Button>
                    </form>
                  ) : (
                    formatQuantity(r.reading)
                  ),
              },
              {
                key: 'bill',
                header: 'On bill',
                cell: (r) =>
                  r.invoice ? (
                    <Link to={`/admin/bills/${r.invoice.id}`}>{r.invoice.invoice_number}</Link>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      <Badge>Not billed yet</Badge>
                      {r.is_estimated && <Badge tone="warn">Estimated</Badge>}
                    </span>
                  ),
              },
              { key: 'by', header: 'By', cell: (r) => r.recorded_by ?? <span className="text-muted">—</span> },
              actionsColumn<MeterReadingEntry>((r) => [
                {
                  label: `Correct the reading of ${formatDate(r.reading_date)}`,
                  icon: PencilIcon,
                  onClick: () => {
                    correct.reset();
                    setEditing({ id: r.id, value: r.reading.replace(/\.00$/, '') });
                  },
                  hidden: !canRecord || !r.editable || editing?.id === r.id,
                },
              ]),
            ]}
          />
          <p className="m-0 text-xs text-muted">
            Readings on a bill can&apos;t change (bills never change). A correction must stay between the readings before and after it.
          </p>
        </div>
      )}
    </SidePanel>
  );
}
