import assert from 'node:assert/strict';
import test from 'node:test';

import { SourceUrlError, normalizeSourceUrl } from './source-url.mjs';

test('normalizes a public hostname to HTTPS', () => {
  assert.deepEqual(normalizeSourceUrl('www.example.com/path'), {
    hostname: 'example.com',
    url: 'https://www.example.com/path',
  });
});

test('keeps an explicit HTTP URL', () => {
  assert.deepEqual(normalizeSourceUrl('http://example.com'), {
    hostname: 'example.com',
    url: 'http://example.com/',
  });
});

test('rejects non-web protocols', () => {
  assert.throws(
    () => normalizeSourceUrl('file:///etc/passwd'),
    (error) => error instanceof SourceUrlError && error.code === 'unsupported_protocol',
  );
});

test('rejects credentials embedded in a URL', () => {
  assert.throws(
    () => normalizeSourceUrl('https://admin:secret@example.com'),
    (error) => error instanceof SourceUrlError && error.code === 'credentials_not_allowed',
  );
});

for (const value of [
  'http://localhost:3000',
  'http://127.0.0.1',
  'http://10.0.0.8',
  'http://172.16.4.2',
  'http://192.168.1.20',
  'http://169.254.2.3',
  'http://[::1]',
  'http://printer.local',
]) {
  test(`rejects a private source URL: ${value}`, () => {
    assert.throws(
      () => normalizeSourceUrl(value),
      (error) => error instanceof SourceUrlError && error.code === 'private_host',
    );
  });
}
