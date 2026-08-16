# deck-converter — dịch vụ nội bộ chuyển PDF/PPTX → ảnh từng slide (JPEG base64) để portal bọc thành deck.
# LibreOffice (pptx→pdf) + poppler (pdf→ảnh) + fonts Noto (tiếng Việt). Gọi qua HTTP nội bộ (host.docker.internal).
FROM debian:bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-impress poppler-utils \
      fonts-noto-core fonts-noto-cjk fonts-liberation fontconfig \
      python3 python3-flask ca-certificates \
    && fc-cache -f \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY server.py /app/server.py
ENV HOME=/tmp PORT=8630
EXPOSE 8630
CMD ["python3", "/app/server.py"]
