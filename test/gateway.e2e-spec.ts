import { INestApplication, Type, WebSocketAdapter } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import * as Io from 'socket.io-client';
import * as WebSocket from 'ws';
import { GatewayModule } from './app/gateways/gateway.module';
import { createConnection, wsClose, wsPromise } from './utility/ws-promise';

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
    deserializer: (message: string) => string | Record<string, any>;
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
    describe('Gateways', () => {
      let ws: WebSocket | SocketIOClient.Socket;

      beforeAll(async () => {
        let baseUrl = await app.getUrl();
        baseUrl = baseUrl.replace('http', protocol);
        ws = await createConnection(client, baseUrl);
      });

      afterAll(async () => {
        await wsClose(ws);
      });

      describe('AppGateway', () => {
        it.each`
          message                | expectation
          ${'throttle-regular'}  | ${{ success: true }}
          ${'ignore'}            | ${{ ignored: true }}
          ${'throttle-override'} | ${{ success: true }}
        `(
          '$message',
          async ({
            message,
            expectation,
          }: {
            message: string;
            expectation: Record<string, any>;
          }) => {
            const res = await wsPromise(ws, serializer(message), sendMethod);
            expect(res).toEqual(deserializer(JSON.stringify(expectation)));
          },
        );
      });
      describe('DefaultGateway', () => {
        it.each`
          message              | expectation
          ${'default-regular'} | ${{ success: true }}
        `(
          '$message',
          async ({
            message,
            expectation,
          }: {
            message: string;
            expectation: Record<string, any>;
          }) => {
            const res = await wsPromise(ws, serializer(message), sendMethod);
            expect(res).toEqual(deserializer(JSON.stringify(expectation)));
          },
        );
      });
      describe('LimitGateway', () => {
        it.each`
          message             | expectation          | limit
          ${'limit-regular'}  | ${{ success: true }} | ${2}
          ${'limit-override'} | ${{ success: true }} | ${5}
        `(
          '$message',
          async ({
            message,
            expectation,
            limit,
          }: {
            message: string;
            expectation: Record<string, any>;
            limit: number;
          }) => {
            for (let i = 0; i < limit; i++) {
              const res = await wsPromise(ws, serializer(message), sendMethod);
              expect(res).toEqual(deserializer(JSON.stringify(expectation)));
            }
            // only using Socket.IO for the error test due to a problem w/ catching exceptions in WS
            if (server === 'Socket.io') {
              const errorRes = await wsPromise(ws, serializer(message), sendMethod);
              expect(errorRes).toEqual([
                {
                  status: 'error',
                  message: 'ThrottlerWsException: Too Many Requests',
                },
              ]);
            }
          },
        );
      });
    });
  },
);
