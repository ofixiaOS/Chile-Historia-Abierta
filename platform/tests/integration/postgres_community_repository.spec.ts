import type { CommentRecord } from '#modules/community/domain/comment'
import type { ContentReport } from '#modules/community/domain/moderation'
import PostgresCommunityRepository from '#modules/community/infrastructure/postgres_community_repository'
import type { PublicationRecord } from '#modules/publication/domain/publication'
import PostgresPublicationRepository from '#modules/publication/infrastructure/postgres_publication_repository'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

test.group('PostgresCommunityRepository (Integration PostgreSQL)', () => {
  async function createTestPublication(): Promise<string> {
    const pubRepo = new PostgresPublicationRepository('admin')
    const pubId = randomUUID()
    const revId = randomUUID()

    const publication: PublicationRecord = {
      id: pubId,
      type: 'dato',
      author: { id: 'usr_pub_author', displayName: 'Autor de Publicación' },
      conflictsOfInterest: [],
      forkedFromPublicationId: null,
      projectedAt: new Date().toISOString(),
      currentRevision: {
        id: revId,
        revisionNumber: 1,
        title: 'Publicación de prueba para comentarios',
        content: 'Contenido base sobre el que se estructurará la discusión comunitaria.',
        evidence: [{ description: 'Evidencia base' }],
        chartSpec: null,
        limitations: ['Unidad: CLP', 'Periodo: 2023'],
        warnings: [],
        publishedAt: new Date().toISOString(),
        supersedesRevisionId: null,
      },
    }

    await pubRepo.save(publication)
    return pubId
  }

  test('saves and lists comments for a publication using cha_public role', async ({ assert }) => {
    const pubId = await createTestPublication()
    const repository = new PostgresCommunityRepository('public')
    const commentId = randomUUID()
    const now = new Date().toISOString()

    const comment: CommentRecord = {
      id: commentId,
      publicationId: pubId,
      author: {
        id: 'usr_investigador_c1',
        displayName: 'Comentarista Académico',
      },
      commentType: 'aporte_evidencia',
      content:
        'Aporto serie complementaria de salarios reales para contextualizar el poder adquisitivo.',
      evidence: [
        {
          description: 'Índice de Remuneraciones Reales INE 2023',
          locator: { type: 'cuadro', value: 'Tabla 3.1' },
        },
      ],
      parentCommentId: null,
      moderationStatus: 'active',
      createdAt: now,
      updatedAt: now,
    }

    await repository.saveComment(comment)
    await repository.saveComment({
      ...comment,
      id: randomUUID(),
      createdAt: new Date(Date.now() + 1_000).toISOString(),
    })
    await repository.saveComment({
      ...comment,
      id: randomUUID(),
      createdAt: new Date(Date.now() + 2_000).toISOString(),
    })

    const list = await repository.listCommentsPage(pubId, 2, 0)
    assert.isArray(list.items)
    assert.equal(list.items.length, 2)
    assert.equal(list.total, 3)
    const secondPage = await repository.listCommentsPage(pubId, 2, 2)
    assert.equal(secondPage.items.length, 1)
    assert.notEqual(list.items[1]?.id, secondPage.items[0]?.id)

    const retrieved = list.items.find((c) => c.id === commentId)
    assert.isDefined(retrieved)
    assert.equal(retrieved?.commentType, 'aporte_evidencia')
    assert.equal(retrieved?.author.displayName, 'Comentarista Académico')
    assert.lengthOf(retrieved?.evidence ?? [], 1)
  })

  test('supports threaded discussion using parentCommentId', async ({ assert }) => {
    const pubId = await createTestPublication()
    const repository = new PostgresCommunityRepository('public')
    const rootCommentId = randomUUID()
    const replyCommentId = randomUUID()
    const now = new Date().toISOString()

    // 1. Comentario raíz
    await repository.saveComment({
      id: rootCommentId,
      publicationId: pubId,
      author: { id: 'usr_autor_raiz', displayName: 'Pregunta Inicial' },
      commentType: 'solicitud_aclaracion',
      content: '¿El índice de precios considera la canasta rural o solo urbana?',
      evidence: [],
      parentCommentId: null,
      moderationStatus: 'active',
      createdAt: now,
      updatedAt: now,
    })

    // 2. Respuesta en hilo
    await repository.saveComment({
      id: replyCommentId,
      publicationId: pubId,
      author: { id: 'usr_autor_replica', displayName: 'Respuesta Metodológica' },
      commentType: 'discrepancia_metodologica',
      content: 'La metodología del INE de ese periodo cubría exclusivamente el Gran Santiago.',
      evidence: [],
      parentCommentId: rootCommentId,
      moderationStatus: 'active',
      createdAt: new Date(Date.now() + 1000).toISOString(),
      updatedAt: new Date(Date.now() + 1000).toISOString(),
    })

    const list = await repository.listCommentsPage(pubId, 100, 0)
    const reply = list.items.find((c) => c.id === replyCommentId)
    assert.isDefined(reply)
    assert.equal(reply?.parentCommentId, rootCommentId)
  })

  test('records community votes idempotently and calculates tally', async ({ assert }) => {
    const pubId = await createTestPublication()
    const repository = new PostgresCommunityRepository('public')

    await repository.recordVote({
      targetType: 'publication',
      targetId: pubId,
      userId: 'usr_votante_a',
      voteType: 'relevante',
      createdAt: new Date().toISOString(),
    })

    await repository.recordVote({
      targetType: 'publication',
      targetId: pubId,
      userId: 'usr_votante_b',
      voteType: 'metodologia_rigurosa',
      createdAt: new Date().toISOString(),
    })

    // Votante A actualiza su voto
    const tally = await repository.recordVote({
      targetType: 'publication',
      targetId: pubId,
      userId: 'usr_votante_a',
      voteType: 'discrepo_con_evidencia',
      createdAt: new Date().toISOString(),
    })

    assert.equal(tally.relevante, 0)
    assert.equal(tally.metodologiaRigurosa, 1)
    assert.equal(tally.discrepoConEvidencia, 1)
    assert.equal(tally.totalVotes, 2)
  })

  test('applies moderation action removing comment from public view while preserving internal record (Principio 8)', async ({
    assert,
  }) => {
    const pubId = await createTestPublication()
    const repository = new PostgresCommunityRepository('public')
    const commentId = randomUUID()
    const reportId = randomUUID()
    const decisionId = randomUUID()
    const now = new Date().toISOString()

    // 1. Guardar comentario
    await repository.saveComment({
      id: commentId,
      publicationId: pubId,
      author: { id: 'usr_troll', displayName: 'Cuenta Infractora' },
      commentType: 'comentario_general',
      content: 'Contenido no apropiado con descalificaciones y doxxing.',
      evidence: [],
      parentCommentId: null,
      moderationStatus: 'active',
      createdAt: now,
      updatedAt: now,
    })

    // 2. Crear reporte
    const report: ContentReport = {
      id: reportId,
      targetType: 'comment',
      targetId: commentId,
      reporterId: 'usr_denunciante',
      category: 'doxxing_pii',
      justification: 'El comentario publica datos personales sensibles sin consentimiento.',
      status: 'pending',
      createdAt: now,
    }
    await repository.saveReport(report)

    // 3. Aplicar moderación
    await repository.saveModerationDecision({
      id: decisionId,
      reportId,
      moderatorId: 'mod_oficial_1',
      action: 'remove',
      ruleBroken: 'doxxing_pii',
      decisionNotes: 'Infracción grave de protección de datos personales (Principio 9).',
      appliedAt: now,
    })
    await repository.updateCommentStatus(commentId, 'removed')

    // 4. Verificar que la vista pública de cha_public ya no incluye el comentario
    const publicList = await repository.listCommentsPage(pubId, 100, 0)
    const foundInPublic = publicList.items.find((c) => c.id === commentId)
    assert.isUndefined(foundInPublic)

    // 5. Verificar que el registro interno canónico continúa existiendo para auditoría
    const internalComment = await repository.findCommentById(commentId)
    assert.isNotNull(internalComment)
    assert.equal(internalComment?.moderationStatus, 'removed')

    const retrievedReport = await repository.findReportById(reportId)
    assert.isNotNull(retrievedReport)
    assert.equal(retrievedReport?.status, 'actioned')
  })

  test('allows cha_public role to read public_comment_records but denies access to canonical tables', async ({
    assert,
  }) => {
    const publicQuery = await db
      .connection('public')
      .rawQuery('SELECT count(*)::integer AS total FROM public_comment_records')
    assert.isNumber(publicQuery.rows[0].total)

    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT * FROM comments LIMIT 1'),
      /permission denied for table comments/
    )

    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT * FROM community_votes LIMIT 1'),
      /permission denied for table community_votes/
    )

    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT * FROM content_reports LIMIT 1'),
      /permission denied for table content_reports/
    )

    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT * FROM moderation_decisions LIMIT 1'),
      /permission denied for table moderation_decisions/
    )
  })
})
