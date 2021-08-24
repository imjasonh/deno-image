# Building container images for Deno, without Docker

`./build.sh` builds `example.js` using `deno compile`, then appends it on top of the `debian:bullseye` base image, and makes `/example` the image's entrypoint.
It does this without a Dockerfile, and without invoking `docker build`.

`./run.sh` runs `./build.sh` then runs the resulting image using `docker run`.
Only this step requires a container runtime.
