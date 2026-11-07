import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { EXDATA } from "@/features/exercises/library/exData";
import {
  CARDIO,
  GROUP_ORDER,
  LIBRARY,
  MUSCLE_LABEL,
  RADAR_AXES,
} from "@/features/exercises/library/library";
import { FOOD_CATEGORIES, FOOD_MOMENTS } from "@/shared/lib/food";
import { NUTRIENT_KEYS } from "@/shared/lib/nutrients";
import { productSummary } from "@/features/food/products/productForm";
import en from "../../messages/en.json";
import nl from "../../messages/nl.json";

const ROOT = path.resolve(__dirname, "../..");
const SCAN_DIRS = ["app", "features", "shared"];

type Catalog = Record<string, unknown>;

type StaticUse = {
  file: string;
  line: number;
  namespace: string;
  key: string;
  values: string[] | null;
};

function walkFiles(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = path.join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) walkFiles(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
}

function lookupNamespace(name: string, scopes: Map<string, string>[]): string | undefined {
  for (let i = scopes.length - 1; i >= 0; i -= 1) {
    if (!scopes[i].has(name)) continue;
    const value = scopes[i].get(name) ?? "";
    return value || undefined;
  }
  return undefined;
}

function translatorNamespace(initializer: ts.Expression): string | null {
  let expr = initializer;
  if (ts.isAwaitExpression(expr)) expr = expr.expression;
  if (!ts.isCallExpression(expr) || !ts.isIdentifier(expr.expression)) return null;
  if (expr.expression.text !== "useTranslations" && expr.expression.text !== "getTranslations") {
    return null;
  }
  const arg = expr.arguments[0];
  return arg && ts.isStringLiteral(arg) ? arg.text : null;
}

function objectKeys(arg: ts.Expression | undefined): string[] | null {
  if (!arg) return [];
  if (!ts.isObjectLiteralExpression(arg)) return null;
  if (arg.properties.some((property) => ts.isSpreadAssignment(property))) return null;
  const keys: string[] = [];
  for (const property of arg.properties) {
    if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
      if (ts.isIdentifier(property.name)) keys.push(property.name.text);
      else if (ts.isStringLiteral(property.name)) keys.push(property.name.text);
    }
  }
  return keys;
}

function collectStaticUses(): StaticUse[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walkFiles(path.join(ROOT, dir), files);
  const uses: StaticUse[] = [];

  function walk(node: ts.Node, scopes: Map<string, string>[]) {
    if (isFunctionWithBody(node)) {
      const scope = new Map<string, string>();
      for (const parameter of node.parameters) {
        if (ts.isIdentifier(parameter.name)) scope.set(parameter.name.text, "");
      }
      scopes.push(scope);
      if (node.body) walk(node.body, scopes);
      scopes.pop();
      return;
    }

    if (ts.isSourceFile(node) || ts.isBlock(node)) {
      scopes.push(new Map());
      ts.forEachChild(node, (child) => walk(child, scopes));
      scopes.pop();
      return;
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const namespace = node.initializer ? translatorNamespace(node.initializer) : null;
      scopes[scopes.length - 1]?.set(node.name.text, namespace ?? "");
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const namespace = lookupNamespace(node.expression.text, scopes);
      const keyNode = node.arguments[0];
      if (namespace && keyNode && (ts.isStringLiteral(keyNode) || ts.isNoSubstitutionTemplateLiteral(keyNode))) {
        const source = node.getSourceFile();
        uses.push({
          file: path.relative(ROOT, source.fileName),
          line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          namespace,
          key: keyNode.text,
          values: objectKeys(node.arguments[1]),
        });
      }
    }

    ts.forEachChild(node, (child) => walk(child, scopes));
  }

  for (const file of files) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    walk(source, []);
  }
  return uses;
}

function messageAt(catalog: Catalog, namespace: string, key: string): unknown {
  const parts = [...namespace.split("."), ...key.split(".")].filter(Boolean);
  let current: unknown = catalog;
  for (const part of parts) {
    if (current === null || typeof current !== "object" || !(part in current)) return undefined;
    current = (current as Catalog)[part];
  }
  return current;
}

function placeholders(message: string): string[] {
  const names = new Set<string>();
  for (const match of message.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\s*,/g)) names.add(match[1]);
  for (const match of message.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) names.add(match[1]);
  return [...names];
}

function isFunctionWithBody(
  node: ts.Node,
): node is ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration | ts.ConstructorDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration {
  return (
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    node.body !== undefined
  );
}

function leaf(catalog: Catalog, namespace: string, key: string): string | undefined {
  const value = messageAt(catalog, namespace, key);
  return typeof value === "string" ? value : undefined;
}

function expectKeys(namespace: string, keys: readonly string[]) {
  const missing = {
    en: keys.filter((key) => leaf(en, namespace, key) === undefined),
    nl: keys.filter((key) => leaf(nl, namespace, key) === undefined),
  };
  expect(missing, `${namespace} is missing dynamic keys`).toEqual({ en: [], nl: [] });
}

describe("static translation calls", () => {
  const uses = collectStaticUses();

  it("finds calls in the app, including the radar screen", () => {
    expect(uses.length).toBeGreaterThan(50);
    expect(uses.some((use) => use.file.endsWith("features/stats/components/SetsTab.tsx"))).toBe(true);
  });

  it("resolves every literal key in both catalogs", () => {
    const missing = uses.flatMap((use) => {
      const gaps = (["en", "nl"] as const).filter((locale) => {
        const catalog = locale === "en" ? en : nl;
        return leaf(catalog, use.namespace, use.key) === undefined;
      });
      return gaps.map((locale) => `${locale} ${use.file}:${use.line} ${use.namespace}.${use.key}`);
    });
    expect(missing).toEqual([]);
  });

  it("passes every placeholder the message asks for", () => {
    const missing = uses.flatMap((use) => {
      if (use.values === null) return [];
      return (["en", "nl"] as const).flatMap((locale) => {
        const catalog = locale === "en" ? en : nl;
        const message = leaf(catalog, use.namespace, use.key);
        if (!message) return [];
        const absent = placeholders(message).filter((name) => !use.values?.includes(name));
        return absent.map((name) => `${locale} ${use.file}:${use.line} ${use.namespace}.${use.key} {${name}}`);
      });
    });
    expect(missing).toEqual([]);
  });
});

