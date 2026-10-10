FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    python3 \
    python3-venv \
    build-essential \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && node --version \
  && npm --version \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY openmanus/requirements-runtime.txt ./openmanus/requirements-runtime.txt
RUN python3 -m venv /app/.openmanus-venv \
  && /app/.openmanus-venv/bin/python -m pip install --no-cache-dir -r openmanus/requirements-runtime.txt \
  && /app/.openmanus-venv/bin/python -m playwright install chromium

COPY package.json package-lock.json ./
RUN npm ci --include=dev
RUN npx playwright install --with-deps chromium

COPY . .
RUN npm run build \
  && npm prune --omit=dev
EXPOSE 3000

CMD ["npm", "run", "start"]
