const { request } = require('./request');

function encodeQueryValue(value) {
  return encodeURIComponent(String(value));
}

function buildQueryString(options = {}) {
  const parts = [];

  if (options.select) {
    const selectValue = Array.isArray(options.select) ? options.select.join(',') : options.select;
    parts.push(`select=${encodeQueryValue(selectValue)}`);
  }

  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      parts.push(`${encodeQueryValue(key)}=eq.${encodeQueryValue(value)}`);
    });
  }

  if (options.neq) {
    Object.entries(options.neq).forEach(([key, value]) => {
      parts.push(`${encodeQueryValue(key)}=neq.${encodeQueryValue(value)}`);
    });
  }

  if (options.gt) {
    Object.entries(options.gt).forEach(([key, value]) => {
      parts.push(`${encodeQueryValue(key)}=gt.${encodeQueryValue(value)}`);
    });
  }

  if (options.lt) {
    Object.entries(options.lt).forEach(([key, value]) => {
      parts.push(`${encodeQueryValue(key)}=lt.${encodeQueryValue(value)}`);
    });
  }

  if (options.order) {
    parts.push(`order=${encodeQueryValue(options.order)}`);
  }

  if (options.limit != null) {
    parts.push(`limit=${encodeQueryValue(options.limit)}`);
  }

  if (options.offset != null) {
    parts.push(`offset=${encodeQueryValue(options.offset)}`);
  }

  return parts.join('&');
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
    headers: {
      Prefer: 'return=representation',
      ...options.headers,
    },
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
    headers: {
      Prefer: 'return=representation',
      ...options.headers,
    },
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
