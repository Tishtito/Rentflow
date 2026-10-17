import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { EyeIcon, PencilIcon, TrashIcon } from '../icons';
import { RowActions, actionsColumn, visibleActions, type RowAction } from './RowActions';

const render = (actions: RowAction[]) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <RowActions actions={actions} />
    </MemoryRouter>,
  );

describe('RowActions', () => {
  it('links "view" to the same place as the row name, labels every icon, skips hidden ones', () => {
    const html = render([
      { label: 'View Kims Apartments', icon: EyeIcon, to: '/admin/properties/1' },
      { label: 'Edit Kims Apartments', icon: PencilIcon, onClick: () => {} },
      { label: 'Remove', icon: TrashIcon, hidden: true },
    ]);

    expect(html).toContain('href="/admin/properties/1"');
    expect(html).toContain('aria-label="View Kims Apartments"');
    expect(html).toContain('title="Edit Kims Apartments"');
    expect(html).not.toContain('Remove');
  });

  it('renders nothing when every action is hidden, and shows the confirm text when pending', () => {
    expect(render([{ label: 'Edit', icon: PencilIcon, hidden: true }])).toBe('');
    expect(render([{ label: 'Remove', icon: TrashIcon, pending: 'Click again' }])).toContain('Click again');
  });

  it('builds a right-aligned column whose cell runs the row callback', () => {
    const onClick = vi.fn();
    const col = actionsColumn<{ id: number }>((row) => [{ label: `Edit ${row.id}`, icon: PencilIcon, onClick }]);
    expect([col.key, col.align, col.hideHeader]).toEqual(['actions', 'right', true]);
    expect(visibleActions([{ label: 'a', icon: EyeIcon }, { label: 'b', icon: EyeIcon, hidden: true }])).toHaveLength(1);
  });
});