describe("dynamic translation keys", () => {
  it("covers the statistics groups, including the radar Legs axis", () => {
    expect(RADAR_AXES).toContain("Legs");
    expectKeys("groups", [...GROUP_ORDER, ...RADAR_AXES]);
    expect(en.groups.Legs).toBe("Legs");
    expect(nl.groups.Legs).toBe("Benen");
  });

  it("covers muscles, library groups, cardio, taxonomy, and intensity", () => {
    expectKeys("muscles", Object.keys(MUSCLE_LABEL));
    expectKeys("libraryGroups", [...Object.keys(LIBRARY), "Cardio", "Custom"]);
    expectKeys("cardio", CARDIO);
    expectKeys("intensity", ["easy", "moderate", "hard"]);

    const regions = new Set<string>();
    const movements = new Set<string>();
    const muscleIds = new Set<string>(Object.keys(MUSCLE_LABEL));
    for (const [primary, secondary, region, movement] of Object.values(EXDATA)) {
      regions.add(region);
      movements.add(movement);
      for (const id of `${primary},${secondary}`.split(",").filter(Boolean)) muscleIds.add(id);
    }
    expectKeys("muscles", [...muscleIds]);
    expectKeys("taxonomy", [...regions, ...movements, "Custom"].filter((key) => key !== "—"));
  });

  it("covers typed unions passed into a translator", () => {
    expectKeys("stats", [
      "sets",
      "body",
      "trends",
      "measure",
      "under",
      "onTrack",
      "over",
      "weight",
      "bust",
      "waist",
      "hips",
      "leftThigh",
      "rightThigh",
    ]);
    expectKeys("exercises", ["summary", "history", "muscles"]);
    expectKeys("logging", ["volume", "duration"]);
    expectKeys("sets", ["reps"]);
    expectKeys("food.products", [
      "fieldKcal",
      "fieldFat",
      "fieldSaturated",
      "fieldCarbs",
      "fieldSugar",
      "fieldProtein",
      "nameRequired",
      "nameTooLong",
      "nutrientInvalid",
      "barcodeInvalid",
    ]);
    expectKeys("food.diary", ["momentRequired", "categoryRequired", "amountInvalid", "productRequired"]);
    expectKeys("food.limits", ["calories", "fat", "saturatedFat", "carbs", "sugar", "protein"]);
  });

  it("covers food enums and the product-summary messages", () => {
    expectKeys("food.moments", FOOD_MOMENTS);
    expectKeys("food.categories", FOOD_CATEGORIES);
    expectKeys("food.nutrients", NUTRIENT_KEYS);
    expectKeys("food.tableNutrients", NUTRIENT_KEYS);
    expectKeys("food.tableNutrientsShort", NUTRIENT_KEYS);
    expectKeys("nav", ["workout", "progress", "statistics", "food", "diary", "products", "overview", "dietist", "limits"]);
    expectKeys("common", ["en", "nl"]);
    expectKeys("bmi", ["underweight", "healthy", "overweight", "obesity", "weightInvalid", "heightInvalid"]);

    const summaries = [
      productSummary({ query: "", count: 0, status: "loading", canLoadMore: false }),
      productSummary({ query: "", count: 0, status: "loading-more", canLoadMore: true }),
      productSummary({ query: "", count: 0, status: "ready", canLoadMore: false }),
      productSummary({ query: "", count: 1, status: "ready", canLoadMore: false }),
      productSummary({ query: "", count: 2, status: "ready", canLoadMore: false }),
      productSummary({ query: "", count: 2, status: "ready", canLoadMore: true }),
      productSummary({ query: "taco", count: 0, status: "ready", canLoadMore: false }),
      productSummary({ query: "taco", count: 1, status: "ready", canLoadMore: false }),
      productSummary({ query: "taco", count: 1, status: "ready", canLoadMore: true }),
      productSummary({ query: "taco", count: 2, status: "ready", canLoadMore: false }),
      productSummary({ query: "taco", count: 2, status: "ready", canLoadMore: true }),
    ];
    for (const locale of ["en", "nl"] as const) {
      const catalog = locale === "en" ? en : nl;
      for (const summary of summaries) {
        const message = leaf(catalog, "food.products", summary.key);
        expect(message, `${locale} food.products.${summary.key}`).toEqual(expect.any(String));
        for (const name of placeholders(message ?? "")) {
          expect(summary.values, `${locale} ${summary.key}`).toHaveProperty(name);
        }
      }
    }
  });

  it("resolves the radar axis through next-intl for both locales", () => {
    for (const locale of ["en", "nl"] as const) {
      const translate = createTranslator({
        locale,
        messages: locale === "en" ? en : nl,
        namespace: "groups",
        onError(error) {
          throw error;
        },
        getMessageFallback({ key }) {
          throw new Error(`Missing message ${key}`);
        },
      });
      expect(translate("Legs")).toBe(locale === "en" ? "Legs" : "Benen");
      for (const axis of RADAR_AXES) {
        expect(translate(axis).length).toBeGreaterThan(0);
      }
    }
  });
});
