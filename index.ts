const HTTPMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'] as const;
const HTTPVersions = ['HTTP/1.1', 'HTTP/2', 'HTTP/3'] as const;
const HTTPStatusCode = [200, 400, 404, 500] as const;

type HTTPMethod = typeof HTTPMethods[number];
type HTTPVersion = typeof HTTPVersions[number];
type HTTPStatusCode = typeof HTTPStatusCode[number];
type HTTPResponseBody = {
  type: string;
  content: string;
};

type HTTPRequest = {
  version: HTTPVersion;
  method: HTTPMethod;
  path: string;
  headers?: Map<string, string>;
  body?: string;
};

type HTTPResponse = {
  version: HTTPVersion;
  statusCode: HTTPStatusCode;
  headers?: Map<string, string>;
  body?: HTTPResponseBody;
};

const main = async () => {
  const server = Deno.listen({ port: 8000 });

  for await (const conn of server) {
    try {
      const buff = new Uint8Array(1024);
      const n = await conn.read(buff);
      const data = new TextDecoder().decode(buff.subarray(0, n!));
      const request = parseRequest(data);
      console.log('🚀 Request:', request);

      const response = makeResponse({
        request,
        headers: request.headers,
        statusCode: 200,
        body: {
          content: `<div style="background-color: red"><h3>Hello world</h3> </div>`,
          type: 'text/html; charset=utf-8',
        },
      });
      writeResponse(conn, response);
    } catch (err) {
      conn.write(new TextEncoder().encode('HTTP/1.1 400 BAD REQUEST\r'));
    } finally {
      conn.close();
    }
  }
};

const parseRequest = (data: string): HTTPRequest => {
  const lines = data.split('\n');
  const firstLine = lines[0];
  const [method, path, version] = firstLine.split(' ');
  const parsedVersion = version.replace('\r', '');
  let contentsLineIndex = 1;

  if (!HTTPMethods.includes(method as HTTPMethod)) {
    throw new Error('INVALID_HTTP_METHOD');
  }

  if (!HTTPVersions.includes(parsedVersion as HTTPVersion)) {
    throw new Error('INVALID_HTTP_VERSION');
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
    version: parsedVersion as HTTPVersion,
    headers,
    body,
  }
  
  return request;
};

const makeResponse = ({
  request,
  statusCode,
  headers,
  body,
}: {
  request: HTTPRequest;
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
    version: request.version,
    statusCode,
    body: body,
  };

  return response;
};

const writeResponse = (conn: Deno.Conn, response: HTTPResponse) => {
  const { version, statusCode, body, headers } = response;
  let responseBuff = `${version} ${statusCode}\r\n`;
  if (headers) {
    for (const headerKey of headers.keys()) {
      console.log('🚀 ~ file: main.ts:124 ~ writeResponse ~ headerKey:', headerKey);
      responseBuff = appendHeader(responseBuff, headerKey, headers.get(headerKey) ?? '');
    }
  }

  responseBuff += '\r\n' + body?.content;
  conn.write(new TextEncoder().encode(responseBuff));
};

const appendHeader = (response: string, key: string, value: string) => {
  return (response += `${key}: ${value}\r\n`);
};

main();