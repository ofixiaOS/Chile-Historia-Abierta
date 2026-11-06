import type { PublicClaimResponse } from '#modules/evidence/application/get_public_claim'
import type { PublicPublicationResponse } from '#modules/publication/application/get_publication_service'

export interface ProvOGraph {
  readonly '@context': {
    readonly prov: string
    readonly schema: string
    readonly cha: string
  }
  readonly '@graph': readonly Record<string, unknown>[]
}

export function transformClaimToProvO(claimRes: PublicClaimResponse): ProvOGraph {
  const claimData = claimRes.data
  const claimEntityId = `urn:cha:claim:${claimData.id}:rev:${claimData.attributes.revision.id}`
  const activityId = `urn:cha:activity:publish-claim:${claimData.id}:${claimData.attributes.revision.id}`

  const derivedFromEntities = claimRes.sources.map((src) => ({
    '@id': `urn:cha:source-artifact:${src.artifactId}`,
    '@type': ['prov:Entity', 'schema:CreativeWork'],
    'schema:name': src.sourceName,
    'schema:creator': {
      '@type': 'prov:Agent',
      'schema:name': src.responsibleAgent,
    },
    'schema:url': src.sourceUrl,
    'cha:sourceType': src.sourceType,
    'cha:locator': `${src.locator.type}:${src.locator.value}`,
    'cha:contentHash': src.contentHash,
    'cha:hashAlgorithm': src.hashAlgorithm,
    'cha:transformationMethod': src.transformationMethod,
    'cha:itemRights': src.rights.itemRights,
    'cha:datasetLicense': src.rights.datasetLicense,
    'cha:softwareLicense': src.rights.softwareLicense,
    'cha:redistributionPolicy': src.rights.redistributionPolicy,
    'cha:requiredAttribution': src.rights.requiredAttribution,
  }))

  const claimEntity: Record<string, unknown> = {
    '@id': claimEntityId,
    '@type': ['prov:Entity', 'schema:Claim'],
    'schema:headline': claimData.attributes.statement,
    'cha:evidenceStatus': claimRes.evidenceStatus,
    'cha:editorialStatus': claimData.attributes.editorialStatus,
    'cha:revisionNumber': claimData.attributes.revision.number,
    'cha:limitations': claimRes.limitations,
    'prov:wasGeneratedBy': { '@id': activityId },
    'prov:wasDerivedFrom': derivedFromEntities.map((e) => ({ '@id': e['@id'] })),
  }

  if (claimData.attributes.revision.supersedesRevisionId) {
    claimEntity['prov:wasRevisionOf'] = {
      '@id': `urn:cha:claim:${claimData.id}:rev:${claimData.attributes.revision.supersedesRevisionId}`,
    }
  }

  const publishActivity: Record<string, unknown> = {
    '@id': activityId,
    '@type': 'prov:Activity',
    'prov:endedAtTime': claimData.attributes.publishedAt,
    'prov:wasAssociatedWith': {
      '@id': 'urn:cha:agent:editorial-system',
      '@type': ['prov:Agent', 'schema:Organization'],
      'schema:name': 'Chile Historia Abierta Editorial System',
    },
  }

  return {
    '@context': {
      prov: 'http://www.w3.org/ns/prov#',
      schema: 'http://schema.org/',
      cha: 'https://chilehistoriaabierta.cl/ns#',
    },
    '@graph': [claimEntity, publishActivity, ...derivedFromEntities],
  }
}

export function transformPublicationToProvO(pubRes: PublicPublicationResponse): ProvOGraph {
  const pubData = pubRes.data
  const pubEntityId = `urn:cha:publication:${pubData.id}:rev:${pubData.attributes.revisionNumber}`
  const activityId = `urn:cha:activity:publish-publication:${pubData.id}:rev:${pubData.attributes.revisionNumber}`
  const authorId = `urn:cha:agent:${pubData.attributes.author.id}`

  const authorAgent = {
    '@id': authorId,
    '@type': ['prov:Agent', 'schema:Person'],
    'schema:name': pubData.attributes.author.displayName,
    'cha:conflictsOfInterest': pubData.attributes.conflictsOfInterest,
  }

  const publicationEntity: Record<string, unknown> = {
    '@id': pubEntityId,
    '@type': ['prov:Entity', 'schema:Article'],
    'schema:headline': pubData.attributes.title,
    'schema:text': pubData.attributes.content,
    'cha:publicationType': pubData.publicationType,
    'cha:revisionNumber': pubData.attributes.revisionNumber,
    'prov:wasAttributedTo': { '@id': authorId },
    'prov:wasGeneratedBy': { '@id': activityId },
    'cha:limitations': pubData.limitations,
  }

  if (pubData.attributes.forkedFromPublicationId) {
    publicationEntity['prov:wasDerivedFrom'] = {
      '@id': `urn:cha:publication:${pubData.attributes.forkedFromPublicationId}`,
    }
  }

  if (pubData.chartSpec) {
    publicationEntity['cha:chartQueryHash'] = pubData.chartSpec.queryHash
    publicationEntity['cha:chartSnapshotHash'] = pubData.chartSpec.dataSnapshot.contentHash
  }

  const publishActivity = {
    '@id': activityId,
    '@type': 'prov:Activity',
    'prov:endedAtTime': pubData.attributes.publishedAt,
    'prov:wasAssociatedWith': { '@id': authorId },
  }

  return {
    '@context': {
      prov: 'http://www.w3.org/ns/prov#',
      schema: 'http://schema.org/',
      cha: 'https://chilehistoriaabierta.cl/ns#',
    },
    '@graph': [publicationEntity, publishActivity, authorAgent],
  }
}
