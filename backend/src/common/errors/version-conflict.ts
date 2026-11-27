import { ApiException } from './api.exception.js';

/** 409 VERSION_CONFLICT kèm version hiện tại để client tải lại rồi gửi lại. */
export function versionConflict(currentVersion: number): ApiException {
  return new ApiException(
    'VERSION_CONFLICT',
    409,
    'Dữ liệu đã được thay đổi bởi người khác; hãy tải lại rồi thử lại.',
    { currentVersion },
  );
}
