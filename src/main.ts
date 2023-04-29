import { Connection } from './connection.ts';
import { SERVER_DIR } from './constants.ts';

const main = async () => {
  if (!SERVER_DIR) {
    console.log('Pass a folder to be served');
    return;
  }
  const server = Deno.listen({ port: 8000 });
  console.log(`> Serving listening on port 8000`);
  for await (const conn of server) {
    new Connection(conn).handle();
  }
};

main();
