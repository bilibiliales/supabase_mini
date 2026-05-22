const { request } = require('./request');

async function invoke(functionName, data = {}, options = {}) {
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
  invoke,
};
