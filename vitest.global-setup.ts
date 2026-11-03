import { execSync } from "node:child_process";

export default function setup() {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://mohalla:mohalla@127.0.0.1:5432/mohalla_test",
    },
  });
}
