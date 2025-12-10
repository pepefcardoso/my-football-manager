/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Esta dependência faz parte de um ciclo (A -> B -> A)",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Este módulo é órfão - nenhum outro módulo depende dele",
      from: {
        orphan: true,
        pathNot: ["^src/main.tsx", "^src/App.tsx", "\\.d\\.ts$"],
      },
      to: {},
    },
    {
      name: "not-to-test",
      comment: "Não permitir dependências do código principal para testes",
      severity: "error",
      from: {
        pathNot: "\\.spec\\.ts$",
      },
      to: {
        path: "\\.spec\\.ts$",
      },
    },
    {
      name: "ui-should-not-import-engine-directly",
      comment:
        "UI deve acessar lógica via Services ou Hooks, não Engine diretamente",
      severity: "warn",
      from: {
        path: "^src/components",
      },
      to: {
        path: "^src/engine",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "./tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+",
      },
      archi: {
        collapsePattern: "^(node_modules|packages|src|test|spec)/[^/]+",
      },
    },
  },
};
