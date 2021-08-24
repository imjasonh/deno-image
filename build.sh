#!/usr/bin/env bash

IMAGE=${1:-gcr.io/imjasonh/deno}
BASE=${2:-gcr.io/distroless/cc-debian10}

DENO_DIR=vendor/

deno cache --reload --lock=lock.json --lock-write example.js
deno compile \
  --lock=lock.json \
  --allow-net \
  --target x86_64-unknown-linux-gnu \
  example.js 1>&2

crane mutate $(
  crane append -f <(tar -f - -c example) -t ${IMAGE} -b ${BASE}
) --entrypoint=/example

