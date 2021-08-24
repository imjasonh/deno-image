#!/usr/bin/env bash

deno compile --allow-net \
  --target x86_64-unknown-linux-gnu \
  example.js 1>&2

crane mutate $(
  crane append -f <(tar -f - -c example) -t gcr.io/imjasonh/deno -b gcr.io/distroless/cc-debian10
) --entrypoint=/example

