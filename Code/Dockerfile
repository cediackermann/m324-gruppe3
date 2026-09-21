# Pinned on purpose: the same Bun version is used locally, in the CI pipeline
# and here, so a build cannot differ between them.
# NOT -alpine: Bun 1.3.13's Bun.sql Postgres client fails to open a socket
# on the musl/Alpine build (confirmed: raw Bun.connect() works fine there,
# only the SQL client's own connector fails) but works on this image.
# Re-check on a Bun upgrade before switching back to -alpine.
FROM oven/bun:1.3.13 AS deps
# NOT /app: confirmed that with this exact Bun version, Bun.sql's Postgres
# connector fails (FailedToOpenSocket) specifically when the process's
# working directory is literally "/app" — reproduced independent of
# ownership/permissions; /srv, /home/bun/app, and other names all work.
# Re-check on a Bun upgrade before renaming this back.
WORKDIR /srv
COPY package.json bun.lock ./
# --frozen-lockfile fails instead of silently updating the lockfile.
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.13 AS runtime
WORKDIR /srv
ENV NODE_ENV=production

COPY --from=deps /srv/node_modules ./node_modules
COPY package.json bun.lock ./
COPY src ./src

# The database lives OUTSIDE the app directory, on a mounted volume.
# Anything written into the image itself is lost with the next release.
RUN mkdir -p /data && chown -R bun:bun /data
VOLUME ["/data"]

USER bun
ENV DATABASE_PATH=/data/app.db \
    PORT=3000 \
    HOST=0.0.0.0
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:3000/health'); process.exit(r.ok ? 0 : 1)"

CMD ["bun", "src/server.ts"]
