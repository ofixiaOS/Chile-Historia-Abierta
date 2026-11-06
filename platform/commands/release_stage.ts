import { MAX_BUNDLE_BYTES } from '#modules/releases/domain/release_bundle'
import PostgresReleaseService from '#modules/releases/infrastructure/postgres_release_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { readFile, stat } from 'node:fs/promises'

export default class ReleaseStage extends BaseCommand {
  static commandName = 'release:stage'
  static description = 'Validate and stage a local release bundle without public visibility'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Path to release bundle JSON' })
  declare bundle: string

  async run() {
    if (!this.bundle) throw new Error('--bundle is required')
    const fileStat = await stat(this.bundle)
    if (!fileStat.isFile() || fileStat.size > MAX_BUNDLE_BYTES) {
      throw new Error('Release bundle must be a JSON file <=2 MiB')
    }
    const parsed = JSON.parse(await readFile(this.bundle, 'utf8')) as unknown
    const result = await new PostgresReleaseService().stage(parsed)
    this.logger.success(`${result.dataVersion}: ${result.status}; bundleHash=${result.bundleHash}`)
  }
}
