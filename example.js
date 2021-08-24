const listener = Deno.listen({ port: 8000 });
console.log("http://localhost:8000/");
for await (const conn of listener) {
  (async () => {
    const requests = Deno.serveHttp(conn);
    for await (const { respondWith } of requests) {
      respondWith(new Response("Hello world"));
    }
  })();
}

import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";
assertEquals("hello", "hello");

