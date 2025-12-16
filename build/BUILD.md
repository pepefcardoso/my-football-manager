# 🏗️ Football Manager 2D - Build & Distribuição

## Pré-requisitos

### Ferramentas Necessárias

- **Node.js** v20+ (LTS recomendado)
- **npm** v10+ ou **pnpm** v8+
- **Python** v3.11+ (para node-gyp)
- **Visual Studio Build Tools** (Windows) ou **Xcode Command Line Tools** (macOS)

### Windows

```bash
# Instalar ferramentas de build
npm install --global --production windows-build-tools
```

### macOS

```bash
# Instalar Xcode Command Line Tools
xcode-select --install
```

### Linux (Debian/Ubuntu)

```bash
sudo apt-get install build-essential libsqlite3-dev
```

---

## 📦 Instalação de Dependências

```bash
# Instalar dependências do projeto
npm install

# Rebuild módulos nativos para Electron
npm run postinstall
```

---

## 🛠️ Processo de Build

### 1️⃣ Build de Desenvolvimento (Teste Local)

```bash
# Executar em modo desenvolvimento
npm run dev
```

### 2️⃣ Build para Diretório (Sem Instalador)

```bash
# Gera build não empacotado em /release/<version>/
npm run build:dir
```

### 3️⃣ Build Completo (Todas as Plataformas)

```bash
# Windows, macOS e Linux
npm run build
```

### 4️⃣ Build por Plataforma Específica

#### Windows (NSIS Instalador + Portable)

```bash
npm run build:win
```

**Outputs:**

- `Football Manager 2D-1.0.0-x64.exe` (Instalador NSIS)
- `Football Manager 2D-1.0.0-Portable.exe` (Versão Portable)

#### macOS (DMG Universal)

```bash
npm run build:mac
```

**Output:**

- `Football Manager 2D-1.0.0-universal.dmg`

#### Linux (AppImage + Debian Package)

```bash
npm run build:linux
```

**Outputs:**

- `Football Manager 2D-1.0.0.AppImage`
- `football-manager-2d_1.0.0_amd64.deb`

#### Windows Portable (Apenas .exe portátil)

```bash
npm run build:portable
```

---

## 🗂️ Estrutura de Assets

### Ícones Necessários

```
build/
├── icon.ico          # Windows (256x256, multi-size)
├── icon.icns         # macOS (512x512@2x, multi-size)
├── icons/            # Linux (PNG multi-size)
│   ├── 16x16.png
│   ├── 32x32.png
│   ├── 48x48.png
│   ├── 64x64.png
│   ├── 128x128.png
│   ├── 256x256.png
│   └── 512x512.png
├── entitlements.mac.plist
└── README.md
```

### Gerar Ícones (Usando ImageMagick)

```bash
# De um PNG de alta resolução (1024x1024)
convert icon_source.png -resize 256x256 build/icon.ico

# macOS (requer iconutil)
mkdir MyIcon.iconset
sips -z 16 16     icon_source.png --out MyIcon.iconset/icon_16x16.png
sips -z 32 32     icon_source.png --out MyIcon.iconset/icon_16x16@2x.png
# ... (repetir para todos os tamanhos)
iconutil -c icns MyIcon.iconset -o build/icon.icns
```

---

## 🔧 Resolução de Problemas Comuns

### ❌ Erro: `better-sqlite3` não encontrado

```bash
# Recompilar módulos nativos
npm run rebuild
npm run postinstall
```

### ❌ Erro: `spawn ENOENT` (Windows)

Instale as ferramentas de build do Visual Studio:

```bash
npm install --global --production windows-build-tools
```

### ❌ Build falha com erro de memória

Aumentar limite de memória do Node:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### ❌ macOS: Erro de assinatura de código

Desative a verificação temporária no `electron-builder.json5`:

```json
{
  "mac": {
    "hardenedRuntime": false,
    "gatekeeperAssess": false
  }
}
```

---

## 🚀 Distribuição

### Testar Executável em Máquina Limpa

1. Instalar/executar o build em VM ou máquina sem dependências de desenvolvimento
2. Verificar se o banco de dados é criado em:
   - **Windows**: `%APPDATA%/football-manager-2d/`
   - **macOS**: `~/Library/Application Support/football-manager-2d/`
   - **Linux**: `~/.config/football-manager-2d/`

### Checklist de Pré-Lançamento

- [ ] Build executável funciona em todas as plataformas
- [ ] Ícones personalizados aparecem corretamente
- [ ] Banco de dados é criado com sucesso no primeiro uso
- [ ] Saves persistem entre execuções
- [ ] Não há erros no console em produção
- [ ] Tamanho do executável é aceitável (<200MB)
- [ ] Instalador/Desinstalador funcionam corretamente (Windows)

---

## 📊 Informações de Build

### Tamanhos Esperados

| Plataforma | Instalador | Descompactado |
| ---------- | ---------- | ------------- |
| Windows    | ~80MB      | ~150MB        |
| macOS      | ~85MB      | ~160MB        |
| Linux      | ~75MB      | ~140MB        |

### Versão Atual

**v1.0.0** - Build inicial de produção

---

## 📄 Logs de Build

Os logs de build ficam em:

- **Windows**: `%USERPROFILE%\AppData\Local\electron-builder\Cache\`
- **macOS/Linux**: `~/.cache/electron-builder/`

Usar `--verbose` para mais informações:

```bash
npm run build:win -- --verbose
```

---

## 🆘 Suporte

Se encontrar problemas durante o build:

1. Verifique a [documentação do Electron Builder](https://www.electron.build/)
2. Certifique-se de ter todas as ferramentas de build instaladas
3. Limpe cache e node_modules: `rm -rf node_modules && npm install`
4. Recompile módulos nativos: `npm run rebuild`
