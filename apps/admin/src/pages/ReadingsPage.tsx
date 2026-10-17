import { useEffect, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { ApiError, RequireAuth, useAdminUser, useCan, useProperties, useReadingTasks, useSaveReadings } from '@rentflow/api';
import { readingErrorsByMeter, type MeterReadingTask } from '@rentflow/core';
import {
  Button,
  CaretakerHeader,
  Card,
  ErrorState,
  FilterChips,
  LoadingState,
  MeterReadingCard,
  Notice,
  PageHeader,
  ProgressBar,
  ReadingTaskLink,
  ReadingsTable,
  SearchInput,
  SegmentedControl,
  SelectField,
  TextField,
} from '@rentflow/ui';
import { MeterHistoryPanel } from '../panels/MeterHistoryPanel';
import { roleLabel } from '../session';

/**
 * /admin/readings: a table of every meter to read (desktop), or one unit at a time (`/admin/readings/:unitId`,
 * and the caretaker phone screen).
 */
export function ReadingsPage() {
  const unitParam = useParams().unitId;
  const [mode, setMode] = useState<'table' | 'cards'>(unitParam ? 'cards' : 'table');
  useEffect(() => {
    if (unitParam) setMode('cards');
  }, [unitParam]);

  const toggle = (
    <SegmentedControl<'table' | 'cards'>
      legend="View"
      name="readings-view"
      value={mode}
      onChange={setMode}
      options={[
        { value: 'table', label: 'Table' },
        { value: 'cards', label: 'One by one' },
      ]}
    />
  );

  return mode === 'table' ? <ReadingsTableView toggle={toggle} /> : <ReadingsScreen toggle={toggle} />;
}

type Due = '7' | '31' | 'all';

/** Every meter in one table: reading date, filters, type the readings, save them all at once. */
function ReadingsTableView({ toggle }: { toggle: React.ReactNode }) {
  const navigate = useNavigate();
  const canRecord = useCan()('readings.record');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  const [readingDate, setReadingDate] = useState(today);
  const [due, setDue] = useState<Due>('31');
  const [propertyId, setPropertyId] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [values, setValues] = useState<Record<number, string>>({});
  const [history, setHistory] = useState<{ meterId: number; title: string } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const properties = useProperties();
  const tasks = useReadingTasks({
    days: due === 'all' ? 'all' : Number(due),
    property_id: propertyId ? Number(propertyId) : null,
    search: debounced || undefined,
  });
  const save = useSaveReadings();

  const filled = Object.entries(values).filter(([, v]) => v.trim() !== '');
  const sentIds = save.variables?.readings.map((r) => r.meter_id) ?? [];
  const errors = save.error instanceof ApiError ? readingErrorsByMeter(sentIds, (k) => (save.error as ApiError).field(k)) : {};
  const topError =
    save.error && !(save.error instanceof ApiError)
      ? "Can't reach the server. Try again."
      : save.error instanceof ApiError && Object.keys(errors).length === 0
        ? save.error.message
        : null;

  // Don't lose typed readings by leaving the page.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => filled.length > 0 && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(`You have ${filled.length} unsaved reading${filled.length === 1 ? '' : 's'}. Leave anyway?`)) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, filled.length]);

  const all = tasks.data?.data ?? [];
  const total = tasks.data?.meta.total ?? 0;
  const doneCount = tasks.data?.meta.done ?? 0;

  return (
    <>
      <PageHeader
        title="Meter readings"
        subtitle={total ? `${doneCount} of ${total} units have readings for their next bill` : 'Read the meters before each billing day.'}
        actions={toggle}
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-end gap-4 px-4 pb-2 pt-4">
          <TextField
            label="Meters read on"
            type="date"
            max={today}
            value={readingDate}
            onChange={(e) => setReadingDate(e.target.value)}
            hint="A bill uses the latest reading on or before its billing day"
            className="w-full sm:w-[220px]"
          />
          <SelectField
            label="Property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            options={[
              { value: '', label: 'All properties' },
              ...(properties.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
            ]}
            className="w-full sm:w-[200px]"
          />
          <SearchInput
            label="Search"
            placeholder="Unit or tenant"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-[240px]"
          />
        </div>
        <div className="px-4 pb-2">
          <FilterChips<Due>
            label="Show"
            value={due}
            onChange={setDue}
            options={[
              { value: '7', label: 'Bills in the next 7 days' },
              { value: '31', label: 'Next 31 days' },
              { value: 'all', label: 'All units' },
            ]}
          />
        </div>
        {saved && (
          <Notice className="mx-4 mb-2" tone="success">
            {saved}
          </Notice>
        )}
        {topError && (
          <Notice className="mx-4 mb-2" tone="danger">
            {topError}
          </Notice>
        )}
        {tasks.isPending ? (
          <LoadingState />
        ) : tasks.isError ? (
          <ErrorState className="m-4" message={tasks.error.message} onRetry={() => void tasks.refetch()} />
        ) : all.length === 0 ? (
          <Notice className="m-4" tone="info">
            {due === 'all'
              ? 'No occupied units with meters yet. Fit meters from a property page (Set up meters).'
              : 'No bills with meters in this window. Choose "All units" to read any meter.'}
          </Notice>
        ) : (
          <ReadingsTable
            tasks={all}
            values={values}
            readingDate={readingDate}
            errors={errors}
            onChange={(id, v) => {
              setSaved(null);
              setValues((x) => ({ ...x, [id]: v }));
            }}
            onHistory={(m, t) => setHistory({ meterId: m.meter_id, title: `${m.label} · ${t.unit_number}` })}
            onOpenUnit={(t) => navigate(`/admin/readings/${t.unit_id}`)}
          />
        )}
        {canRecord && all.length > 0 && (
          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            <span className="text-sm text-muted">
              {filled.length
                ? `${filled.length} reading${filled.length === 1 ? '' : 's'} to save, dated ${readingDate}`
                : 'Type the new readings, then save them together.'}
            </span>
            <Button
              variant="primary"
              disabled={filled.length === 0 || save.isPending}
              onClick={() =>
                save.mutate(
                  {
                    reading_date: readingDate,
                    readings: filled.map(([id, reading]) => ({ meter_id: Number(id), reading: reading.trim() })),
                  },
                  {
                    onSuccess: () => {
                      setSaved(`${filled.length} reading${filled.length === 1 ? '' : 's'} saved.`);
                      setValues({});
                    },
                  },
                )
              }
            >
              {save.isPending ? 'Saving…' : `Save ${filled.length || ''} reading${filled.length === 1 ? '' : 's'}`.replace('  ', ' ')}
            </Button>
          </div>
        )}
      </Card>
      {history && (
        <MeterHistoryPanel key={history.meterId} meterId={history.meterId} title={history.title} onClose={() => setHistory(null)} />
      )}
    </>
  );
}

