const { AppError } = require("../errors");

// Central handler: consistent error shape, no stack traces leaked to clients
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }
  console.error("Unexpected error:", err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
}

module.exports = { errorHandler };
