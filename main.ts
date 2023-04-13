const HTTPMethods = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'PATCH',
] as const;

const HTTPStatusCode = [200, 400, 404, 405, 500] as const;
const INVALID_HTTP_METHOD = new Error('INVALID_HTTP_METHOD');
const INVALID_HTTP_VERSION = new Error('INVALID_HTTP_VERSION');
const METHOD_NOT_ALLOWED = new Error('METHOD_NOT_ALLOWED');
const NOT_FOUND = new Error('NOT_FOUND');
const BAD_REQUEST_ERRORS = [INVALID_HTTP_METHOD, INVALID_HTTP_VERSION];
const HTTPVersion = 'HTTP/1.1';
const CONN_BUFF_SIZE = 10240;
const SERVER_DIR = Deno.args[0];

const MIME_TYPE = {
  html: 'text/html',
  htm: 'text/html',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  css: 'text/css',
  js: 'application/javascript',
  json: 'application/json',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  txt: 'text/plain',
  xml: 'application/xml',
} as const;

const UNKNOWN_MIME_TYPE = 'application/octet-stream';

type HTTPMethod = typeof HTTPMethods[number];

type HTTPStatusCode = typeof HTTPStatusCode[number];

type HTTPRequest = {
  method: HTTPMethod;
  path: string;
  headers?: Map<string, string>;
  body?: string;
};

type HTTPResponse = {
  statusCode: HTTPStatusCode;
  headers?: Map<string, string>;
  body?: HTTPResponseBody;
};

type HTTPResponseBody = {
  type: string;
  content: Uint8Array;
};

const main = async () => {
  if (!SERVER_DIR) {
    console.log('Pass a folder to be served');
    return;
  }
  const server = Deno.listen({ port: 8000 });
  console.log(`> Serving listening on port 8000`);
  for await (const conn of server) {
    handleConnection(conn);
  }
};

const handleConnection = async (conn: Deno.Conn) => {
  try {
    const buff = new Uint8Array(CONN_BUFF_SIZE);
    const connRawLength = await conn.read(buff);
    if (!connRawLength) return;

    const dataDecoded = new TextDecoder().decode(
      buff.subarray(0, connRawLength)
    );
    const request = parseRequest(dataDecoded);
    await handleRequest(conn, request);
  } catch (err) {
    await handleError(conn, err);
  } finally {
    conn.close();
  }
};

const handleRequest = async (conn: Deno.Conn, request: HTTPRequest) => {
  try {
    if (request.method !== 'GET') {
      throw METHOD_NOT_ALLOWED;
    }
    const filePath = SERVER_DIR + request.path;
    const fileStat = await Deno.stat(filePath);

    if (fileStat.isDirectory) {
      const indexHTMLFilePath = filePath + '/index.html';
      await sendFile(conn, indexHTMLFilePath);
    }

    await sendFile(conn, filePath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw NOT_FOUND;
    }
    throw error;
  }
};

const handleError = async (conn: Deno.Conn, err: Error) => {
  if (BAD_REQUEST_ERRORS.includes(err)) {
    await sendResponse(conn, {
      statusCode: 400,
    });
    return;
  }

  if (err === NOT_FOUND) {
    await sendResponse(conn, {
      statusCode: 404,
      body: {
        content: new TextEncoder().encode('404 NOT FOUND'),
        type: 'Text',
      },
    });
    return;
  }

  if (err === METHOD_NOT_ALLOWED) {
    await sendResponse(conn, {
      statusCode: 405,
      body: {
        content: new TextEncoder().encode('405 Method Not Allowed'),
        type: 'Text',
      },
    });
    return;
  }

  await sendResponse(conn, {
    statusCode: 500,
  });
};

const parseRequest = (data: string): HTTPRequest => {
  const lines = data.split('\n');
  const firstLine = lines[0];
  const [method, path, version] = firstLine.split(' ');
  const parsedVersion = version.replace('\r', '');
  let contentsLineIndex = 1;

  if (!HTTPMethods.includes(method as HTTPMethod)) {
    throw INVALID_HTTP_METHOD;
  }

  if (parsedVersion !== 'HTTP/1.1') {
    throw INVALID_HTTP_VERSION;
  }

  const headers = new Map<string, string>();

  for (const line of lines.slice(1)) {
    contentsLineIndex++;
    if (line === '\r') break;
    const [key, value] = line.split(': ');
    headers.set(key, value);
  }

  const body = lines.slice(contentsLineIndex).join('\n');

  const request: HTTPRequest = {
    method: method as HTTPMethod,
    path,
    headers,
    body,
  };

  return request;
};

const sendFile = async (conn: Deno.Conn, filePath: string) => {
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

  await sendResponse(conn, response);
};

const makeResponse = ({
  statusCode,
  headers,
  body,
}: {
  statusCode: HTTPStatusCode;
  headers?: Map<string, string>;
  body?: HTTPResponseBody;
}): HTTPResponse => {
  const responseHeaders = new Map(headers);

  if (body) {
    responseHeaders.set('Content-Type', body.type);
    responseHeaders.set('Content-Length', body.content.length.toString());
  }

  const response: HTTPResponse = {
    headers: responseHeaders,
    statusCode,
    body: body,
  };

  return response;
};

const sendResponse = async (conn: Deno.Conn, response: HTTPResponse) => {
  const { statusCode, body, headers } = response;

  const firstLine = new TextEncoder().encode(
    `${HTTPVersion} ${statusCode}\r\n`
  );

  await conn.write(firstLine);

  if (headers) {
    for (const headerKey of headers.keys()) {
      await writeHeader(conn, headerKey, headers.get(headerKey) ?? '');
    }
  }

  await writeHeader(conn, 'Server', 'DENO-SIMPLE-HTTP-SERVER');

  conn.write(new Uint8Array([13, 10])); // "\r\n"

  if (body) {
    await writeBody(conn, body?.content);
  }
};

const writeHeader = async (conn: Deno.Conn, key: string, value: string) => {
  await conn.write(new TextEncoder().encode(`${key}: ${value}\r\n`));
};

const writeBody = async (conn: Deno.Conn, buff: Uint8Array) => {
  let writtenBytes = 0;
  while (writtenBytes < buff.length) {
    writtenBytes += await conn.write(buff.slice(writtenBytes));
  }
};

main();