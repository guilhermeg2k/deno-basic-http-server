export const SERVER_DIR = Deno.args[0];

export const HTTPMethods = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'PATCH',
] as const;

export const HTTPStatusCode = [200, 400, 404, 405, 500] as const;
export const HTTPVersion = 'HTTP/1.1';

export const INVALID_HTTP_METHOD = new Error('INVALID_HTTP_METHOD');
export const INVALID_HTTP_VERSION = new Error('INVALID_HTTP_VERSION');
export const METHOD_NOT_ALLOWED = new Error('METHOD_NOT_ALLOWED');
export const NOT_FOUND = new Error('NOT_FOUND');
export const BAD_REQUEST_ERRORS = [INVALID_HTTP_METHOD, INVALID_HTTP_VERSION];
export const CONN_BUFF_SIZE = 10240;

export const MIME_TYPE = {
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

export const UNKNOWN_MIME_TYPE = 'application/octet-stream';
