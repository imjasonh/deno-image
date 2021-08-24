# Building container images for Deno, without Docker

`./build.sh` builds `example.js` using `deno compile`, then appends it on top of a [distroless](https://github.com/GoogleContainerTools/distroless) base image, and makes the `example` executable the image's entrypoint.
It does this without a Dockerfile, without invoking `docker build`, and without requiring a container runtime.

`./run.sh` runs `./build.sh` then runs the resulting image using `docker run`.
Only this step requires a container runtime.
