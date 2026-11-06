import { createReleaseBundle, MAX_SOURCE_BYTES } from '#modules/releases/domain/release_bundle'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import { readFile, stat, writeFile } from 'node:fs/promises'

export default class ReleasePack extends BaseCommand {
  static commandName = 'release:pack'
  static description = 'Pack one locally reviewed text source and claim without publishing it'

  @flags.string({ description: 'Path to draft JSON metadata' })
  declare draft: string

  @flags.string({ description: 'Path to original UTF-8 text' })
  declare source: string

  @flags.string({ description: 'New output path for the release bundle' })
  declare output: string

  async run() {
    if (!this.draft || !this.source || !this.output) {
      throw new Error('--draft, --source and --output are required')
    }
    const sourceStat = await stat(this.source)
    const draftStat = await stat(this.draft)
    if (
      !sourceStat.isFile() ||
      sourceStat.size > MAX_SOURCE_BYTES ||
      !draftStat.isFile() ||
      draftStat.size > 32768
    ) {
      throw new Error('Source must be a file <=1 MiB and draft JSON <=32 KiB')
    }
    const raw = await readFile(this.source)
    const metadata = JSON.parse(await readFile(this.draft, 'utf8')) as unknown
    const bundle = createReleaseBundle(metadata, raw)
    await writeFile(this.output, `${JSON.stringify(bundle, null, 2)}\n`, {
      flag: 'wx',
      mode: 0o600,
    })
    this.logger.success(`Packed ${bundle.manifest.dataVersion}: ${bundle.bundleHash}`)
  }
}
