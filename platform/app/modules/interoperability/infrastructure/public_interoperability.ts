import { defaultChunkRetriever } from '#modules/assistance/infrastructure/public_assistance'
import { getPublicClaim } from '#modules/evidence/infrastructure/public_claims'
import { validateChartSpecService } from '#modules/publication/infrastructure/public_publications'
import { statisticsService } from '#modules/statistics/infrastructure/public_statistics'
import { McpServer } from '#modules/interoperability/application/mcp_server'

export const mcpServer = new McpServer({
  getPublicClaim,
  chunkRetriever: defaultChunkRetriever,
  statisticsService,
  validateChartSpecService,
})
