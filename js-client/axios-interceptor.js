const Enforcer = require('openapi-enforcer')
const axios = require('axios');


(async function main() {
  const openapi = await Enforcer('../wallet-openapi.yml');

  axios.interceptors.request.use(function (config) {
    const url = new URL(config.url);
    
    const [req, error] = openapi.request({
      method: config.method,
      path: url.pathname,
      body: config.data,
    });

    if (error) {
      return Promise.reject(error);
    }

    return config;
  }, function (error) {
    return Promise.reject(error);
  });

  const response = await axios.post('http://localhost:3000/wallets', {
    name: 'test',
    type: 'Event',
    colour_code: 'Green',
  });
  console.log(response.status); // 201

  try {
    await axios.post('http://localhost:3000/wallets', {
      name: 'test',
      body: 'test',
      description: 'Yellow',
    });
  } catch (error) {
    // [ EnforcerException: Request has one or more errors
    //   In body
    //     For Content-Type application/json
    //       Invalid value
    //         One or more required properties missing: type, colour_code ]
    console.error(error);
  }
})();
