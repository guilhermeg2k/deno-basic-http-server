import {
  BAD_REQUEST_ERRORS,
  CONN_BUFF_SIZE,
  HTTPVersion,
  METHOD_NOT_ALLOWED,
  MIME_TYPE,
  NOT_FOUND,
  SERVER_DIR,
  UNKNOWN_MIME_TYPE,
} from './constants.ts';
import { HTTPRequest, HTTPResponse } from './types.ts';
import { makeResponse, parseRequest } from './util.ts';

export class Connection {
  private conn: Deno.Conn;

  constructor(conn: Deno.Conn) {
    this.conn = conn;
  }

  handle = async () => {
    try {
      const buff = new Uint8Array(CONN_BUFF_SIZE);
      const connRawLength = await this.conn.read(buff);
      if (!connRawLength) return;

      const dataDecoded = new TextDecoder().decode(
        buff.subarray(0, connRawLength)
      );
      const request = parseRequest(dataDecoded);
      await this.handleRequest(request);
    } catch (err) {
      await this.handleError(err);
    } finally {
      this.conn.close();
    }
  };

  private handleRequest = async (request: HTTPRequest) => {
    try {
      if (request.method !== 'GET') {
        throw METHOD_NOT_ALLOWED;
      }
      const filePath = SERVER_DIR + request.path;
      const fileStat = await Deno.stat(filePath);

      if (fileStat.isDirectory) {
        const indexHTMLFilePath = filePath + '/index.html';
        await this.sendFile(indexHTMLFilePath);
      }

      await this.sendFile(filePath);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw NOT_FOUND;
      }
      throw error;
    }
  };

  private handleError = async (err: Error) => {
    if (BAD_REQUEST_ERRORS.includes(err)) {
      await this.sendResponse({
        statusCode: 400,
      });
      return;
    }

    if (err === NOT_FOUND) {
      await this.sendResponse({
        statusCode: 404,
        body: {
          content: new TextEncoder().encode('404 NOT FOUND'),
          type: 'Text',
        },
      });
      return;
    }

    if (err === METHOD_NOT_ALLOWED) {
      await this.sendResponse({
        statusCode: 405,
        body: {
          content: new TextEncoder().encode('405 Method Not Allowed'),
          type: 'Text',
        },
      });
      return;
    }

    await this.sendResponse({
      statusCode: 500,
    });
  };

  private sendFile = async (filePath: string) => {
    const file = await Deno.readFile(filePath);
    const fileExt = filePath.split('.').pop();
    const fileMimeType =
      MIME_TYPE[fileExt as keyof typeof MIME_TYPE] || UNKNOWN_MIME_TYPE;

    const response = makeResponse({
      statusCode: 200,
      body: {
        content: file,
        type: fileMimeType,
      },
    });

    await this.sendResponse(response);
  };

  private sendResponse = async (response: HTTPResponse) => {
    const { statusCode, body, headers } = response;

    const firstLine = new TextEncoder().encode(
      `${HTTPVersion} ${statusCode}\r\n`
    );

    await this.conn.write(firstLine);

    if (headers) {
      for (const headerKey of headers.keys()) {
        await this.writeHeader(headerKey, headers.get(headerKey) ?? '');
      }
    }

    await this.writeHeader('Server', 'DENO-SIMPLE-HTTP-SERVER');

    this.conn.write(new Uint8Array([13, 10])); // "\r\n"

    if (body) {
      await this.writeBody(body?.content);
    }
  };

  private writeHeader = async (key: string, value: string) => {
    await this.conn.write(new TextEncoder().encode(`${key}: ${value}\r\n`));
  };

  private writeBody = async (buff: Uint8Array) => {
    let writtenBytes = 0;
    while (writtenBytes < buff.length) {
      writtenBytes += await this.conn.write(buff.slice(writtenBytes));
    }
  };
}
