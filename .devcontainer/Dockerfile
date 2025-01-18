FROM mcr.microsoft.com/vscode/devcontainers/base:ubuntu
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

EXPOSE 8000

WORKDIR /app

COPY . .
