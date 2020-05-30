import { request } from 'http';

type HttpMethods = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

export function httpPromise(
  url: string,
  method: HttpMethods = 'GET',
  body?: Record<string, any>,
) {
  return new Promise((resolve, reject) => {
    const req = request(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', endValue => {
        console.log(endValue);
        return resolve({
          data,
          headers: res.headers,
          status: res.statusCode,
        });
      });
      res.on('error', err =>
        reject({
          data: err,
          headers: res.headers,
          status: res.statusCode,
        }),
      );
    });
    req.method = method.toLowerCase();
    switch (method) {
      case 'GET':
        break;
      case 'POST':
      case 'PUT':
      case 'PATCH':
        req.setHeader('Content-Type', 'applicaiton/json');
        req.write(Buffer.from(JSON.stringify(body)));
        break;
      case 'DELETE':
        break;
      default:
        reject(new Error('Invalid HTTP method'));
        break;
    }
    req.end();
  });
}
