import fs from "fs";
import path from "path";
import png2icons from "png2icons";

const sourceFile = process.argv[2];
const buildDir = path.join(process.cwd(), "build");
const publicDir = path.join(process.cwd(), "public");

if (!sourceFile || !fs.existsSync(sourceFile)) {
  console.error("❌ Erro: Forneça um arquivo PNG de origem válido.");
  console.error("Uso: node scripts/generate-icons.js <arquivo.png>");
  process.exit(1);
}

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const input = fs.readFileSync(sourceFile);

const icns = png2icons.createICNS(input, png2icons.BICUBIC, 0);
if (icns) {
  fs.writeFileSync(path.join(buildDir, "icon.icns"), icns);
  console.log("✅ build/icon.icns gerado.");
}

const ico = png2icons.createICO(input, png2icons.BICUBIC, 0, false);
if (ico) {
  fs.writeFileSync(path.join(buildDir, "icon.ico"), ico);
  console.log("✅ build/icon.ico gerado.");
}

fs.copyFileSync(sourceFile, path.join(publicDir, "icon.png"));
console.log("✅ public/icon.png copiado.");

console.log("🎉 Geração de ícones concluída!");
