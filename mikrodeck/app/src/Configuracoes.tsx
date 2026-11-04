/**
 * Configurações gerais e ferramentas de manutenção.
 *
 * Fica numa janela sobreposta para não roubar espaço da tela principal,
 * que é onde a pessoa passa o tempo.
 */

import { useEffect, useState } from "react";
import {
  abrirPastaConfig as abrirPasta,
  caminhoDoMcp,
  definirIniciaComOSistema,
  lerDiagnostico,
  lerIniciaComOSistema,
  previsualizarDescanso,
  restaurarPadrao as restaurar,
  testarLeds as testar,
  type Diagnostico,
} from "./ponte";
import { abrirNoNavegador, descobrirCasa, escutar } from "./ponte";
import { CORES, NOMES_CORES, rotuloDaCor } from "./cores";
import {
  BOTOES_FISICOS,
  ROTULOS_KNOB,
  ROTULOS_MODO_LUZ,
  ROTULOS_RITMO,
  ROTULOS_STRIP,
  type AoApertar,
  type Config,
  type CorLuz,
  type FuncaoKnob,
  type FuncaoStrip,
  type ModoLuz,
  type Ritmo,
} from "./tipos";
import { t, IDIOMAS, type Idioma } from "./idioma";

interface Props {
  config: Config;
  onFechar: () => void;
  onSalvar: (c: Config) => void;
}

