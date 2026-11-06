import { MAX_BUNDLE_BYTES } from '#modules/releases/domain/release_bundle'
import PostgresReleaseService from '#modules/releases/infrastructure/postgres_release_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { readFile, stat } from 'node:fs/promises'

export default class ReleaseSourceReview extends BaseCommand {
  static commandName = 'release:source-review'
  static description = 'Record a source and exact-artifact review for a release bundle'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Path to the exact release bundle reviewed' })
  declare bundle: string

  @flags.string({ description: 'approved_for_pilot or blocked' })
  declare decision: string

  @flags.string({ description: 'Reviewer name recorded for audit' })
  declare reviewer: string

  @flags.string({ description: 'HTTPS link to the terms or rights basis reviewed' })
  declare rightsEvidenceUrl: string

  @flags.string({ description: 'Concise notes describing the source and rights review' })
  declare rightsSummary: string

  @flags.boolean({ description: 'Confirm the source and locator were checked' })
  declare sourceConfirmed: boolean

  @flags.boolean({ description: 'Confirm rights for this exact artifact were checked' })
  declare rightsConfirmed: boolean

  async run() {
    if (!this.bundle || !this.reviewer || !this.decision || !this.rightsSummary) {
      throw new Error('--bundle, --decision, --reviewer and --rights-summary are required')
    }
    if (this.decision !== 'approved_for_pilot' && this.decision !== 'blocked') {
      throw new Error('--decision must be approved_for_pilot or blocked')
    }
    const fileStat = await stat(this.bundle)
    if (!fileStat.isFile() || fileStat.size > MAX_BUNDLE_BYTES) {
      throw new Error('Release bundle must be a JSON file <=2 MiB')
    }
    const bundle = JSON.parse(await readFile(this.bundle, 'utf8')) as unknown
    const result = await new PostgresReleaseService().recordSourceReview({
      bundle,
      decision: this.decision,
      reviewer: this.reviewer,
      sourceConfirmed: this.sourceConfirmed,
      rightsConfirmed: this.rightsConfirmed,
      rightsEvidenceUrl: this.rightsEvidenceUrl,
      rightsSummary: this.rightsSummary,
    })
    this.logger.success(`Source review ${result.decision}: ${result.id}`)
  }
}
