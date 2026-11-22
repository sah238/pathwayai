/** Check 1: every number on every card traces to a sourced repository value. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CounselorGuide } from "@/components/cards/CounselorGuide";
import { NUDGE_MESSAGE } from "@/lib/match/selectCards";
import {
  CARD_CASE_IDS,
  TIER_VIEWS,
  ZIP_VIEWS,
  cardsFor,
  renderCard,
  repo,
  viewModel,
  visibleText,
} from "./harness";
import { auditCard, buildLedger, missingVintages, numericTokens } from "./number-audit";

describe("check 1: numbers", () => {
  it.each(CARD_CASE_IDS)("%s: every card number traces, in every ZIP and income view", async (id) => {
    const problems: string[] = [];
    for (const card of await cardsFor(id)) {
      const vm = viewModel(card.soc);
      for (const zip of ZIP_VIEWS) {
        for (const tier of TIER_VIEWS) {
          const text = visibleText(renderCard(vm, zip.status, tier, card));
          const label = `${id} ${card.soc} ${zip.name} tier ${tier ?? "none"}`;
          problems.push(...auditCard(label, text, vm, buildLedger(card.soc, zip.status, tier)));
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it.each(CARD_CASE_IDS)("%s: every number on the printed guide traces", async (id) => {
    const cards = await cardsFor(id);
    const vms = cards.map((c) => viewModel(c.soc));
    const problems: string[] = [];
    for (const zip of ZIP_VIEWS) {
      for (const tier of TIER_VIEWS) {
        const text = visibleText(renderToStaticMarkup(createElement(CounselorGuide, { cards: vms, zip: zip.status, tier })));
        const known = new Set(cards.flatMap((c) => buildLedger(c.soc, zip.status, tier).entries.map((e) => e.token)));
        for (const token of numericTokens(text, vms)) {
          if (!known.has(token)) problems.push(`${id} ${zip.name} tier ${tier ?? "none"}: "${token}"`);
        }
        if (/\$0(?![\d,–])/.test(text)) problems.push(`${id} ${zip.name} tier ${tier ?? "none"}: shows $0`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("off_topic_pizza: the nudge shows no numbers", () => {
    expect(NUDGE_MESSAGE).not.toMatch(/\d/);
  });

  it("full roster: nulls show badges, never 0, in every view", () => {
    const problems: string[] = [];
    for (const occ of repo.listOccupations()) {
      const vm = viewModel(occ.soc_code);
      for (const zip of ZIP_VIEWS) {
        for (const tier of TIER_VIEWS) {
          const text = visibleText(renderCard(vm, zip.status, tier));
          const label = `${occ.soc_code} ${zip.name} tier ${tier ?? "none"}`;
          problems.push(...auditCard(label, text, vm, buildLedger(occ.soc_code, zip.status, tier)));
        }
      }
    }
    expect(problems).toEqual([]);
  }, 120_000);

  describe("F4: displayed values without a data_vintage", () => {
    const KNOWN = [
      "APPR-IBEW26.apprenticeship.program_length_years",
      "APPR-MACTC.apprenticeship.program_length_years",
      "APPR-SM602.apprenticeship.program_length_years",
      "APPR-SMART100.apprenticeship.program_length_years",
    ];
    const found = () =>
      [
        ...new Set(
          repo
            .listOccupations()
            .flatMap((o) => ZIP_VIEWS.flatMap((z) => TIER_VIEWS.flatMap((t) => missingVintages(buildLedger(o.soc_code, z.status, t))))),
        ),
      ].sort();

    it("no value beyond the four known apprenticeship records is affected", () => {
      expect(found().filter((p) => !KNOWN.includes(p))).toEqual([]);
    });

    // Remove `.fails` when s10-fixes adds the vintages to data/institutions.json.
    it.fails("every displayed value has a data_vintage", () => {
      expect(found()).toEqual([]);
    });
  });
});
