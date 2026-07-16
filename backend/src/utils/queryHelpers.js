const { Op } = require('sequelize');
const sequelize = require('../config/database');

// PostgreSQL از Op.iLike (بدون حساسیت به بزرگ/کوچک بودن حروف) پشتیبانی می‌کند،
// اما SQLite (که در تست‌ها استفاده می‌شود) این عملگر را ندارد.
function caseInsensitiveLike() {
  return sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
}

function parsePagination(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPaginatedResponse({ rows, count }, page, limit) {
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.max(Math.ceil(count / limit), 1),
    },
  };
}

module.exports = { caseInsensitiveLike, parsePagination, buildPaginatedResponse };
