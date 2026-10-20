import { describe, expect, it } from 'vitest';
import { installMode, isIosDevice } from './pwa';

const base = { native: false, standalone: false, dismissed: false, hasPromptEvent: false, ios: false };

describe('installMode', () => {
  it('offers the browser install when it gave us the prompt', () => {
    expect(installMode({ ...base, hasPromptEvent: true })).toBe('install');
  });

  it('shows the Add to Home Screen steps on iPhone / iPad', () => {
    expect(installMode({ ...base, ios: true })).toBe('ios');
  });

  it('offers nothing in browsers that cannot install from a button', () => {
    expect(installMode(base)).toBeNull();
  });

  it('never shows inside the apps, once installed, or after Not now', () => {
    for (const hidden of [{ native: true }, { standalone: true }, { dismissed: true }]) {
      expect(installMode({ ...base, hasPromptEvent: true, ios: true, ...hidden })).toBeNull();
    }
  });
});

describe('isIosDevice', () => {
  it('detects iPhone and iPad, including iPadOS desktop-mode user agents', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15', 5)).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5)).toBe(true);
  });

  it('does not treat a Mac or Android phone as iOS', () => {
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 0)).toBe(false);
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile', 5)).toBe(false);
  });
});
