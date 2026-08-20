# A bridge, not the server.
#
# The Bounce Watch MCP server is hosted and closed source. This image contains
# the stdio launcher and nothing else: it pipes JSON-RPC from stdin to
# https://api.bouncewatch.com/api/v1/mcp and writes the reply back to stdout.
# Deploying it does not stand up a copy of Bounce Watch — it stands up a
# connection to it, and the account behind that connection is still yours.
#
# It exists so the package can be built, security-scanned and released on
# directories that publish containers. Their build test starts the image and
# checks the server answers, which is why the launcher no longer refuses to
# start without a key: the handshake, the tool list and the prompt list are
# public, and a tool call comes back with a message naming both ways to
# authenticate.
#
#   docker build -t bouncewatch-mcp .
#   docker run -i --rm -e BOUNCEWATCH_API_KEY=... bouncewatch-mcp
#
# Without the variable it still runs, lists the tools, and refuses the calls.

FROM node:22-alpine

LABEL org.opencontainers.image.title="Bounce Watch MCP launcher" \
      org.opencontainers.image.description="stdio bridge to the hosted Bounce Watch MCP server. Not a self-hosted copy of the server." \
      org.opencontainers.image.source="https://github.com/bouncewatch/mcp" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

# No npm install, because there is nothing to install — the launcher has zero
# runtime dependencies and that is the point of it. package.json travels anyway:
# it carries "type": "module", without which Node reads the launcher as CommonJS.
COPY package.json ./
COPY bin ./bin

# The base image ships this unprivileged user. Nothing here writes to disk.
USER node

ENTRYPOINT ["node", "bin/bouncewatch-mcp.js"]
