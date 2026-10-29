import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MessagesNotice } from './Feedback';

describe('MessagesNotice', () => {
  it('lists each channel and turns amber when one was skipped', () => {
    const html = renderToStaticMarkup(
      <MessagesNotice
        title="Invitation sent"
        messages={[
          { channel: 'email', to: 'jane@rentflow.test', sending: true, note: null },
          { channel: 'whatsapp', to: null, sending: false, note: "WhatsApp isn't connected." },
        ]}
      />,
    );
    expect(html).toContain('Email to jane@rentflow.test');
    expect(html).toContain('WhatsApp not sent: WhatsApp isn&#x27;t connected.');
    expect(html).toContain('bg-warn-soft');
  });

  it('is green when everything goes out, with counts for resend-all', () => {
    const html = renderToStaticMarkup(<MessagesNotice title="Resent" messages={[{ channel: 'whatsapp', count: 3, sending: true }]} />);
    expect(html).toContain('3 by WhatsApp');
    expect(html).toContain('bg-brand-soft');
  });
});
