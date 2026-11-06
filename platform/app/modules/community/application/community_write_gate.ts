import ApiError from '#shared/errors/api_error'

export function rejectCommunityWrite(): never {
  throw new ApiError(
    'E_COMMUNITY_WRITES_DISABLED',
    'Las escrituras comunitarias requieren identidad individual y aún no están habilitadas',
    503
  )
}
