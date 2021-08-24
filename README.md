# Building container images for [Deno](https://deno.land), without Docker

`./build.sh` builds `example.js` using [`deno compile`](https://deno.land/manual@v1.13.2/tools/compiler), then appends it on top of a default [distroless](https://github.com/GoogleContainerTools/distroless) base image, and makes the `example` executable the image's entrypoint, using [`crane`](https://github.com/google/go-containerregistry/tree/main/cmd/crane).

It does all this without a Dockerfile, without invoking `docker build`, and without requiring a container runtime.

`./run.sh` runs `./build.sh` then runs the resulting image using `docker run`.
Only this step requires a container runtime.

`./build.sh` takes two optional positional args: `./build.sh [image-to-build] [base-image]`
