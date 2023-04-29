import {
  HTTPMethods,
  INVALID_HTTP_METHOD,
  INVALID_HTTP_VERSION,
} from './constants.ts';
import {
  HTTPMethod,
  HTTPRequest,
  HTTPResponse,
  HTTPResponseBody,
  HTTPStatusCode,
} from './types.ts';

export const parseRequest = (data: string): HTTPRequest => {
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

export const makeResponse = ({
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
