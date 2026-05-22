FROM senexcrenshaw/xteve:2.5.3

ENV XTEVE_CONF=/data/conf \
    XTEVE_HOME=/data

COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 34400

LABEL io.hass.name="xTeVe" \
      io.hass.description="M3U Proxy for Plex DVR and Emby/Jellyfin Live TV" \
      io.hass.type="addon" \
      io.hass.arch="amd64|aarch64" \
      io.hass.version="2.5.3"

CMD ["/run.sh"]
