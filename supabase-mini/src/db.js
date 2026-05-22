const { request } = require('./request');

function buildQueryString(options = {}) {
  const params = new URLSearchParams();

  if (options.select) {
    params.set('select', Array.isArray(options.select) ? options.select.join(',') : options.select);
  }

  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      params.set(key, `eq.${value}`);
    });
  }

  if (options.neq) {
    Object.entries(options.neq).forEach(([key, value]) => {
      params.set(key, `neq.${value}`);
    });
  }

  if (options.gt) {
    Object.entries(options.gt).forEach(([key, value]) => {
      params.set(key, `gt.${value}`);
    });
  }

  if (options.lt) {
    Object.entries(options.lt).forEach(([key, value]) => {
      params.set(key, `lt.${value}`);
    });
  }

  if (options.order) {
    params.set('order', options.order);
  }

  if (options.limit != null) {
    params.set('limit', String(options.limit));
  }

  if (options.offset != null) {
    params.set('offset', String(options.offset));
  }

  return params.toString();
}

function buildPath(table, options = {}) {
  const query = buildQueryString(options);
  const basePath = `rest/v1/${table}`;
  return query ? `${basePath}?${query}` : basePath;
}

async function select(table, options = {}) {
  if (!table) {
    throw new Error('select(): table is required');
  }

  const path = buildPath(table, options);
  return request(path, {
    method: 'GET',
    ...options,
  });
}

async function insert(table, rows, options = {}) {
  if (!table) {
    throw new Error('insert(): table is required');
  }

  if (rows === undefined || rows === null) {
    throw new Error('insert(): rows are required');
  }

  const path = buildPath(table, options);
  return request(path, {
    method: 'POST',
    body: rows,
    ...options,
  });
}

async function update(table, changes, options = {}) {
  if (!table) {
    throw new Error('update(): table is required');
  }

  if (changes === undefined || changes === null) {
    throw new Error('update(): changes are required');
  }

  const path = buildPath(table, options);
  return request(path, {
    method: 'PATCH',
    body: changes,
    ...options,
  });
}

async function remove(table, options = {}) {
  if (!table) {
    throw new Error('delete(): table is required');
  }

  const path = buildPath(table, options);
  return request(path, {
    method: 'DELETE',
    ...options,
  });
}

async function rpc(fn, params = {}, options = {}) {
  if (!fn) {
    throw new Error('rpc(): function name is required');
  }

  return request(`rest/v1/rpc/${fn}`, {
    method: 'POST',
    body: params,
    ...options,
  });
}

module.exports = {
  select,
  insert,
  update,
  delete: remove,
  rpc,
};
