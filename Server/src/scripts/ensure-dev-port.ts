import { execSync } from 'node:child_process';
import path from 'node:path';

const port = Number(process.env.PORT ?? 3000);
const cwd = process.cwd();
const rootHints = [
  cwd,
  path.resolve(cwd).replaceAll('/', '\\'),
  path.resolve(cwd, 'src', 'main.ts').replaceAll('/', '\\'),
  path.resolve(cwd, 'dist', 'main.js').replaceAll('/', '\\'),
];
const entryHints = ['src/main.ts', 'src\\main.ts', 'dist/main.js', 'dist\\main.js'];
const runtimeHints = ['ts-node/register', 'tsconfig-paths/register', 'newrelic'];

function run(command: string) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const message =
      error instanceof Error && 'message' in error
        ? String(error.message)
        : '';

    if (
      message.includes('No matching') ||
      message.includes('not found') ||
      message.includes('cannot find')
    ) {
      return '';
    }

    throw error;
  }
}

function getListeningPids(targetPort: number) {
  const normalizedPort = String(targetPort);

  if (process.platform === 'win32') {
    const output = run('netstat -ano -p tcp');

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes('LISTENING'))
      .filter((line) => line.split(/\s+/)[1]?.endsWith(`:${normalizedPort}`))
      .map((line) => Number(line.split(/\s+/).at(-1)))
      .filter(Number.isFinite);
  }

  const output = run(`lsof -ti tcp:${normalizedPort} -sTCP:LISTEN`);

  return output
    .split(/\r?\n/)
    .map((value) => Number(value.trim()))
    .filter(Number.isFinite);
}

function getCommandLine(pid: number) {
  if (process.platform === 'win32') {
    const output = run(
      `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId = ${pid}\\").CommandLine"`,
    );

    return output.replace(/\r?\n/g, ' ').trim();
  }

  return run(`ps -o command= -p ${pid}`);
}

function isOwnBackend(commandLine: string) {
  const normalized = commandLine.toLowerCase();
  const hasKnownEntry = entryHints.some((hint) =>
    normalized.includes(hint.toLowerCase()),
  );
  const hasKnownRuntime = runtimeHints.some((hint) =>
    normalized.includes(hint.toLowerCase()),
  );

  return hasKnownEntry && (hasKnownRuntime || rootHints.some((hint) => normalized.includes(hint.toLowerCase())));
}

function killProcess(pid: number) {
  if (process.platform === 'win32') {
    run(`taskkill /PID ${pid} /T /F`);
    return;
  }

  run(`kill -9 ${pid}`);
}

function waitUntilPortIsFree(targetPort: number, timeoutMs = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (getListeningPids(targetPort).length === 0) {
      return true;
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
  }

  return getListeningPids(targetPort).length === 0;
}

function main() {
  const pids = Array.from(new Set(getListeningPids(port)));

  if (pids.length === 0) {
    return;
  }

  const ownBackendPids: number[] = [];
  const externalPids: Array<{ pid: number; commandLine: string }> = [];

  for (const pid of pids) {
    const commandLine = getCommandLine(pid);

    if (isOwnBackend(commandLine)) {
      ownBackendPids.push(pid);
      continue;
    }

    externalPids.push({ pid, commandLine });
  }

  if (externalPids.length > 0) {
    console.error(
      `[start:dev] El puerto ${port} ya esta siendo usado por otro proceso y no lo voy a cerrar automaticamente.`,
    );

    for (const processInfo of externalPids) {
      console.error(
        `[start:dev] PID ${processInfo.pid}: ${processInfo.commandLine || 'sin linea de comando disponible'}`,
      );
    }

    console.error(
      `[start:dev] Cierra ese proceso o cambia la variable PORT antes de volver a arrancar el backend.`,
    );
    process.exit(1);
  }

  if (ownBackendPids.length === 0) {
    return;
  }

  for (const pid of ownBackendPids) {
    console.log(
      `[start:dev] Cerrando instancia previa del backend en el puerto ${port} (PID ${pid})...`,
    );
    killProcess(pid);
  }

  if (!waitUntilPortIsFree(port)) {
    console.error(
      `[start:dev] No pude liberar el puerto ${port} a tiempo. Intenta cerrar el proceso manualmente y vuelve a ejecutar el comando.`,
    );
    process.exit(1);
  }

  console.log(`[start:dev] Puerto ${port} listo. Iniciando backend en modo desarrollo...`);
}

main();
