import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, useCan, useFitMeters, useMeterSetup, useProperty } from '@rentflow/api';
import { formatQuantity, type MeterSetup } from '@rentflow/core';
import { Badge, Button, ButtonLink, Card, ErrorState, LoadingState, Notice, PageHeader } from '@rentflow/ui';

type Cell = { meter_number: string; initial_reading: string };
const key = (unitId: number, code: string) => `${unitId}:${code}`;

/**
 * /admin/properties/:id/meters: every unit × metered charge on one screen. Type each meter's number and
 * today's reading, save them all at once. Usage is billed from these readings.
 */
export function MeterSetupPage() {
  const id = Number(useParams().propertyId);
  const property = useProperty(id);
  const setup = useMeterSetup(id);
  const fit = useFitMeters();
  const canEdit = useCan()('properties.manage');
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [saved, setSaved] = useState<string | null>(null);

  if (setup.isPending || property.isPending) return <LoadingState />;
  if (setup.isError) return <ErrorState message={setup.error.message} onRetry={() => void setup.refetch()} />;
  const s: MeterSetup = setup.data;
  const name = property.data?.name ?? 'Property';

  // Rows to send = cells with a reading; remember their order to map meters.N errors back.
  const rows = Object.entries(cells)
    .filter(([, c]) => c.initial_reading.trim() !== '')
    .map(([k, c]) => {
      const [unitId, code] = k.split(':');
      return {
        unit_id: Number(unitId),
        charge_code: code!,
        meter_number: c.meter_number.trim() || null,
        initial_reading: c.initial_reading.trim(),
      };
    });
  const sent = fit.variables?.meters ?? [];
  const errorFor = (unitId: number, code: string, field: 'initial_reading' | 'meter_number' | 'charge_code' | 'unit_id') => {
    if (!(fit.error instanceof ApiError)) return undefined;
    const i = sent.findIndex((r) => r.unit_id === unitId && r.charge_code === code);
    return i < 0 ? undefined : fit.error.field(`meters.${i}.${field}`);
  };
  const set = (unitId: number, code: string, patch: Partial<Cell>) => {
    setSaved(null);
    setCells((x) => ({ ...x, [key(unitId, code)]: { meter_number: '', initial_reading: '', ...x[key(unitId, code)], ...patch } }));
  };
  const input =
    'num min-h-touch w-full min-w-[96px] rounded-md border bg-surface px-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Properties', to: '/admin/properties' }, { label: name, to: `/admin/properties/${id}` }, { label: 'Meters' }]}
        title={`Meters · ${name}`}
        subtitle={
          s.charges.length
            ? `${s.missing} meter${s.missing === 1 ? '' : 's'} still to fit. Enter each meter's number and what it shows today.`
            : undefined
        }
        badge={s.charges.length > 0 && s.missing === 0 ? <Badge tone="success">All fitted</Badge> : undefined}
      />
      {s.charges.length === 0 ? (
        <Notice tone="info" title="No metered charges yet">
          Add electricity and/or water as <strong>metered</strong> prices first; then each unit gets a meter here.{' '}
          <Link to="/admin/settings/billing">Go to Billing settings</Link>
        </Notice>
      ) : s.units.length === 0 ? (
        <Notice tone="info">
          This property has no units yet. <Link to={`/admin/properties/${id}`}>Add units</Link> first.
        </Notice>
      ) : (
        <Card padded={false}>
          {saved && (
            <Notice className="m-4" tone="success">
              {saved}
            </Notice>
          )}
          {fit.error && !(fit.error instanceof ApiError) && (
            <Notice className="m-4" tone="danger">
              Can&apos;t reach the server. Try again.
            </Notice>
          )}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Meters per unit</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-[.04em] text-muted">
                  <th scope="col" rowSpan={2} className="border-b border-line-strong px-3 py-2 align-bottom font-medium">
                    Unit
                  </th>
                  {s.charges.map((c) => (
                    <th
                      key={c.charge_code}
                      scope="colgroup"
                      colSpan={2}
                      className="border-b border-line-soft px-3 pt-2 font-semibold text-ink"
                    >
                      {c.label}
                      {c.unit_of_measure && <span className="font-normal text-muted"> ({c.unit_of_measure})</span>}
                    </th>
                  ))}
                </tr>
                <tr className="text-left text-xs uppercase tracking-[.04em] text-muted">
                  {s.charges.map((c) => (
                    <FragmentHeads key={c.charge_code} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.units.map((u) => (
                  <tr key={u.unit_id} className="border-b border-line-soft">
                    <th scope="row" className="whitespace-nowrap px-3 py-2.5 text-left font-semibold">
                      {u.unit_number}
                      <span className="block text-xs font-normal capitalize text-muted">{u.status}</span>
                    </th>
                    {s.charges.map((c) => {
                      const fitted = u.meters[c.charge_code];
                      if (fitted) {
                        return (
                          <td key={c.charge_code} colSpan={2} className="px-3 py-2.5">
                            <span className="flex items-center gap-2">
                              <Badge tone="success">Fitted</Badge>
                              <span>
                                {fitted.meter_number ?? 'No number'} · from {formatQuantity(fitted.initial_reading)}
                              </span>
                            </span>
                          </td>
                        );
                      }
                      const cell = cells[key(u.unit_id, c.charge_code)] ?? { meter_number: '', initial_reading: '' };
                      const readingError =
                        errorFor(u.unit_id, c.charge_code, 'initial_reading') ??
                        errorFor(u.unit_id, c.charge_code, 'charge_code') ??
                        errorFor(u.unit_id, c.charge_code, 'unit_id');
                      const numberError = errorFor(u.unit_id, c.charge_code, 'meter_number');
                      return (
                        <Fragment key={c.charge_code}>
                          <td className="px-2 py-2">
                            <label className="sr-only" htmlFor={`num-${u.unit_id}-${c.charge_code}`}>
                              {c.label} meter number, {u.unit_number}
                            </label>
                            <input
                              id={`num-${u.unit_id}-${c.charge_code}`}
                              disabled={!canEdit}
                              placeholder="Optional"
                              value={cell.meter_number}
                              onChange={(e) => set(u.unit_id, c.charge_code, { meter_number: e.target.value })}
                              className={`${input} ${numberError ? 'border-danger-strong' : 'border-line-strong'}`}
                            />
                            {numberError && <span className="mt-1 block text-xs text-danger-strong">{numberError}</span>}
                          </td>
                          <td className="px-2 py-2">
                            <label className="sr-only" htmlFor={`read-${u.unit_id}-${c.charge_code}`}>
                              {c.label} reading today, {u.unit_number}
                            </label>
                            <input
                              id={`read-${u.unit_id}-${c.charge_code}`}
                              disabled={!canEdit}
                              inputMode="decimal"
                              placeholder="Reading"
                              value={cell.initial_reading}
                              onChange={(e) => set(u.unit_id, c.charge_code, { initial_reading: e.target.value })}
                              className={`${input} text-right ${readingError ? 'border-danger-strong' : 'border-line-strong'}`}
                            />
                            {readingError && <span className="mt-1 block max-w-[200px] text-xs text-danger-strong">{readingError}</span>}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: a card per unit. */}
          <ul aria-label="Meters per unit" className="m-0 flex list-none flex-col gap-3 p-3 md:hidden">
            {s.units.map((u) => (
              <li key={u.unit_id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="text-[15px] font-semibold">{u.unit_number}</strong>
                  <span className="text-xs capitalize text-muted">{u.status}</span>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {s.charges.map((c) => {
                    const fitted = u.meters[c.charge_code];
                    const heading = (
                      <span className="text-sm font-semibold">
                        {c.label}
                        {c.unit_of_measure && <span className="font-normal text-muted"> ({c.unit_of_measure})</span>}
                      </span>
                    );
                    if (fitted) {
                      return (
                        <div key={c.charge_code} className="flex flex-col gap-1 rounded-md bg-canvas p-3">
                          {heading}
                          <span className="flex items-center gap-2 text-sm">
                            <Badge tone="success">Fitted</Badge>
                            {fitted.meter_number ?? 'No number'} · from {formatQuantity(fitted.initial_reading)}
                          </span>
                        </div>
                      );
                    }
                    const cell = cells[key(u.unit_id, c.charge_code)] ?? { meter_number: '', initial_reading: '' };
                    const readingError =
                      errorFor(u.unit_id, c.charge_code, 'initial_reading') ??
                      errorFor(u.unit_id, c.charge_code, 'charge_code') ??
                      errorFor(u.unit_id, c.charge_code, 'unit_id');
                    const numberError = errorFor(u.unit_id, c.charge_code, 'meter_number');
                    return (
                      <div key={c.charge_code} className="flex flex-col gap-2 rounded-md bg-canvas p-3">
                        {heading}
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1 text-xs text-muted">
                            Meter number
                            <input
                              disabled={!canEdit}
                              placeholder="Optional"
                              value={cell.meter_number}
                              onChange={(e) => set(u.unit_id, c.charge_code, { meter_number: e.target.value })}
                              className={`${input} ${numberError ? 'border-danger-strong' : 'border-line-strong'}`}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-muted">
                            Reading today
                            <input
                              disabled={!canEdit}
                              inputMode="decimal"
                              placeholder="Reading"
                              value={cell.initial_reading}
                              onChange={(e) => set(u.unit_id, c.charge_code, { initial_reading: e.target.value })}
                              className={`${input} text-right ${readingError ? 'border-danger-strong' : 'border-line-strong'}`}
                            />
                          </label>
                        </div>
                        {(numberError || readingError) && <span className="text-xs text-danger-strong">{numberError ?? readingError}</span>}
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
          {canEdit && (
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
              <span className="text-sm text-muted">
                Rows with a reading are saved; leave a unit blank to do it later. Usage is billed from these readings.
              </span>
              <span className="flex gap-2">
                <ButtonLink to={`/admin/properties/${id}`}>Back to units</ButtonLink>
                <Button
                  variant="primary"
                  disabled={rows.length === 0 || fit.isPending}
                  onClick={() =>
                    fit.mutate(
                      { propertyId: id, meters: rows },
                      {
                        onSuccess: () => {
                          setSaved(`${rows.length} meter${rows.length === 1 ? '' : 's'} fitted.`);
                          setCells({});
                        },
                      },
                    )
                  }
                >
                  {fit.isPending ? 'Saving…' : rows.length ? `Save ${rows.length} meter${rows.length === 1 ? '' : 's'}` : 'Save meters'}
                </Button>
              </span>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function FragmentHeads() {
  return (
    <>
      <th scope="col" className="border-b border-line-strong px-3 pb-2 font-medium">
        Meter number
      </th>
      <th scope="col" className="border-b border-line-strong px-3 pb-2 text-right font-medium">
        Reading today
      </th>
    </>
  );
}
