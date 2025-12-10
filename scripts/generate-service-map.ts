import * as fs from "fs";
import * as path from "path";

const SERVICES_DIR = path.join(process.cwd(), "src", "services");
const OUTPUT_FILE = path.join(process.cwd(), "docs", "SERVICES_MAP.md");

interface Dependency {
  from: string;
  to: string;
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });

  return arrayOfFiles;
}

function getServiceName(filePath: string): string {
  return path.basename(filePath, ".ts");
}

function extractDependencies(
  filePath: string,
  allServices: Set<string>
): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const dependencies: string[] = [];

  const lines = content.split("\n");

  lines.forEach((line) => {
    if (line.trim().startsWith("import")) {
      allServices.forEach((service) => {
        if (
          line.includes(`/${service}`) ||
          line.includes(`"${service}"`) ||
          line.includes(`'${service}'`)
        ) {
          if (service !== getServiceName(filePath)) {
            dependencies.push(service);
          }
        }
      });
    }
  });

  return [...new Set(dependencies)];
}

function generateMermaid(dependencies: Dependency[]): string {
  let mermaid = "```mermaid\ngraph TD\n";

  dependencies.forEach((dep) => {
    mermaid += `    ${dep.from} --> ${dep.to}\n`;
  });

  mermaid += "```";
  return mermaid;
}

function main() {
  if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  }

  const files = getAllFiles(SERVICES_DIR);
  const serviceNames = new Set(files.map((f) => getServiceName(f)));
  const edges: Dependency[] = [];

  files.forEach((file) => {
    const from = getServiceName(file);
    const deps = extractDependencies(file, serviceNames);

    deps.forEach((to) => {
      edges.push({ from, to });
    });
  });

  const diagram = generateMermaid(edges);
  const document = `# Mapa de Dependências dos Serviços\n\nGerado automaticamente em ${new Date().toISOString()}\n\n${diagram}`;

  fs.writeFileSync(OUTPUT_FILE, document);
  console.log(`Diagrama gerado em: ${OUTPUT_FILE}`);
}

main();
