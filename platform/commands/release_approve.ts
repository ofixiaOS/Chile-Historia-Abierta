import PostgresReleaseService from '#modules/releases/infrastructure/postgres_release_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class ReleaseApprove extends BaseCommand {
  static commandName = 'release:approve'
  static description = 'Record an explicit human source and rights review for a staged bundle'
  static options: CommandOptions = { startApp: true }

  @flags.string()
  declare dataVersion: string

  @flags.string()
  declare bundleHash: string

  @flags.string()
  declare reviewer: string

  @flags.boolean()
  declare sourceConfirmed: boolean

  @flags.boolean()
  declare rightsConfirmed: boolean

  async run() {
    if (!this.dataVersion || !this.bundleHash || !this.reviewer) {
      throw new Error('--data-version, --bundle-hash and --reviewer are required')
    }
    const result = await new PostgresReleaseService().approve({
      dataVersion: this.dataVersion,
      bundleHash: this.bundleHash,
      reviewer: this.reviewer,
      sourceConfirmed: this.sourceConfirmed,
      rightsConfirmed: this.rightsConfirmed,
    })
    this.logger.success(`${result.dataVersion}: ${result.status}; reviewer=${this.reviewer}`)
  }
}
