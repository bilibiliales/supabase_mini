const { request } = require('./request');

function withClient(options, client) {
  if (!client) {
    return options;
  }

  return {
    ...options,
    client,
  };
}

function requireClient(options = {}, methodName = 'functions') {
  if (!options.client) {
    throw new Error(`${methodName}(): must be called from a Supabase client`);
  }
}

async function invoke(functionName, data = {}, options = {}) {
  requireClient(options, 'invoke');

  if (!functionName) {
    throw new Error('invoke(): functionName is required');
  }

  return request(`functions/v1/${functionName}`, {
    method: options.method || 'POST',
    body: data,
    ...options,
  });
}

module.exports = {
  createFunctions(client) {
    return {
      invoke(functionName, data = {}, options = {}) {
        return invoke(functionName, data, withClient(options, client));
      },
    };
  },
  invoke,
};
