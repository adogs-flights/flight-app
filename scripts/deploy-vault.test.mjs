import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

for (const failure of ['', 'reload', 'migration']) {
  test(`Vault deployment preserves running app until prerequisites succeed: ${failure || 'success'}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'flight-deploy-test-'));
    const trace = join(directory, 'trace');
    try {
      for (const command of ['getent', 'docker', 'sudo', 'curl']) {
        await writeFile(join(directory, command), `#!/bin/bash
printf '%s %s\\n' '${command}' "$*" >> "$TRACE"
if [[ '${command}' == getent ]]; then echo 'flight-runtime:x:900:'; fi
if [[ "$FAIL_AT" == reload && "$*" == *'reload flight-secrets.service'* ]]; then exit 1; fi
if [[ "$FAIL_AT" == migration && "$*" == *'migrate-flight.mjs'* ]]; then exit 1; fi
exit 0
`, { mode: 0o700 });
      }
      const result = spawnSync('bash', [resolve('scripts/deploy-vault.sh'), 'a'.repeat(40)], {
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, TRACE: trace, FAIL_AT: failure }, encoding: 'utf8', timeout: 5000,
      });
      const calls = await readFile(trace, 'utf8');
      assert.equal(result.status, failure ? 1 : 0);
      assert(!calls.includes('restart flight-secrets'));
      if (failure) {
        assert(!calls.includes('stop flight-runtime'));
        assert(!calls.includes('compose up'));
      } else {
        assert(calls.indexOf('migrate-flight.mjs') < calls.indexOf('stop flight-runtime'));
        assert(calls.includes('/api/static/airlines'));
      }
    } finally { await rm(directory, {recursive:true,force:true}); }
  });
}
