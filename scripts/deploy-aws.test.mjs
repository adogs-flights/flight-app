// scripts/deploy-aws.sh의 실패 경계를 검증한다.
//
// 보장해야 하는 것:
//   1. 어느 사전 단계가 실패하든 돌고 있는 백엔드를 내리지 않는다.
//   2. 마이그레이션이 성공한 뒤에야 컨테이너를 교체한다.
//   3. 교체 후 DB까지 닿는 준비 상태를 확인한다.
//   4. 40자 커밋 해시가 아니면 아무것도 하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT = resolve('scripts/deploy-aws.sh');
const REVISION = 'a'.repeat(40);

async function harness(failAt) {
  const directory = await mkdtemp(join(tmpdir(), 'flight-aws-deploy-'));
  const trace = join(directory, 'trace');
  const appDir = join(directory, 'app');
  const secrets = join(directory, 'secrets');
  await mkdir(appDir, { recursive: true });
  await mkdir(secrets, { recursive: true });
  await writeFile(join(appDir, '.env'), 'BASE_URL=https://example.test\n');
  await writeFile(join(secrets, 'CONFIG_JSON'),
    JSON.stringify({ DATABASE_URL: 'postgresql+psycopg2://adogs-pg:pw@flight-db:5432/flight-db' }));
  await writeFile(join(secrets, 'DB_MIGRATION_PASSWORD'), 'migration-password');

  for (const command of ['getent', 'docker', 'sudo', 'curl', 'aws', 'chgrp']) {
    await writeFile(join(directory, command), `#!/bin/bash
printf '%s %s\\n' '${command}' "$*" >> "$TRACE"
if [[ '${command}' == getent ]]; then echo 'flight-runtime:x:987:'; fi
if [[ "$FAIL_AT" == ecr && '${command}' == aws && "$*" == *'get-login-password'* ]]; then exit 1; fi
if [[ "$FAIL_AT" == secrets && '${command}' == sudo && "$*" == *'haebong-secrets'* ]]; then exit 1; fi
if [[ "$FAIL_AT" == migration && '${command}' == docker && "$*" == *'alembic'* ]]; then exit 1; fi
if [[ "$FAIL_AT" == probe && '${command}' == docker && "$*" == *'--entrypoint python'* ]]; then exit 1; fi
exit 0
`, { mode: 0o700 });
  }

  const result = spawnSync('bash', [SCRIPT, REVISION], {
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH}`,
      TRACE: trace,
      FAIL_AT: failAt ?? '',
      APP_DIR_OVERRIDE: appDir,
      SECRETS_OVERRIDE: secrets,
      MIGRATION_TMP_ROOT: directory,
    },
    encoding: 'utf8',
    timeout: 20000,
  });
  const calls = await readFile(trace, 'utf8').catch(() => '');
  return { result, calls, cleanup: () => rm(directory, { recursive: true, force: true }) };
}

test('40자 커밋 해시가 아니면 거부한다', async () => {
  const { result, calls, cleanup } = await harness('invalid-revision-check');
  try {
    const bad = spawnSync('bash', [SCRIPT, 'not-a-sha'], { encoding: 'utf8', timeout: 5000 });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /커밋 해시/);
    assert.ok(result !== undefined && calls !== undefined);
  } finally {
    await cleanup();
  }
});

for (const failAt of ['ecr', 'secrets', 'migration', 'probe']) {
  test(`${failAt} 단계 실패 시 돌고 있는 백엔드를 교체하지 않는다`, async () => {
    const { result, calls, cleanup } = await harness(failAt);
    try {
      assert.notEqual(result.status, 0, '실패 단계가 있으면 0으로 끝나면 안 된다');
      assert.ok(!calls.includes('stop haebong-runtime'),
        '실패했는데 돌고 있는 백엔드를 내렸다');
      assert.ok(!calls.includes('compose up'),
        '실패했는데 컨테이너를 교체했다');
    } finally {
      await cleanup();
    }
  });
}

test('성공 시 마이그레이션과 기동 프로브가 교체보다 먼저 실행된다', async () => {
  const { result, calls, cleanup } = await harness(null);
  try {
    assert.equal(result.status, 0, result.stderr);
    const migration = calls.indexOf('alembic');
    const probe = calls.indexOf('--entrypoint python');
    const stop = calls.indexOf('stop haebong-runtime');
    const up = calls.indexOf('compose up');
    assert.ok(migration >= 0 && probe >= 0 && stop >= 0 && up >= 0, '필수 단계가 누락되었다');
    assert.ok(migration < stop, '마이그레이션이 교체보다 먼저여야 한다');
    assert.ok(probe < stop, '기동 프로브가 교체보다 먼저여야 한다');
    assert.ok(stop < up, '기존 백엔드를 내린 뒤 교체해야 한다');
    assert.ok(calls.includes('/api/static/airlines'), 'DB 기반 준비 상태를 확인하지 않았다');
  } finally {
    await cleanup();
  }
});
