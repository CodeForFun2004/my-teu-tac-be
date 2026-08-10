// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error(err);
  }
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Đã có lỗi xảy ra, vui lòng thử lại sau.' : err.message,
  });
}

module.exports = errorHandler;
