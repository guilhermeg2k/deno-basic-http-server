import { HTTPMethods, HTTPStatusCode } from './constants.ts';

export type HTTPMethod = (typeof HTTPMethods)[number];

export type HTTPStatusCode = (typeof HTTPStatusCode)[number];

export type HTTPRequest = {
  method: HTTPMethod;
  path: string;
  headers?: Map<string, string>;
  body?: string;
};

export type HTTPResponse = {
  statusCode: HTTPStatusCode;
  headers?: Map<string, string>;
  body?: HTTPResponseBody;
};

export type HTTPResponseBody = {
  type: string;
  content: Uint8Array;
};
