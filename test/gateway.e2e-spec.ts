import { INestApplication, Type, WebSocketAdapter } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import * as Io from 'socket.io-client';
import { GatewayModule } from './app/gateways/gateway.module';
describe.each`
  adapter      | server         | client                                 | protocol  | sendMethod | serializer                                                 | deserializer
  ${IoAdapter} | ${'Socket.io'} | ${(url: string) => Io(url)}            | ${'http'} | ${'emit'}  | ${(message: string) => message}                            | ${(message: string) => JSON.parse(message)}
  ${WsAdapter} | ${'Websocket'} | ${(url: string) => new WebSocket(url)} | ${'ws'}   | ${'send'}  | ${(message: string) => JSON.stringify({ event: message })} | ${(message: string) => message}
`(
  '$server Throttler',
  ({
    adapter,
    server,
    client,
    protocol,
    sendMethod,
    serializer,
    deserializer,
  }: {
    adapter: Type<WebSocketAdapter>;
    server: string;
    client: (url: string) => SocketIOClient.Socket | WebSocket;
    protocol: 'http' | 'ws';
    sendMethod: 'send' | 'emit';
    serializer: (message: string) => string;
    deserializer: (message: string) => string | object;
  }) => {
    let app: INestApplication;

    beforeAll(async () => {
      const modRef = await Test.createTestingModule({
        imports: [GatewayModule],
      }).compile();
      app = modRef.createNestApplication();
      app.useWebSocketAdapter(new adapter(app));
      await app.listen(0);
    });

    afterAll(async () => {
      await app.close();
    });
    // for more information at the moment, check out https://github.com/jmcdo29/ogma/blob/master/integration/test/ws.spec.ts
    // I'm a bit tired and can't quite finish writing the tests out, but hopefully what that does makes sense.
    it.todo('finish implementation of ws tests');
  },
);
