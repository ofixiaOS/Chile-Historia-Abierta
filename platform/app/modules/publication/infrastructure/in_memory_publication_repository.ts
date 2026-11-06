import type { PublicationRepository } from '#modules/publication/application/publication_repository'
import type { PublicationRecord } from '#modules/publication/domain/publication'

export default class InMemoryPublicationRepository implements PublicationRepository {
  private readonly records = new Map<string, PublicationRecord>()

  async save(publication: PublicationRecord): Promise<void> {
    this.records.set(publication.id, structuredClone(publication))
  }

  async findById(id: string): Promise<PublicationRecord | null> {
    const record = this.records.get(id)
    return record ? structuredClone(record) : null
  }

  async list(limit: number): Promise<readonly PublicationRecord[]> {
    const all = Array.from(this.records.values())
    all.sort((a, b) => b.projectedAt.localeCompare(a.projectedAt))
    return all.slice(0, limit).map((r) => structuredClone(r))
  }
}
