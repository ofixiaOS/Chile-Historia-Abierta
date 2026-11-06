import PostgresReleaseService from '#modules/releases/infrastructure/postgres_release_service'
import { test } from '@japa/runner'

test.group('Production release write gate', () => {
  test('rejects review, staging, approval, and activation before PostgreSQL access', async ({
    assert,
  }) => {
    const service = new PostgresReleaseService('production')
    const rejection = /proceso escritor autorizado/

    await assert.rejects(() => service.stage({}), rejection)
    await assert.rejects(
      () =>
        service.recordSourceReview({
          bundle: {},
          decision: 'approved_for_pilot',
          reviewer: 'Reviewer One',
          sourceConfirmed: true,
          rightsConfirmed: true,
          rightsEvidenceUrl: 'https://example.invalid/terms',
          rightsSummary: 'Terms reviewed for exact local sample.',
        }),
      rejection
    )
    await assert.rejects(
      () =>
        service.approve({
          dataVersion: 'v1',
          bundleHash: 'hash',
          reviewer: 'Reviewer Two',
          sourceConfirmed: true,
          rightsConfirmed: true,
        }),
      rejection
    )
    await assert.rejects(() => service.activate('v1', 'hash'), rejection)
  })
})
