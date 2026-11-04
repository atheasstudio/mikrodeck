/**
 * Langue de l'interface. Les textes du code restent la clé (en portugais,
 * la langue d'origine du projet) et chaque langue a sa table de traduction.
 * Une clé absente d'une table retombe sur le texte d'origine.
 */

import { FR } from "./traducoes/fr";
import { EN } from "./traducoes/en";

export type Idioma = "fr" | "en";

export const IDIOMAS: { id: Idioma; nome: string }[] = [
  { id: "fr", nome: "Français" },
  { id: "en", nome: "English" },
];

const TABELAS: Record<Idioma, Record<string, string>> = { fr: FR, en: EN };

let atual: Idioma = "fr";

export function definirIdioma(idioma: Idioma | undefined) {
  atual = idioma && idioma in TABELAS ? idioma : "fr";
  document.documentElement.lang = atual;
}

export function idiomaAtual(): Idioma {
  return atual;
}

/** Traduz um texto. `{nome}` dentro do texto é trocado por `vars.nome`. */
export function t(texto: string, vars?: Record<string, string | number>): string {
  let saida = TABELAS[atual][texto] ?? texto;
  if (vars) {
    saida = saida.replace(/\{(\w+)\}/g, (inteiro, chave) =>
      chave in vars ? String(vars[chave]) : inteiro,
    );
  }
  return saida;
}
