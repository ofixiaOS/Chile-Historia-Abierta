import type { PublicationRecord } from '#modules/publication/domain/publication'

export interface PublicationRepository {
  save(publication: PublicationRecord): Promise<void>
  findById(id: string): Promise<PublicationRecord | null>
  list(limit: number): Promise<readonly PublicationRecord[]>
}
