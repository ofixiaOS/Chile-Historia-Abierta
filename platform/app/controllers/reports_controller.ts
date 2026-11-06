import { rejectCommunityWrite } from '#modules/community/application/community_write_gate'

export default class ReportsController {
  async store() {
    rejectCommunityWrite()
  }
}
