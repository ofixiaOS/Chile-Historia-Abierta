import PostgresReleaseService from '#modules/releases/infrastructure/postgres_release_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class ReleaseActivate extends BaseCommand {
  static commandName = 'release:activate'
  static description = 'Atomically publish an approved staged release'
  static options: CommandOptions = { startApp: true }

  @flags.string()
  declare dataVersion: string

  @flags.string()
  declare bundleHash: string

  async run() {
    if (!this.dataVersion || !this.bundleHash) {
      throw new Error('--data-version and --bundle-hash are required')
    }
    const result = await new PostgresReleaseService().activate(this.dataVersion, this.bundleHash)
    this.logger.success(`${result.dataVersion}: ${result.status}; claimId=${result.claimId}`)
  }
}