/** One unit at a time (bills due in the next 7 days). Desktop "One by one"; `mobile` = the caretaker phone screen. */
export function ReadingsScreen({ mobile = false, toggle }: { mobile?: boolean; toggle?: React.ReactNode }) {
  const base = mobile ? '/caretaker/readings' : '/admin/readings';
  const unitParam = Number(useParams().unitId) || null;
  const navigate = useNavigate();
  const user = useAdminUser().data;
  const tasks = useReadingTasks({ days: 7 });
  const save = useSaveReadings();
  const [view, setView] = useState<'todo' | 'done'>('todo');
  const [saved, setSaved] = useState<string | null>(null);

  const all = tasks.data?.data ?? [];
  const todo = all.filter((t) => !t.done);
  const done = all.filter((t) => t.done);
  const shown = view === 'todo' ? todo : done;
  const active = (unitParam && all.find((t) => t.unit_id === unitParam)) || (view === 'todo' ? todo[0] : undefined);
  const rest = shown.filter((t) => t !== active);
  const total = tasks.data?.meta.total ?? 0;
  const doneCount = tasks.data?.meta.done ?? 0;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  // API errors come back as readings.N.reading, N = position in what we sent (the card's remaining meters).
  const errorsFor = (task: MeterReadingTask) => {
    if (!(save.error instanceof ApiError)) return undefined;
    // Only for the unit that was being saved (not the next one opened).
    const sentFor = save.variables?.readings[0]?.meter_id;
    if (!task.meters.some((m) => m.meter_id === sentFor)) return undefined;
    const remaining = task.meters.filter((m) => m.current_reading === null);
    const map: Record<number, string> = {};
    remaining.forEach((m, i) => {
      const msg = (save.error as ApiError).field(`readings.${i}.reading`);
      if (msg) map[m.meter_id] = msg;
    });
    return map;
  };

  const header = mobile ? (
    <CaretakerHeader
      title="Meter readings"
      subtitle="For bills due in the next 7 days"
      backTo="/admin"
      userLabel={user ? `${user.name.split(' ')[0]} · ${roleLabel(user)}` : undefined}
    >
      {total > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px]">
            <span>
              {doneCount} of {total} units done
            </span>
            <span className="num">{pct}%</span>
          </div>
          <ProgressBar value={pct} label="Units with readings captured" tone="dark" height={8} />
        </div>
      )}
    </CaretakerHeader>
  ) : (
    <PageHeader
      title="Meter readings"
      subtitle={
        total
          ? `${doneCount} of ${total} units ready for bills due in the next 7 days`
          : 'Readings needed for bills due in the next 7 days.'
      }
      actions={toggle}
    />
  );

  const body = tasks.isPending ? (
    <LoadingState />
  ) : tasks.isError ? (
    <ErrorState message={tasks.error.message} onRetry={() => void tasks.refetch()} />
  ) : total === 0 ? (
    <Notice tone="info">No bills with meters are due in the next 7 days.</Notice>
  ) : (
    <>
      <FilterChips
        label="Show"
        value={view}
        onChange={(v) => {
          setView(v);
          navigate(base, { replace: true });
        }}
        options={[
          { value: 'todo', label: 'To do', count: todo.length },
          { value: 'done', label: 'Done', count: done.length },
        ]}
      />
      {saved && <Notice tone="success">{saved}</Notice>}
      {active && (
        <MeterReadingCard
          key={active.unit_id}
          task={active}
          saving={save.isPending}
          errors={errorsFor(active)}
          onSave={(readings) =>
            save.mutate(
              { readings },
              {
                onSuccess: () => {
                  setSaved(`House ${active.unit_number} saved.`);
                  const next = todo.find((t) => t.unit_id !== active.unit_id);
                  navigate(next ? `${base}/${next.unit_id}` : base, { replace: true });
                },
              },
            )
          }
        />
      )}
      {rest.map((t) => (
        <ReadingTaskLink key={t.unit_id} task={t} to={`${base}/${t.unit_id}`} />
      ))}
      {view === 'todo' && todo.length === 0 && <Notice tone="success">All readings captured. Bills can go out.</Notice>}
      <p className="mt-1 text-center text-[13px] text-muted">
        Units still missing a reading when their bill is due are skipped and flagged to the landlord.
      </p>
    </>
  );

  if (mobile) {
    return (
      <div className="mx-auto min-h-screen max-w-[480px] bg-canvas">
        {header}
        <div className="flex flex-col gap-3 p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">{body}</div>
      </div>
    );
  }

  return (
    <>
      {header}
      <div className="flex max-w-[640px] flex-col gap-3">{body}</div>
    </>
  );
}

/** /caretaker/readings: the phone screen, without the admin sidebar. */
export function CaretakerReadingsPage() {
  const session = useAdminUser();
  return (
    <RequireAuth session={session} loginPath="/login" fallback={<LoadingState className="min-h-screen" />}>
      <ReadingsScreen mobile />
    </RequireAuth>
  );
}
