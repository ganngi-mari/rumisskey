git pull
NODE_ENV=production pnpm install --frozen-lockfile
pnpm run clean
NODE_ENV=production pnpm run build;
pnpm run migrate