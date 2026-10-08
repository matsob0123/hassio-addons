# syntax=docker/dockerfile:1
# Explicit base: works with current Supervisor without deprecated BUILD_FROM/build.yaml.
ARG NODE_IMAGE=node:22-alpine3.22@sha256:cd7807368cf24826297cbad5dca1a44972ccfd770647db52a8c7589eb4599ac8
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS build
WORKDIR /src
COPY vendor/fossflow.tar.gz /tmp/fossflow.tar.gz
RUN echo "c180962e256127a00ad51d65f0ab41fa984f1d3d320d2258d964ddd3e9f0111c  /tmp/fossflow.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/fossflow.tar.gz -C /src \
    && rm /tmp/fossflow.tar.gz
RUN npm ci --no-audit --no-fund
COPY frontend /patches
RUN node /patches/patch-upstream.mjs /src
RUN PUBLIC_URL=./ npm run build

FROM ${NODE_IMAGE}
ARG BUILD_VERSION=1.2.0
ARG BUILD_ARCH=amd64
ENV NODE_ENV=production BUILD_VERSION=${BUILD_VERSION}
LABEL io.hass.name="FossFLOW" \
      io.hass.description="Isometric infrastructure diagrams with Ingress" \
      io.hass.version="${BUILD_VERSION}" \
      io.hass.type="app" \
      io.hass.arch="${BUILD_ARCH}" \
      org.opencontainers.image.title="FossFLOW for Home Assistant" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/matsob0123/hassio-addons/tree/main/fossflow" \
      org.opencontainers.image.revision="59d51ec5a0be809522bc7b53cd70a50fc8dffbe6"
WORKDIR /app
COPY --from=build /src/packages/fossflow-app/build /app/public
COPY --from=build /src/LICENSE /app/licenses/FossFLOW-LICENSE
COPY release.json /app/release.json
COPY runtime /app/runtime
COPY run.sh /app/run.sh
RUN chmod 0755 /app/run.sh && mkdir -p /data
EXPOSE 8099 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8099/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["/app/run.sh"]
