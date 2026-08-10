// Bọc controller async để lỗi throw/reject tự động rơi vào errorHandler thay vì crash process.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
