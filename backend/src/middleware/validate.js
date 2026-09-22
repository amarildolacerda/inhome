'use strict';

// FR-021 / SC-012: payload validation middleware. Invalid payloads are
// rejected with 400 and field-level details before the handler runs; valid
// payloads fall through untouched (unknown fields are left for the handler).
const TYPES = {
  string: (value) => typeof value === 'string',
  integer: (value) => Number.isInteger(value),
  number: (value) => typeof value === 'number' && Number.isFinite(value),
  boolean: (value) => typeof value === 'boolean',
  date: (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)),
  email: (value) =>
    typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
};

/**
 * @param {Object} schema - { field: { required?, type?, enum?, min?, max? } }
 * @returns {import('express').RequestHandler}
 */
function validate(schema) {
  return (req, res, next) => {
    const body = req.body || {};
    const errors = [];

    for (const [field, rule] of Object.entries(schema)) {
      const value = body[field];
      const absent = value === undefined || value === null || value === '';

      if (absent) {
        if (rule.required) errors.push(`${field} is required`);
        continue;
      }
      if (rule.type && !TYPES[rule.type](value)) {
        errors.push(`${field} must be a valid ${rule.type}`);
        continue;
      }
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} must be one of ${rule.enum.join(', ')}`);
        continue;
      }
      if (rule.min !== undefined && typeof value === 'string' && value.trim().length < rule.min) {
        errors.push(`${field} must be at least ${rule.min} characters`);
      }
      if (rule.max !== undefined && typeof value === 'string' && value.length > rule.max) {
        errors.push(`${field} must be at most ${rule.max} characters`);
      }
      if (rule.type === 'integer' && rule.min !== undefined && value < rule.min) {
        errors.push(`${field} must be >= ${rule.min}`);
      }
    }

    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
  };
}

module.exports = { validate };
