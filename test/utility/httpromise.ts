import { request } from 'http';

type HttpMethods = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

export function httPromise(
  url: string,
  method: HttpMethods = 'GET',
  headers: Record<string, any> = {},
  body?: Record<string, any>,
): Promise<{ data: any; headers: Record<string, any>; status: number }> {
  return new Promise((resolve, reject) => {
    const req = request(url, (res) => {
      res.setEncoding('utf-8');
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        return resolve({
          data: JSON.parse(data),
          headers: res.headers,
          status: res.statusCode,
        });
      });
      res.on('error', (err) => {
        return reject({
          data: err,
          headers: res.headers,
          status: res.statusCode,
        });
      });
    });
    req.method = method;

    Object.keys(headers).forEach((key) => {
      req.setHeader(key, headers[key]);
    });

    switch (method) {
      case 'GET':
        break;
      case 'POST':
      case 'PUT':
      case 'PATCH':
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Content-Length', Buffer.byteLength(Buffer.from(JSON.stringify(body))));
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
