import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { EyeIcon } from '../icons';
import { backTarget } from './BackButton';
import { DataTable, cardLayout, type Column } from './DataTable';
import { actionsColumn } from './RowActions';

type Row = { id: number; name: string; town: string; secret: string };
const columns: Column<Row>[] = [
  { key: 'name', header: 'Property', cell: (r) => r.name },
  { key: 'town', header: 'Town', cell: (r) => r.town },
  { key: 'secret', header: 'Internal', cell: (r) => r.secret, hideOnCard: true },
  actionsColumn<Row>((r) => [{ label: `View ${r.name}`, icon: EyeIcon, to: `/p/${r.id}` }]),
];

const render = (rows: Row[]) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <DataTable caption="Properties" columns={columns} rows={rows} rowKey={(r) => r.id} empty="None yet." />
    </MemoryRouter>,
  );

describe('DataTable on phones', () => {
  it('renders the table (md and up) and a card per row (phones)', () => {
    const html = render([{ id: 1, name: 'Kims Apartments', town: 'Kikuyu', secret: 'x1' }]);
    expect(html).toContain('<table');
    expect(html).toContain('<ul aria-label="Properties"');
    // The card: title, a labelled field, the action; hidden column only in the table.
    const card = html.slice(html.indexOf('<ul'));
    expect(card).toContain('Kims Apartments');
    expect(card).toMatch(/<dt[^>]*>Town<\/dt><dd[^>]*>Kikuyu<\/dd>/);
    expect(card).toContain('aria-label="View Kims Apartments"');
    expect(card).not.toContain('x1');
    expect(html.slice(0, html.indexOf('<ul'))).toContain('x1');
  });

  it('shows the empty message in both views', () => {
    const html = render([]);
    expect(html.match(/None yet\./g)).toHaveLength(2);
  });

  it('uses cardTitle when given', () => {
    const { title, fields, actions } = cardLayout<Row>([{ ...columns[0]! }, { ...columns[1]!, cardTitle: true }, columns[3]!]);
    expect(title?.key).toBe('town');
    expect(fields.map((f) => f.key)).toEqual(['name']);
    expect(actions?.key).toBe('actions');
  });
});

describe('backTarget', () => {
  it('goes back in history when there is an earlier page, else to the fallback, else nowhere', () => {
    expect(backTarget(3, '/admin/bills')).toBe('history');
    expect(backTarget(0, '/admin/bills')).toBe('/admin/bills');
    expect(backTarget(undefined, undefined)).toBeNull();
    expect(backTarget(0, false)).toBeNull();
  });
});
