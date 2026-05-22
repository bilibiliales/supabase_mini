function eq(field, value) {
  if (!field) {
    throw new Error('eq(): field is required');
  }

  return {
    eq: {
      [field]: value,
    },
  };
}

function neq(field, value) {
  if (!field) {
    throw new Error('neq(): field is required');
  }

  return {
    neq: {
      [field]: value,
    },
  };
}

function gt(field, value) {
  if (!field) {
    throw new Error('gt(): field is required');
  }

  return {
    gt: {
      [field]: value,
    },
  };
}

function lt(field, value) {
  if (!field) {
    throw new Error('lt(): field is required');
  }

  return {
    lt: {
      [field]: value,
    },
  };
}

function order(field, direction = 'asc') {
  if (!field) {
    throw new Error('order(): field is required');
  }

  return {
    order: `${field}.${direction}`,
  };
}

function limit(count) {
  if (count == null || count < 0) {
    throw new Error('limit(): count must be a non-negative number');
  }

  return {
    limit: count,
  };
}

module.exports = {
  eq,
  neq,
  gt,
  lt,
  order,
  limit,
};
