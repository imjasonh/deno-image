#!/usr/bin/env bash

DENO_DIR=vendor/

deno cache --reload --lock=lock.json --lock-write example.js
deno compile \
  --lock=lock.json \
  --allow-net \
  --target x86_64-unknown-linux-gnu \
  example.js 1>&2

crane mutate $(
  crane append -f <(tar -f - -c example) -t gcr.io/imjasonh/deno -b gcr.io/distroless/cc-debian10
) --entrypoint=/example

