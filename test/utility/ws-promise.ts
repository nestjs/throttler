import * as WebSocket from 'ws';

export const createConnection = (
  client: (url: string) => SocketIOClient.Socket | WebSocket,
  url: string,
): Promise<SocketIOClient.Socket | WebSocket> =>
  new Promise((resolve, reject) => {
    const socket = client(url);
    if (Object.getOwnPropertyDescriptor(socket, 'io')) {
      resolve(socket);
    }
    (socket as WebSocket).setMaxListeners(15);
    socket.on('open', () => {
      resolve(socket);
    });
    socket.on('error', (err) => {
      reject(err);
    });
  });

export const wsPromise = (
  ws: WebSocket | SocketIOClient.Socket,
  message: string,
  sendMethod: 'send' | 'emit',
): Promise<any> =>
  new Promise((resolve, reject) => {
    ws[sendMethod](message, {}, (data: any) => {
      if (data) {
        resolve(data);
      }
    });
    ws.on('message', (data) => {
      resolve(data);
      return false;
    });
    ws.on('error', (err) => {
      console.error(err);
      reject(err);
    });
    ws.on('exception' as any, (...args) => {
      resolve(args);
    });
    ws.on('unexpected-response', () => {
      reject('Unexpected-response');
    });
  });
export const wsClose = (ws: WebSocket | SocketIOClient.Socket): Promise<void> =>
  new Promise((resolve, reject) => {
    ws.close();
    ws.on('close', () => {
      resolve();
    });
    ws.on('error', (err) => reject(err));
  });
