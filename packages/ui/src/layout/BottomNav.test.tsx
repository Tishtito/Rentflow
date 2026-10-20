import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { landlordNav } from './AdminShell';
import { BottomNav, landlordTabs } from './BottomNav';

const render = (path: string, allowedTo = landlordNav.map((n) => n.to)) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav tabs={landlordTabs} allowed={landlordNav.filter((n) => allowedTo.includes(n.to))} />
    </MemoryRouter>,
  );

const link = (html: string, label: string) => html.match(new RegExp(`<a[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? '';

describe('BottomNav', () => {
  it('shows the five tabs with short labels and full names', () => {
    const html = render('/admin');
    for (const label of ['Properties &amp; units', 'Tenants', 'Dashboard', 'Meter readings', 'Bills']) {
      expect(link(html, label)).not.toBe('');
    }
    expect(html).toContain('>Meters<');
    expect(html).toContain('aria-label="Main navigation"');
  });

  it('marks the section of a nested page as current, and only that one', () => {
    const html = render('/admin/properties/5/meters');
    expect(link(html, 'Properties &amp; units')).toContain('aria-current="page"');
    expect(link(html, 'Dashboard')).not.toContain('aria-current');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it('marks Dashboard only on /admin itself', () => {
    expect(link(render('/admin'), 'Dashboard')).toContain('aria-current="page"');
    expect(link(render('/admin/bills/9'), 'Dashboard')).not.toContain('aria-current');
  });

  it('leaves out tabs the user may not open, keeping the raised button over the notch', () => {
    const html = render('/admin', ['/admin', '/admin/readings', '/admin/bills']);
    expect(link(html, 'Tenants')).toBe('');
    expect(html).toContain('<svg width="96"'); // the notch
    expect(html.match(/<li aria-hidden="true"/g)).toHaveLength(2); // empty slots
  });

  it('is a plain row without Dashboard, and absent with fewer than two tabs', () => {
    const plain = render('/admin/readings', ['/admin/readings', '/admin/bills']);
    expect(plain).not.toContain('<svg width="96"');
    expect(link(plain, 'Dashboard')).toBe('');
    expect(render('/admin/readings', ['/admin/readings'])).toBe('');
  });
});