export function Configuracoes({ config, onFechar, onSalvar }: Props) {
  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [comOSistema, setComOSistema] = useState(false);
  const [mcp, setMcp] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function copiar(texto: string, qual: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(qual);
    setTimeout(() => setCopiado(null), 1500);
  }
  // Calibração da strip: posição crua ao vivo e a faixa vista enquanto calibra.
  const [posicaoStrip, setPosicaoStrip] = useState<number | null>(null);
  const [calibrando, setCalibrando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [recadoCasa, setRecadoCasa] = useState<string | null>(null);
  const [faixa, setFaixa] = useState<{ minimo: number; maximo: number } | null>(null);

  useEffect(() => {
    const inscricao = escutar<number>("strip", (p) => {
      setPosicaoStrip(p);
      setFaixa((antes) =>
        antes === null
          ? { minimo: p, maximo: p }
          : { minimo: Math.min(antes.minimo, p), maximo: Math.max(antes.maximo, p) },
      );
    });
    return () => {
      inscricao.then((remover) => remover());
    };
  }, []);

  useEffect(() => {
    lerDiagnostico().then(setDiag).catch(console.error);
    lerIniciaComOSistema().then(setComOSistema).catch(console.error);
    caminhoDoMcp().then(setMcp).catch(console.error);
  }, []);

  // Esc fecha, como em qualquer janela do sistema.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  async function restaurarPadrao() {
    if (
      !confirm(
        t("Isso apaga todas as suas páginas e volta para a configuração de exemplo. Continuar?"),
      )
    )
      return;
    setOcupado(true);
    try {
      const novo = await restaurar();
      onSalvar(novo);
      onFechar();
    } catch (e) {
      console.error(e);
    } finally {
      setOcupado(false);
    }
  }

  async function abrirPastaConfig() {
    await abrirPasta().catch(console.error);
  }

  async function testarLeds() {
    setOcupado(true);
    try {
      await testar();
    } catch (e) {
      console.error(e);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6"
      onClick={onFechar}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl border border-neutral-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium">{t("Configurações")}</h2>
          <button
            onClick={onFechar}
            className="rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            {t("Fechar")}
          </button>
        </div>

        <Secao titulo="Langue / Language">
          <select
            value={config.idioma ?? "fr"}
            onChange={(e) => onSalvar({ ...config, idioma: e.target.value as Idioma })}
            className={entrada}
          >
            {IDIOMAS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </Secao>

        <Secao titulo={t("Pausa automática")}>
          <p className="mb-2 text-xs text-neutral-500">
            {t("Quando um destes programas abre, o MikroDeck pausa sozinho e devolve o Mikro. Fechou todos, ele volta. Um programa por linha, pelo começo do nome do executável (ex.: Ableton Live, Maschine 2).")}
          </p>
          <textarea
            rows={3}
            defaultValue={(config.pausar_com ?? []).join("\n")}
            onBlur={(e) =>
              onSalvar({
                ...config,
                pausar_com: e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter((l) => l !== ""),
              })
            }
            className={entrada}
          />
        </Secao>

        <Secao titulo={t("Navegação por páginas")}>
          <p className="mb-2 text-xs text-neutral-500">
            {t("Botões que trocam de página quando não estão programados na página atual.")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={rotulo}>{t("Página anterior")}</label>
              <select
                value={config.botao_pagina_anterior}
                onChange={(e) =>
                  onSalvar({ ...config, botao_pagina_anterior: e.target.value })
                }
                className={entrada}
              >
                {BOTOES_FISICOS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {t(b.rotulo)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={rotulo}>{t("Próxima página")}</label>
              <select
                value={config.botao_proxima_pagina}
                onChange={(e) =>
                  onSalvar({ ...config, botao_proxima_pagina: e.target.value })
                }
                className={entrada}
              >
                {BOTOES_FISICOS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {t(b.rotulo)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Secao>

        <Secao titulo={t("Ao ligar o computador")}>
          <label className="flex items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={comOSistema}
              onChange={async (e) => {
                const ligado = e.target.checked;
                setComOSistema(ligado);
                try {
                  await definirIniciaComOSistema(ligado);
                } catch (err) {
                  console.error(err);
                  setComOSistema(!ligado);
                }
              }}
              className="mt-0.5"
            />
            <span>
              {t("Abrir o MikroDeck junto com o Windows.")}
              <span className="block text-xs text-neutral-500">
                {t("Ele sobe na bandeja, ao lado do relógio, sem abrir esta janela. Fechar a janela também não encerra o programa: para sair de verdade, use o menu do ícone na bandeja.")}
              </span>
            </span>
          </label>
        </Secao>

        <Secao titulo={t("Knob")}>
          <p className="mb-2 text-xs text-neutral-500">
            {t("O botão giratório ao lado da tela. Girar faz o que estiver escolhido aqui; o clique é programável como um botão qualquer, em qualquer página. Ele não tem luz, então não tem cor para configurar.")}
          </p>
          <select
            value={config.knob}
            onChange={(e) =>
              onSalvar({ ...config, knob: e.target.value as FuncaoKnob })
            }
            className={entrada}
          >
            {Object.entries(ROTULOS_KNOB).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {t(rotulo)}
              </option>
            ))}
          </select>
        </Secao>

        <Secao titulo={t("Touch strip")}>
          <p className="mb-2 text-xs text-neutral-500">
            {t("A faixa sensível ao toque, abaixo dos botões PITCH e MOD.")}
          </p>
          <select
            value={config.strip}
            onChange={(e) =>
              onSalvar({ ...config, strip: e.target.value as FuncaoStrip })
            }
            className={entrada}
          >
            {Object.entries(ROTULOS_STRIP).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {t(rotulo)}
              </option>
            ))}
          </select>

          <div className="mt-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
            <p className="mb-1 text-[13px] font-medium">{t("Calibrar")}</p>
            <p className="mb-2 text-xs leading-relaxed text-neutral-500">
              {t("O sensor vai de 0 a 255, mas o dedo não alcança as duas pontas, e por isso não dá para chegar a 100%. Calibre uma vez e a faixa que você alcança passa a valer o intervalo inteiro.")}
            </p>
            <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              <dt className="text-neutral-500">{t("Posição agora")}</dt>
              <dd>{posicaoStrip ?? t("encoste na faixa")}</dd>
              <dt className="text-neutral-500">{t("Gravado")}</dt>
              <dd>
                {config.calibracao_strip.minimo} – {config.calibracao_strip.maximo}
              </dd>
              {calibrando && (
                <>
                  <dt className="text-neutral-500">{t("Vendo agora")}</dt>
                  <dd>
                    {faixa ? `${faixa.minimo} – ${faixa.maximo}` : t("passe o dedo")}
                  </dd>
                </>
              )}
            </dl>
            {calibrando ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-sky-600 dark:text-sky-400">
                  {t("Passe o dedo de uma ponta à outra, devagar.")}
                </span>
                <button
                  onClick={() => {
                    if (faixa && faixa.maximo > faixa.minimo) {
                      onSalvar({ ...config, calibracao_strip: faixa });
                    }
                    setCalibrando(false);
                  }}
                  disabled={!faixa || faixa.maximo <= faixa.minimo}
                  className={botao}
                >
                  {t("Pronto, salvar")}
                </button>
                <button onClick={() => setCalibrando(false)} className={botao}>
                  {t("Cancelar")}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setFaixa(null);
                    setCalibrando(true);
                  }}
                  className={botao}
                >
                  {t("Calibrar agora")}
                </button>
                <button
                  onClick={() =>
                    onSalvar({
                      ...config,
                      calibracao_strip: { minimo: 0, maximo: 255 },
                    })
                  }
                  className={botao}
                >
                  {t("Voltar ao padrão")}
                </button>
              </div>
            )}
          </div>
        </Secao>

        <Secao titulo={t("Descanso de tela")}>
          <label className="mb-2 flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={config.descanso.ativo}
              onChange={(e) =>
                onSalvar({
                  ...config,
                  descanso: { ...config.descanso, ativo: e.target.checked },
                })
              }
            />
            {t("Rodar um texto na tela quando o aparelho fica parado")}
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className={rotulo}>{t("Texto")}</label>
              <input
                type="text"
                value={config.descanso.texto}
                placeholder="MikroDeck"
                onChange={(e) =>
                  onSalvar({
                    ...config,
                    descanso: { ...config.descanso, texto: e.target.value },
                  })
                }
                className={entrada}
              />
            </div>
            <div>
              <label className={rotulo}>{t("Depois de")}</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={5}
                  max={3600}
                  value={config.descanso.segundos}
                  onChange={(e) =>
                    onSalvar({
                      ...config,
                      descanso: {
                        ...config.descanso,
                        segundos: Math.max(5, Number(e.target.value)),
                      },
                    })
                  }
                  className={`${entrada} w-20`}
                />
                <span className="text-[13px] text-neutral-500">s</span>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium">{t("Luz dos pads")}</p>
              <button onClick={() => previsualizarDescanso().catch(console.error)} className={botao}>
                {t("Ver agora")}
              </button>
            </div>
            <p className="mb-2 text-xs text-neutral-500">
              {t("O que os 16 pads fazem enquanto o aparelho dorme. O brilho geral é o teto.")}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={rotulo}>{t("Modo")}</label>
                <select
                  value={config.descanso.luz.modo}
                  onChange={(e) =>
                    onSalvar({
                      ...config,
                      descanso: {
                        ...config.descanso,
                        luz: { ...config.descanso.luz, modo: e.target.value as ModoLuz },
                      },
                    })
                  }
                  className={entrada}
                >
                  {Object.entries(ROTULOS_MODO_LUZ).map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {t(texto)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={rotulo}>{t("Ritmo")}</label>
                <select
                  value={config.descanso.luz.ritmo}
                  disabled={["nenhuma", "som"].includes(config.descanso.luz.modo)}
                  onChange={(e) =>
                    onSalvar({
                      ...config,
                      descanso: {
                        ...config.descanso,
                        luz: { ...config.descanso.luz, ritmo: e.target.value as Ritmo },
                      },
                    })
                  }
                  className={`${entrada} disabled:opacity-40`}
                >
                  {Object.entries(ROTULOS_RITMO).map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {t(texto)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={rotulo}>{t("Cor")}</label>
                <select
                  value={config.descanso.luz.cor}
                  disabled={config.descanso.luz.modo === "nenhuma"}
                  onChange={(e) =>
                    onSalvar({
                      ...config,
                      descanso: {
                        ...config.descanso,
                        luz: { ...config.descanso.luz, cor: e.target.value as CorLuz },
                      },
                    })
                  }
                  className={`${entrada} disabled:opacity-40`}
                >
                  <option value="auto">{t("Automática")}</option>
                  {NOMES_CORES.filter((n) => n !== "apagado").map((n) => (
                    <option key={n} value={n} style={{ color: CORES[n] }}>
                      {rotuloDaCor(n)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Secao>

        <Secao titulo={t("Pads")}>
          <label className="flex items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={config.ao_apertar === "eco"}
              onChange={(e) =>
                onSalvar({
                  ...config,
                  ao_apertar: (e.target.checked ? "eco" : "nenhuma") as AoApertar,
                })
              }
              className="mt-0.5"
            />
            <span>
              {t("Eco de luz ao soltar o pad")}
              <span className="block text-xs text-neutral-500">
                {t("O pad volta em brilho cheio e pousa no brilho de repouso em 200 ms.")}
              </span>
            </span>
          </label>
        </Secao>

        <Secao titulo={t("Home Assistant")}>
          <p className="mb-2 text-xs text-neutral-500">
            {t("Preencha uma vez para os pads poderem chamar automações da casa.")}
          </p>
          <label className={rotulo}>{t("Endereço do servidor")}</label>
          <input
            type="text"
            value={config.home_assistant.endereco}
            placeholder="http://homeassistant.local:8123"
            onChange={(e) =>
              onSalvar({
                ...config,
                home_assistant: {
                  ...config.home_assistant,
                  endereco: e.target.value,
                },
              })
            }
            className={`${entrada} mb-2`}
          />
          <label className={rotulo}>{t("Token de acesso de longa duração")}</label>
          <input
            type="password"
            value={config.home_assistant.token}
            placeholder={t("cole aqui o token")}
            onChange={(e) =>
              onSalvar({
                ...config,
                home_assistant: {
                  ...config.home_assistant,
                  token: e.target.value,
                },
              })
            }
            className={`${entrada} font-mono text-xs`}
          />
          <p className="mt-2 text-xs text-neutral-500">
            {t("O token sai do seu perfil no Home Assistant, no fim da página, em \"Tokens de acesso de longa duração\". Ele fica gravado em texto puro no arquivo de configuração, na sua pasta de usuário.")}
          </p>

          <div className="mt-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium">{t("Buscar os dispositivos")}</p>
                <p className="text-xs text-neutral-500">
                  {t("Pergunta ao Home Assistant o que ele tem e monta uma página com tudo que liga e desliga. Nada do que já existe é apagado.")}
                </p>
              </div>
              <button
                onClick={() => {
                  setBuscando(true);
                  setRecadoCasa(null);
                  descobrirCasa()
                    .then((r) => {
                      onSalvar(r.config);
                      setRecadoCasa(
                        t(r.paginas === 1 ? "{d} dispositivos em {p} página." : "{d} dispositivos em {p} páginas.", {
                          d: r.dispositivos,
                          p: r.paginas,
                        }),
                      );
                    })
                    .catch((e) => setRecadoCasa(String(e)))
                    .finally(() => setBuscando(false));
                }}
                disabled={buscando || !config.home_assistant.token.trim()}
                className={`${botao} shrink-0 disabled:opacity-40`}
              >
                {buscando ? t("Buscando…") : t("Buscar")}
              </button>
            </div>
            {recadoCasa && (
              <p className="mt-2 text-xs text-neutral-500">{recadoCasa}</p>
            )}
          </div>
        </Secao>

        <Secao titulo={t("Apoie o projeto")}>
          <p className="mb-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            {t("O MikroDeck é livre e sempre vai ser. Ele nasceu de engenharia reversa feita à mão num aparelho que a fabricante nunca abriu, e quem quiser ajudar a manter o trabalho de pé pode contribuir.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                abrirNoNavegador("https://github.com/sponsors/Thryki").catch(
                  console.error,
                )
              }
              className="rounded-lg bg-pink-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-pink-500"
            >
              ♥ {t("Apoiar o projeto")}
            </button>
            <button
              onClick={() =>
                abrirNoNavegador("https://github.com/Thryki/mikrodeck").catch(
                  console.error,
                )
              }
              className={botao}
            >
              {t("Ver no GitHub")}
            </button>
          </div>
        </Secao>

        <Secao titulo={t("Botões com função de fábrica")}>
          <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            {t("Três botões já vêm com função, e todos podem ser trocados: basta configurar o botão na página.")}
          </p>
          <ul className="mt-2 space-y-1 text-[13px] text-neutral-600 dark:text-neutral-400">
            <li>{t("Círculo: liga e desliga o MikroDeck sem fechar o programa.")}</li>
            <li>{t("Estrela: vai para a primeira página.")}</li>
            <li>{t("Lupa: abre a busca do Windows.")}</li>
          </ul>
        </Secao>

        <Secao titulo={t("Configurar por conversa (MCP)")}>
          <p className="mb-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            {t("O MikroDeck vem com um servidor MCP. Ligue ele em qualquer assistente que fale MCP e peça os atalhos em português: a mudança entra no aparelho na hora, sem reiniciar nada.")}
          </p>
          {mcp ? (
            <>
              <p className={rotulo}>{t("Caminho do servidor")}</p>
              <div className="mb-3 flex gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-neutral-100 p-2.5 text-xs dark:bg-neutral-900">
                  {mcp}
                </pre>
                <button onClick={() => copiar(mcp, "caminho")} className={botao}>
                  {copiado === "caminho" ? t("Copiado") : t("Copiar")}
                </button>
              </div>

              <p className={rotulo}>{t("Claude Code, Cursor, Codex e outros de terminal")}</p>
              <div className="mb-3 flex gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-neutral-100 p-2.5 text-xs dark:bg-neutral-900">
                  {comandoCli(mcp)}
                </pre>
                <button
                  onClick={() => copiar(comandoCli(mcp), "cli")}
                  className={botao}
                >
                  {copiado === "cli" ? t("Copiado") : t("Copiar")}
                </button>
              </div>

              <p className={rotulo}>
                {t("Claude Desktop, Cursor, Windsurf, Zed e qualquer outro que use arquivo de configuração")}
              </p>
              <div className="flex gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-neutral-100 p-2.5 text-xs dark:bg-neutral-900">
                  {blocoJson(mcp)}
                </pre>
                <button
                  onClick={() => copiar(blocoJson(mcp), "json")}
                  className={`${botao} self-start`}
                >
                  {copiado === "json" ? t("Copiado") : t("Copiar")}
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                {t("Cole dentro de")} <code>mcpServers</code> {t("no arquivo de configuração do seu assistente e reinicie ele.")}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-neutral-500">
              {t("Servidor MCP não encontrado nesta instalação.")}
            </p>
          )}
        </Secao>

        <Secao titulo={t("Diagnóstico")}>
          {diag ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
              <dt className="text-neutral-500">{t("Aparelho")}</dt>
              <dd>{diag.aparelho_conectado ? t("conectado") : t("não encontrado")}</dd>
              <dt className="text-neutral-500">{t("Páginas")}</dt>
              <dd>{diag.paginas}</dd>
              <dt className="text-neutral-500">{t("Pads configurados")}</dt>
              <dd>{diag.pads_configurados}</dd>
              <dt className="text-neutral-500">{t("Botões configurados")}</dt>
              <dd>{diag.botoes_configurados}</dd>
              <dt className="text-neutral-500">{t("Versão do motor")}</dt>
              <dd>{diag.versao_motor}</dd>
              <dt className="text-neutral-500">Config</dt>
              <dd className="break-all text-xs">{diag.caminho_config}</dd>
            </dl>
          ) : (
            <p className="text-[13px] text-neutral-500">{t("Lendo…")}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={testarLeds} disabled={ocupado} className={botao}>
              {t("Testar LEDs")}
            </button>
            <button onClick={abrirPastaConfig} className={botao}>
              {t("Abrir pasta da config")}
            </button>
          </div>
        </Secao>

        <Secao titulo={t("Se o aparelho não acender")}>
          <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            {t("Na primeira vez em cada aparelho, abra o Maschine 2 como administrador uma vez, com o Mikro conectado. Isso grava um estado permanente que libera o controle dos LEDs. Depois disso o MikroDeck funciona sozinho, sem nada da Native Instruments rodando, e o estado sobrevive a reiniciar o computador e a desconectar o cabo.")}
          </p>
        </Secao>

        <Secao titulo={t("Zona de risco")}>
          <button
            onClick={restaurarPadrao}
            disabled={ocupado}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-[13px] text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            {t("Restaurar configuração de exemplo")}
          </button>
        </Secao>
      </div>
    </div>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 border-b border-neutral-200 pb-4 last:border-0 dark:border-neutral-700">
      <h3 className="mb-2 text-[13px] font-medium">{titulo}</h3>
      {children}
    </section>
  );
}

/** Comando de uma linha, para assistentes de terminal. */
function comandoCli(caminho: string): string {
  return `claude mcp add mikrodeck -- "${caminho}"`;
}

/** Bloco de configuração, para assistentes que leem um arquivo JSON. */
function blocoJson(caminho: string): string {
  return JSON.stringify(
    { mikrodeck: { command: caminho, args: [] } },
    null,
    2,
  );
}

const entrada =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-sky-500 dark:border-neutral-600";
const rotulo = "mb-1 block text-xs text-neutral-600 dark:text-neutral-400";
const botao =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-[13px] hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-700";
