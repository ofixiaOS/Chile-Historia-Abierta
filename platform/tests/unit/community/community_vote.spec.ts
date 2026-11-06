import CastVoteService from '#modules/community/application/cast_vote_service'
import { validateVoteParams } from '#modules/community/domain/community_vote'
import InMemoryCommunityRepository from '#modules/community/infrastructure/in_memory_community_repository'
import { test } from '@japa/runner'

test.group('Community Votes & Epistemic Invariant (Unit)', () => {
  test('rejects unknown voteType or invalid targetType', ({ assert }) => {
    assert.throws(
      () =>
        validateVoteParams({
          targetType: 'invalid_target',
          targetId: 'pub_1',
          userId: 'usr_1',
          voteType: 'relevante',
        }),
      /Tipo de destino inválido para voto/
    )

    assert.throws(
      () =>
        validateVoteParams({
          targetType: 'publication',
          targetId: 'pub_1',
          userId: 'usr_1',
          voteType: 'upvote_magico',
        }),
      /Tipo de reacción comunitaria inválida/
    )
  })

  test('records reactions and computes tallies accurately', async ({ assert }) => {
    const repository = new InMemoryCommunityRepository()
    const service = new CastVoteService(repository)

    await service.execute({
      targetType: 'publication',
      targetId: 'pub_1',
      userId: 'usr_1',
      voteType: 'relevante',
    })

    await service.execute({
      targetType: 'publication',
      targetId: 'pub_1',
      userId: 'usr_2',
      voteType: 'relevante',
    })

    await service.execute({
      targetType: 'publication',
      targetId: 'pub_1',
      userId: 'usr_3',
      voteType: 'metodologia_rigurosa',
    })

    const tally = await service.execute({
      targetType: 'publication',
      targetId: 'pub_1',
      userId: 'usr_4',
      voteType: 'discrepo_con_evidencia',
    })

    assert.equal(tally.relevante, 2)
    assert.equal(tally.metodologiaRigurosa, 1)
    assert.equal(tally.requiereRevision, 0)
    assert.equal(tally.discrepoConEvidencia, 1)
    assert.equal(tally.totalVotes, 4)
  })

  test('updates reaction if the same user votes with a different reaction', async ({ assert }) => {
    const repository = new InMemoryCommunityRepository()
    const service = new CastVoteService(repository)

    await service.execute({
      targetType: 'publication',
      targetId: 'pub_2',
      userId: 'usr_1',
      voteType: 'relevante',
    })

    const updatedTally = await service.execute({
      targetType: 'publication',
      targetId: 'pub_2',
      userId: 'usr_1',
      voteType: 'requiere_revision',
    })

    assert.equal(updatedTally.relevante, 0)
    assert.equal(updatedTally.requiereRevision, 1)
    assert.equal(updatedTally.totalVotes, 1)
  })

  test('Principio 12: Votos comunitarios nunca mutan el estado de evidencia', async ({
    assert,
  }) => {
    const repository = new InMemoryCommunityRepository()
    const service = new CastVoteService(repository)

    const tally = await service.execute({
      targetType: 'publication',
      targetId: 'pub_3',
      userId: 'usr_brigade_1',
      voteType: 'relevante',
    })

    assert.isFalse('evidenceStatus' in tally)
    assert.isFalse('editorialStatus' in tally)
  })
})
