import AddCommentService from '#modules/community/application/add_comment_service'
import ApplyModerationService from '#modules/community/application/apply_moderation_service'
import ReportContentService from '#modules/community/application/report_content_service'
import { validateReportParams } from '#modules/community/domain/moderation'
import InMemoryCommunityRepository from '#modules/community/infrastructure/in_memory_community_repository'
import { test } from '@japa/runner'

test.group('Moderation Rules & Auditable Actions (Unit)', () => {
  test('rejects report with unknown category', ({ assert }) => {
    assert.throws(
      () =>
        validateReportParams({
          targetType: 'comment',
          targetId: 'com_1',
          reporterId: 'usr_1',
          category: 'categoria_inexistente' as any,
          justification: 'Esta es una justificación suficientemente larga para la prueba.',
        }),
      /Categoría de reporte desconocida/
    )
  })

  test('anti-brigading: rejects report with short justification (< 15 chars)', ({ assert }) => {
    assert.throws(
      () =>
        validateReportParams({
          targetType: 'comment',
          targetId: 'com_1',
          reporterId: 'usr_1',
          category: 'spam',
          justification: 'Es spam.',
        }),
      /al menos 15 caracteres/
    )
  })

  test('accepts well-founded report and sets status to pending', async ({ assert }) => {
    const repository = new InMemoryCommunityRepository()
    const service = new ReportContentService(repository)

    const report = await service.execute({
      targetType: 'publication',
      targetId: 'pub_99',
      reporterId: 'usr_curador',
      category: 'cita_falsa',
      justification:
        'La página citada de la memoria anual no contiene la afirmación atribuida al directorio.',
      evidenceUrl: 'https://archivo.ejemplo.invalid/memoria1982.pdf',
    })

    assert.equal(report.status, 'pending')
    assert.equal(report.category, 'cita_falsa')
    assert.isString(report.id)
  })

  test('applies auditable moderation action and preserves context (Principio 8)', async ({
    assert,
  }) => {
    const repository = new InMemoryCommunityRepository()
    const addComment = new AddCommentService(repository)
    const reportService = new ReportContentService(repository)
    const moderationService = new ApplyModerationService(repository)

    // 1. Crear comentario
    const comment = await addComment.execute({
      publicationId: 'pub_1',
      author: { id: 'usr_troll', displayName: 'Spammer' },
      commentType: 'comentario_general',
      content: 'Comentario que infringe normas de convivencia con enlaces indebidos.',
    })
    assert.equal(comment.moderationStatus, 'active')

    // 2. Reportar comentario
    const report = await reportService.execute({
      targetType: 'comment',
      targetId: comment.id,
      reporterId: 'usr_lector',
      category: 'spam',
      justification: 'Enlaces repetitivos con fines de publicidad no solicitada.',
    })

    // 3. Moderador toma decisión auditable
    const decision = await moderationService.execute({
      reportId: report.id,
      moderatorId: 'mod_responsable',
      action: 'remove',
      ruleBroken: 'spam',
      decisionNotes: 'Infracción comprobada de la política anti-spam; enlace publicitario externo.',
    })

    assert.isString(decision.id)
    assert.equal(decision.action, 'remove')

    // 4. Verificar que el comentario fue marcado como 'removed' en el repositorio (no borrado silencioso)
    const updatedComment = await repository.findCommentById(comment.id)
    assert.isNotNull(updatedComment)
    assert.equal(updatedComment?.moderationStatus, 'removed')

    // 5. Verificar que la lista pública de comentarios no lo muestra pero el registro interno existe
    const publicList = await repository.listCommentsPage('pub_1', 100, 0)
    assert.equal(publicList.items.length, 0)
  })
})
