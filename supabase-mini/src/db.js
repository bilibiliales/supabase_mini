const { request } = require('./request');

function encodeQueryValue(value) {
  return encodeURIComponent(String(value));
}

function buildPreferHeader(headers, value) {
  const existing = headers.Prefer || headers.prefer || '';
  const values = existing
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!values.includes(value)) {
    values.push(value);
  }

  headers.Prefer = values.join(',');
}

function addDbHeaders(options = {}) {
  const headers = {
    ...options.headers,
  };

  // support both legacy and clearer names
  const readSchema = options.readSchema || options.schema;
  const writeSchema = options.writeSchema || options.profile;

  if (readSchema) {
    headers['Accept-Profile'] = readSchema;
  }

  if (writeSchema) {
    headers['Content-Profile'] = writeSchema;
  }

  if (options.count) {
    // options.count can be boolean or string ('exact'|'planned'|'estimated')
    const countMode = typeof options.count === 'string' ? options.count : 'exact';
    buildPreferHeader(headers, `count=${countMode}`);
  }

  return {
    ...options,
    headers,
  };
}

function buildQueryString(options = {}) {
  const parts = [];

  if (options.select) {
    const selectValue = Array.isArray(options.select) ? options.select.join(',') : options.select;
    parts.push(`select=${encodeQueryValue(selectValue)}`);
  }

  const filters = [
    ['eq', 'eq'],
    ['neq', 'neq'],
    ['gt', 'gt'],
    ['gte', 'gte'],
    ['lt', 'lt'],
    ['lte', 'lte'],
    ['like', 'like'],
    ['ilike', 'ilike'],
  ];

  filters.forEach(([optionKey, operator]) => {
    if (options[optionKey]) {
      Object.entries(options[optionKey]).forEach(([key, value]) => {
        parts.push(`${encodeQueryValue(key)}=${operator}.${encodeQueryValue(value)}`);
      });
    }
  });

  // support not.<op> e.g. not.eq, not.is
  if (options.not) {
    Object.entries(options.not).forEach(([op, obj]) => {
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          const encoded = value === null ? 'null' : encodeQueryValue(value);
          parts.push(`${encodeQueryValue(key)}=not.${op}.${encoded}`);
        });
      }
    });
  }

  if (options['in']) {
    Object.entries(options['in']).forEach(([key, value]) => {
      // quote-aware encoder: wrap string values in double-quotes and escape inner quotes
      const makeQuoted = (v) => {
        const s = String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${s}"`;
      };

      const raw = Array.isArray(value) ? value.map(makeQuoted).join(',') : makeQuoted(value);
      // encode the inner content to be safe in URL
      const encodedRaw = encodeURIComponent(raw);
      parts.push(`${encodeQueryValue(key)}=in.(${encodedRaw})`);
    });
  }

  if (options.is) {
    Object.entries(options.is).forEach(([key, value]) => {
      const encoded = value === null ? 'null' : encodeQueryValue(value);
      parts.push(`${encodeQueryValue(key)}=is.${encoded}`);
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

  options = addDbHeaders(options);
  const path = buildPath(table, options);
  return request(path, {
    method: 'GET',
    ...options,
  });
}

async function single(table, options = {}) {
  if (!table) {
    throw new Error('single(): table is required');
  }

  options = addDbHeaders(options);
  const path = buildPath(table, options);
  return request(path, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.pgrst.object+json',
      ...options.headers,
    },
    ...options,
  });
}

async function maybeSingle(table, options = {}) {
  if (!table) {
    throw new Error('maybeSingle(): table is required');
  }

  options = addDbHeaders(options);
  const path = buildPath(table, options);
  try {
    return await request(path, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.pgrst.object+json',
        ...options.headers,
      },
      ...options,
    });
  } catch (err) {
    // PostgREST returns 406 when no rows for object; treat as null
    if (err && err.status === 406) {
      return null;
    }
    throw err;
  }
}

async function insert(table, rows, options = {}) {
  if (!table) {
    throw new Error('insert(): table is required');
  }

  if (rows === undefined || rows === null) {
    throw new Error('insert(): rows are required');
  }

  options = addDbHeaders(options);
  buildPreferHeader(options.headers, 'return=representation');

  const path = buildPath(table, options);
  return request(path, {
    method: 'POST',
    ...options,
    body: rows,
  });
}

async function update(table, changes, options = {}) {
  if (!table) {
    throw new Error('update(): table is required');
  }

  if (changes === undefined || changes === null) {
    throw new Error('update(): changes are required');
  }

  options = addDbHeaders(options);
  buildPreferHeader(options.headers, 'return=representation');

  const path = buildPath(table, options);
  return request(path, {
    method: 'PATCH',
    ...options,
    body: changes,
  });
}

async function remove(table, options = {}) {
  if (!table) {
    throw new Error('delete(): table is required');
  }

  options = addDbHeaders(options);
  buildPreferHeader(options.headers, 'return=representation');

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
  single,
  maybeSingle,
  insert,
  update,
  delete: remove,
  rpc,
};
