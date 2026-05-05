import 'server-only';

import crypto from 'node:crypto';
import { downloadAgentMemory, uploadAgentMemory } from '@/og-integration/storage';
import { zgCompute } from '@/og-integration/compute';
import type { PropertyDetailBundle } from '@/lib/propertyDetails';

const ANALYSIS_PROMPT_VERSION = 4;

export type AnalysisRecord = {
  listingId: string;
  sourceFingerprint: string;
  generatedAt: number;
  provider: '0g-compute' | 'fallback';
  storageRoot: string | null;
  analysis: PropertyInvestmentAnalysis;
};

export type PropertyInvestmentAnalysis = {
  score: number;
  verdict: string;
  headline: string;
  summary: string;
  section8Fit: string;
  financialView: string;
  ownershipAndTitleView: string;
  riskView: string;
  strengths: string[];
  risks: string[];
  nextSteps: string[];
  confidence: number;
};

export type PropertyAnalysisBundle = {
  record: AnalysisRecord;
  fromCache: boolean;
};

function hashPayload(payload: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function sanitizeArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 6);

  return items.length ? items : fallback;
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(normalized);
  }

  return output;
}

function capitalizeFirst(text: string) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return normalized;
  }

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function stripPresentationLead(text: string) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return normalized;
  }

  const patterns: Array<[RegExp, string]> = [
    [/^my\s+/i, ''],
    [/^i view this as\s*/i, ''],
    [/^i scored\s*/i, ''],
    [/^i found that\s*/i, ''],
    [/^i found\s*/i, ''],
    [/^i see the section 8 fit this way:\s*/i, ''],
    [/^i read the financial picture this way:\s*/i, ''],
    [/^i see\s*/i, ''],
    [/^i treat\s*/i, ''],
    [/^i like that\s*/i, ''],
    [/^i am watching that\s*/i, ''],
    [/^i would\s*/i, ''],
  ];

  let output = normalized;
  for (const [pattern, replacement] of patterns) {
    output = output.replace(pattern, replacement).trim();
  }

  return capitalizeFirst(output);
}

function stripPresentationList(items: string[]) {
  return items.map((item) => stripPresentationLead(item));
}

function getMonthlyCashflow(bundle: PropertyDetailBundle) {
  if (bundle.listing.cashflow !== null && bundle.listing.cashflow !== undefined) {
    return Number(bundle.listing.cashflow);
  }

  return Math.round(Number(bundle.listing.netOperating || 0) / 12);
}

function getAnnualCashflow(bundle: PropertyDetailBundle) {
  if (bundle.listing.annualCashflow !== null && bundle.listing.annualCashflow !== undefined) {
    return Number(bundle.listing.annualCashflow);
  }

  return Number(bundle.listing.netOperating || 0);
}

function buildHousingAuthorityStep(bundle: PropertyDetailBundle) {
  if (!bundle.housingAuthority) {
    return null;
  }

  const { entry } = bundle.housingAuthority;
  return `Contact ${entry.name}${entry.phone ? ` at ${entry.phone}` : ''}${entry.email ? ` or ${entry.email}` : ''} to verify voucher demand, payment standards, leasing steps, and any local paperwork before bidding.`;
}

function buildOwnershipNarrative(bundle: PropertyDetailBundle, fallback: PropertyInvestmentAnalysis) {
  const { ownership, deedHistory } = bundle.attom;

  if (!ownership.verified || !ownership.ownerName) {
    return fallback.ownershipAndTitleView;
  }

  const publicOwner = /authority|commission|land bank|housing|county|city|state|department/i.test(ownership.ownerName);
  const latestTransfer = deedHistory[0]?.transferDate || deedHistory[0]?.recordedDate;
  const base = publicOwner
    ? `ATTOM identifies ${ownership.ownerName} as the current recorded owner, which suggests the acquisition path may run through a public or institutional sale process rather than a standard private negotiation.`
    : `ATTOM identifies ${ownership.ownerName} as the current recorded owner, which gives this underwriting a stronger ownership signal than a listing-only workflow.`;
  const mailing = ownership.mailingAddress
    ? ` ATTOM also returned a mailing address for follow-up.`
    : ' Mailing-address detail is limited, so county and title records should still be checked before closing.';
  const deed = deedHistory.length
    ? ` Deed history shows ${deedHistory.length} visible transfer${deedHistory.length === 1 ? '' : 's'}${latestTransfer ? `, with the latest recorded activity around ${latestTransfer}` : ''}, so a normal title review is still required before committing capital.`
    : ' A normal title review is still required before closing.';

  return `${base}${mailing}${deed}`;
}

function buildRiskNarrative(bundle: PropertyDetailBundle) {
  const riskSeries = [...bundle.attom.risk.environmental, ...bundle.attom.risk.naturalDisasters]
    .filter((item) => item.value !== null && item.value !== undefined)
    .sort((left, right) => Number(right.value || 0) - Number(left.value || 0));
  const highlighted = riskSeries.slice(0, 3).map((item) => `${item.label} (${Number(item.value).toFixed(0)})`);
  const flood = bundle.attom.risk.flood;
  const fire = bundle.attom.risk.fire;

  const context = highlighted.length
    ? `ATTOM area-level screening flags elevated surrounding-market readings for ${highlighted.join(', ')}, but those are neighborhood indicators rather than parcel-specific defects.`
    : 'ATTOM returned only limited environmental and natural-disaster screening context for this property.';
  const parcelSignals = flood !== null || fire !== null
    ? ` Flood index is ${flood ?? 'Unavailable'} and fire index is ${fire ?? 'Unavailable'}, which are still best used as insurance and inspection prompts rather than a stand-alone reject signal.`
    : ' Parcel-level flood and fire signals are limited, so insurance quotes and inspections matter more than these broad screens.';

  return `${context}${parcelSignals}`;
}

function buildFinancialMetricsSentence(bundle: PropertyDetailBundle) {
  const monthlyCashflow = getMonthlyCashflow(bundle);
  const annualCashflow = getAnnualCashflow(bundle);
  const capRate = bundle.listing.capRate;
  const roi = bundle.listing.roi;

  return `Projected monthly cash flow is ${formatMoney(monthlyCashflow)}, annual cash flow is ${formatMoney(annualCashflow)}, cap rate is ${capRate !== null && capRate !== undefined ? `${Number(capRate).toFixed(1)}%` : 'Unavailable'}, and all-cash ROI is ${roi !== null && roi !== undefined ? `${Number(roi).toFixed(1)}%` : 'Unavailable'} before financing, rehab, vacancy, and inspection adjustments.`;
}

function postProcessAnalysis(analysis: PropertyInvestmentAnalysis, fallback: PropertyInvestmentAnalysis, bundle: PropertyDetailBundle) {
  const housingAuthorityStep = buildHousingAuthorityStep(bundle);
  const entry = bundle.housingAuthority?.entry;
  const canonicalizedNextSteps = dedupeStrings([
    ...analysis.nextSteps,
    ...(housingAuthorityStep ? [housingAuthorityStep] : []),
  ]).filter((step, index, allSteps) => {
    if (!entry) {
      return true;
    }

    const normalizedStep = step.toLowerCase();
    const isHousingAuthorityStep = normalizedStep.includes(entry.name.toLowerCase())
      || (!!entry.phone && normalizedStep.includes(entry.phone.toLowerCase()))
      || (!!entry.email && normalizedStep.includes(entry.email.toLowerCase()));

    if (!isHousingAuthorityStep) {
      return true;
    }

    const firstHousingAuthorityIndex = allSteps.findIndex((candidate) => {
      const normalizedCandidate = candidate.toLowerCase();
      return normalizedCandidate.includes(entry.name.toLowerCase())
        || (!!entry.phone && normalizedCandidate.includes(entry.phone.toLowerCase()))
        || (!!entry.email && normalizedCandidate.includes(entry.email.toLowerCase()));
    });

    return index === firstHousingAuthorityIndex;
  });
  const nextSteps = canonicalizedNextSteps.slice(0, 6);
  const financialMetricsSentence = buildFinancialMetricsSentence(bundle);
  const financialView = analysis.financialView.toLowerCase().includes('roi') && analysis.financialView.toLowerCase().includes('cap rate')
    ? analysis.financialView
    : `${analysis.financialView.trim()} ${financialMetricsSentence}`.trim();
  const section8Fit = housingAuthorityStep && !analysis.section8Fit.toLowerCase().includes(bundle.housingAuthority?.entry.name.toLowerCase() || '')
    ? `${analysis.section8Fit.trim()} ${housingAuthorityStep}`.trim()
    : analysis.section8Fit;

  return {
    ...analysis,
    verdict: stripPresentationLead(analysis.verdict),
    headline: stripPresentationLead(analysis.headline),
    summary: stripPresentationLead(analysis.summary),
    section8Fit: stripPresentationLead(section8Fit),
    financialView: stripPresentationLead(financialView),
    ownershipAndTitleView: buildOwnershipNarrative(bundle, fallback),
    riskView: buildRiskNarrative(bundle),
    strengths: stripPresentationList(analysis.strengths),
    risks: stripPresentationList(analysis.risks),
    nextSteps: stripPresentationList(nextSteps),
  };
}

function applyScoreGuardrails(analysis: PropertyInvestmentAnalysis, bundle: PropertyDetailBundle): PropertyInvestmentAnalysis {
  const capRate = Number(bundle.listing.capRate || 0);
  const roi = Number(bundle.listing.roi || 0);
  const purchasePrice = Number(bundle.listing.purchasePrice || 0);
  const marketTotal = Number(bundle.attom.assessedValue.marketTotal || 0);
  const topAreaRisk = [...bundle.attom.risk.environmental, ...bundle.attom.risk.naturalDisasters]
    .map((item) => Number(item.value || 0))
    .reduce((highest, value) => (value > highest ? value : highest), 0);

  let scoreCeiling = 100;
  let confidenceCeiling = 100;

  if (capRate > 0 && capRate < 4) {
    scoreCeiling = Math.min(scoreCeiling, 58);
    confidenceCeiling = Math.min(confidenceCeiling, 74);
  } else if (capRate > 0 && capRate < 5) {
    scoreCeiling = Math.min(scoreCeiling, 64);
  }

  if (roi > 0 && roi < 4) {
    scoreCeiling = Math.min(scoreCeiling, 56);
    confidenceCeiling = Math.min(confidenceCeiling, 70);
  } else if (roi > 0 && roi < 6) {
    scoreCeiling = Math.min(scoreCeiling, 62);
  }

  if (purchasePrice > 0 && marketTotal > 0) {
    const valuationRatio = purchasePrice / marketTotal;
    if (valuationRatio >= 8) {
      scoreCeiling = Math.min(scoreCeiling, 48);
      confidenceCeiling = Math.min(confidenceCeiling, 60);
    } else if (valuationRatio >= 4) {
      scoreCeiling = Math.min(scoreCeiling, 56);
      confidenceCeiling = Math.min(confidenceCeiling, 68);
    }
  }

  if (!bundle.attom.ownership.verified) {
    confidenceCeiling = Math.min(confidenceCeiling, 68);
  }

  if (topAreaRisk >= 150) {
    confidenceCeiling = Math.min(confidenceCeiling, 63);
  }

  const score = Math.min(analysis.score, scoreCeiling);
  const confidence = Math.min(analysis.confidence, confidenceCeiling);
  const verdict = score >= 75
    ? 'Good Section 8 candidate.'
    : score >= 60
      ? 'Moderate Section 8 candidate with underwriting caveats.'
      : 'Weak Section 8 candidate unless pricing or assumptions improve.';

  return {
    ...analysis,
    score,
    confidence,
    verdict,
  };
}

function normalizeAnalysis(raw: Partial<PropertyInvestmentAnalysis>, fallback: PropertyInvestmentAnalysis, bundle: PropertyDetailBundle): PropertyInvestmentAnalysis {
  const score = Number(raw.score);
  const confidence = Number(raw.confidence);

  const normalized = {
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : fallback.score,
    verdict: String(raw.verdict || fallback.verdict),
    headline: String(raw.headline || fallback.headline),
    summary: String(raw.summary || fallback.summary),
    section8Fit: String(raw.section8Fit || fallback.section8Fit),
    financialView: String(raw.financialView || fallback.financialView),
    ownershipAndTitleView: String(raw.ownershipAndTitleView || fallback.ownershipAndTitleView),
    riskView: String(raw.riskView || fallback.riskView),
    strengths: sanitizeArray(raw.strengths, fallback.strengths),
    risks: sanitizeArray(raw.risks, fallback.risks),
    nextSteps: sanitizeArray(raw.nextSteps, fallback.nextSteps),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : fallback.confidence,
  };

  return applyScoreGuardrails(postProcessAnalysis(normalized, fallback, bundle), bundle);
}

function stripCodeFences(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}

function extractJsonObject(text: string) {
  const stripped = stripCodeFences(text);
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return stripped.slice(firstBrace, lastBrace + 1);
}

function extractText(result: unknown): string {
  const body = result && typeof result === 'object' && 'result' in result
    ? (result as { result?: unknown }).result ?? result
    : result;
  const bodyRecord = body && typeof body === 'object' ? body as Record<string, unknown> : null;
  const bodyChoices = Array.isArray(bodyRecord?.choices) ? bodyRecord.choices : null;
  const firstChoice = bodyChoices?.[0] && typeof bodyChoices[0] === 'object' ? bodyChoices[0] as Record<string, unknown> : null;
  const firstMessage = firstChoice?.message && typeof firstChoice.message === 'object' ? firstChoice.message as Record<string, unknown> : null;

  if (firstMessage?.content) {
    return String(firstMessage.content).trim();
  }

  const candidate = bodyRecord?.output || bodyRecord?.result || bodyRecord?.choices || bodyRecord?.data || body;
  if (typeof candidate === 'string') {
    return candidate.trim();
  }

  if (Array.isArray(candidate)) {
    const first = candidate[0];
    if (first?.message?.content) {
      return String(first.message.content).trim();
    }
    if (first?.content?.[0]?.text) {
      return String(first.content[0].text).trim();
    }
    return JSON.stringify(candidate);
  }

  if (candidate && typeof candidate === 'object') {
    if ('text' in candidate && candidate.text) {
      return String(candidate.text).trim();
    }
    return JSON.stringify(candidate);
  }

  return '';
}

function buildFallbackAnalysis(bundle: PropertyDetailBundle): PropertyInvestmentAnalysis {
  const { listing, housingAuthority, attom } = bundle;
  const capRate = Number(listing.capRate || 0);
  const monthlyCashflow = getMonthlyCashflow(bundle);
  const annualCashflow = getAnnualCashflow(bundle);
  const roi = Number(listing.roi || 0);
  const taxAmount = Number(attom.assessedValue.taxAmount || 0);
  const ownerVerified = attom.ownership.verified;
  const marketTotal = Number(attom.assessedValue.marketTotal || 0);
  const valuationRatio = listing.purchasePrice && marketTotal > 0 ? Number(listing.purchasePrice) / marketTotal : 0;

  let score = 42;
  if (listing.fmrSource === 'hud') score += 14;
  if (capRate >= 15) score += 20;
  else if (capRate >= 10) score += 12;
  else if (capRate >= 7) score += 6;
  else if (capRate > 0 && capRate < 4) score -= 8;
  else if (capRate > 0 && capRate < 5) score -= 4;
  if (monthlyCashflow >= 1500) score += 10;
  else if (monthlyCashflow > 800) score += 6;
  else if (monthlyCashflow > 0) score += 2;
  else score -= 8;
  if (roi >= 12) score += 8;
  else if (roi >= 8) score += 4;
  else if (roi > 0 && roi < 4) score -= 8;
  else if (roi > 0 && roi < 6) score -= 4;
  if (ownerVerified) score += 2;
  if (taxAmount > 0 && taxAmount < 2500) score += 3;
  if (valuationRatio >= 8) score -= 8;
  else if (valuationRatio >= 4) score -= 4;

  const verdict = score >= 75 ? 'Good Section 8 candidate.' : score >= 60 ? 'Moderate Section 8 candidate with underwriting caveats.' : 'Weak Section 8 candidate unless pricing or assumptions improve.';
  const contactCallout = housingAuthority
    ? ` Contact ${housingAuthority.entry.name} at ${housingAuthority.entry.phone || 'their listed HUD number'}${housingAuthority.entry.email ? ` or ${housingAuthority.entry.email}` : ''} to ask about voucher demand, payment standards, and leasing process.`
    : '';

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    verdict,
    headline: `${listing.address} shows ${listing.fmrSource === 'hud' ? 'verified rent support' : 'unverified rent support'} but thin yield at the current asking price.`,
    summary: `The property has a real list price with ${listing.fmrSource === 'hud' ? 'HUD-backed rent support' : 'unverified rent support'}, plus ATTOM parcel, tax, and deed data. Current underwriting points to ${monthlyCashflow > 0 ? `${formatMoney(monthlyCashflow)}/mo` : 'an unavailable monthly cash flow'}, annual cash flow near ${annualCashflow ? formatMoney(annualCashflow) : 'Unavailable'}, a cap rate near ${capRate ? `${capRate.toFixed(1)}%` : 'N/A'}, and an all-cash ROI near ${roi ? `${roi.toFixed(1)}%` : 'N/A'}.`,
    section8Fit: listing.fmrSource === 'hud'
      ? `HUD support is available for this unit size, which makes the deal usable for Section 8 underwriting. The unresolved question is whether physical condition and the operating plan justify the current acquisition basis.${contactCallout}`
      : 'HUD-backed rent support is not available for this listing yet, so it should not be treated as fully underwritten for Section 8 at this stage.',
    financialView: `The purchase price is ${listing.purchasePrice ? `$${Number(listing.purchasePrice).toLocaleString()}` : 'unavailable'}, HUD FMR is ${listing.fmr ? `$${Number(listing.fmr).toLocaleString()}/mo` : 'unavailable'}, projected monthly cash flow is ${formatMoney(monthlyCashflow)}, annual cash flow is ${formatMoney(annualCashflow)}, and the current model uses a 35% expense load. Cap rate is ${capRate ? `${capRate.toFixed(1)}%` : 'N/A'} and ROI is ${roi ? `${roi.toFixed(1)}%` : 'N/A'} before financing and rehab assumptions.`,
    ownershipAndTitleView: ownerVerified
      ? 'ATTOM returned an owner record, so ownership verification is stronger than a listing-only workflow. Deed history should still be reviewed for distressed or land-bank transfers.'
      : 'ATTOM owner fields are sparse for this parcel. That is common in this dataset, but title and county records still need to confirm the current holder.',
    riskView: 'ATTOM environmental and natural-disaster indices are broad area-level screening signals, not parcel-specific defects. They help frame insurance and inspection questions, but they should not outweigh the underwriting unless other evidence points to a property-level issue.',
    strengths: [
      listing.fmrSource === 'hud' ? 'HUD rent support is verified for this unit size.' : 'The list price is traceable to the live listing.',
      annualCashflow ? `Projected annual cash flow is ${formatMoney(annualCashflow)} with monthly cash flow near ${formatMoney(monthlyCashflow)}.` : 'Projected cash flow can be computed from the saved underwriting inputs.',
      listing.purchasePrice ? `The list price is ${formatMoney(listing.purchasePrice)}.` : 'A purchase price is available in the listing feed.',
      attom.assessedValue.taxAmount ? `ATTOM shows ${formatMoney(attom.assessedValue.taxAmount)} in annual taxes.` : 'Assessment history is available from ATTOM.',
    ],
    risks: [
      'Cash flow, cap rate, and ROI are based on the current underwriting model rather than financing-specific deal terms.',
      ownerVerified ? 'Title-level verification on the deed transfers is still needed before closing.' : 'Title review is still needed because ATTOM owner details are incomplete.',
      'Condition, rehab scope, vacancy, and inspection costs are not captured here yet.',
    ],
    nextSteps: [
      'Verify physical condition and rehab budget before trusting the projected cash flow, cap rate, and ROI.',
      'Review the deed history and title path for distressed transfers or land-bank events.',
      'Confirm that the target rent is achievable under the local voucher payment standard and property condition.',
      ...(housingAuthority ? [`Contact ${housingAuthority.entry.name}${housingAuthority.entry.phone ? ` at ${housingAuthority.entry.phone}` : ''}${housingAuthority.entry.email ? ` or ${housingAuthority.entry.email}` : ''} to ask about voucher availability, leasing steps, and local payment standards.`] : []),
    ],
    confidence: listing.fmrSource === 'hud' ? 76 : 64,
  };
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'Unavailable';
  }
  return `$${Math.round(value).toLocaleString()}`;
}

function buildPrompt(bundle: PropertyDetailBundle) {
  return [
    'You are Sect8, a disciplined Section 8 acquisition agent writing a concise investment presentation.',
    'Analyze the property using only the provided data from RentCast, HUD, and ATTOM.',
    'Do not invent facts, rents, taxes, ownership facts, repairs, or tenant demand.',
    'If something is missing, say that it is missing and explain how that limits confidence.',
    'Write in clean presentation language, not in first person. Avoid repetitive use of I, my, or agent roleplay phrasing.',
    'Do not over-penalize the property just because ATTOM owner details are sparse. In this workflow, missing owner fields are common and should usually be treated as a neutral data gap unless deed history shows a concrete issue.',
    'Treat ATTOM environmental and natural-disaster scores as broad area-level context only. Mention them briefly and do not let them dominate the verdict unless the dataset shows a specific parcel-level risk.',
    'Explicitly discuss ownership verification status and hazard context as separate considerations.',
    'Explicitly discuss projected monthly cash flow, annual cash flow, cap rate, and ROI using the provided underwriting numbers.',
    'If cap rate or ROI is below 4%, the score should stay below 60 unless there is an exceptional offset in the supplied data.',
    'If the ATTOM market value is dramatically below the purchase price, call out the mismatch and reduce both score and confidence.',
    'If a local housing authority contact is provided, include a practical next step telling the investor to contact that authority by name to verify voucher demand, payment standards, and leasing questions.',
    'Return JSON only with this exact schema:',
    '{"score": number, "verdict": string, "headline": string, "summary": string, "section8Fit": string, "financialView": string, "ownershipAndTitleView": string, "riskView": string, "strengths": string[], "risks": string[], "nextSteps": string[], "confidence": number}',
    'Scoring rules:',
    '- score must be an integer from 0 to 100',
    '- confidence must be an integer from 0 to 100',
    '- verdict must directly say whether this is a good Section 8 investment or not',
    '- strengths, risks, and nextSteps should each have 3 to 5 concise bullet strings',
    '- summary should be a detailed paragraph that synthesizes the whole property',
    'Property dataset:',
    JSON.stringify(bundle, null, 2),
  ].join('\n');
}

async function generateAnalysis(bundle: PropertyDetailBundle) {
  const fallback = buildFallbackAnalysis(bundle);
  const messages = [
    {
      role: 'system' as const,
      content: 'You are Sect8, a rigorous Section 8 acquisition agent. Use only supplied data, never fabricate missing facts, write in concise presentation language, and always return valid JSON.',
    },
    {
      role: 'user' as const,
      content: buildPrompt(bundle),
    },
  ];

  try {
    const response = await zgCompute.runAnalysis({ messages, model: process.env.OG_COMPUTE_MODEL });
    const text = extractText(response);
    const jsonText = extractJsonObject(text);
    if (!jsonText) {
      return { provider: 'fallback' as const, analysis: fallback };
    }

    const parsed = JSON.parse(jsonText) as Partial<PropertyInvestmentAnalysis>;
    return {
      provider: '0g-compute' as const,
      analysis: normalizeAnalysis(parsed, fallback, bundle),
    };
  } catch (error) {
    console.error('Property analysis compute error', error);
    return { provider: 'fallback' as const, analysis: fallback };
  }
}

function getFingerprintPayload(bundle: PropertyDetailBundle) {
  const { listing, housingAuthority, attom } = bundle;
  return {
    analysisVersion: ANALYSIS_PROMPT_VERSION,
    listing: {
      id: listing.id,
      address: listing.address,
      purchasePrice: listing.purchasePrice,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      propertyType: listing.propertyType,
      squareFootage: listing.squareFootage,
      fmr: listing.fmr,
      fmrSource: listing.fmrSource,
      estRent: listing.estRent,
      annualRent: listing.annualRent,
      annualCashflow: listing.annualCashflow,
      estExpenses: listing.estExpenses,
      cashflow: listing.cashflow,
      netOperating: listing.netOperating,
      capRate: listing.capRate,
      roi: listing.roi,
      source: listing.source,
    },
    housingAuthority: housingAuthority ? {
      name: housingAuthority.entry.name,
      phone: housingAuthority.entry.phone,
      email: housingAuthority.entry.email,
      matchedBy: housingAuthority.matchedBy,
    } : null,
    attom,
  };
}

async function uploadAnalysisRecord(
  bundle: PropertyDetailBundle,
  listingId: string,
  sourceFingerprint: string,
  generatedAt: number,
  provider: AnalysisRecord['provider'],
  analysis: PropertyInvestmentAnalysis,
) {
  return uploadAgentMemory({
    type: 'property-analysis',
    listingId,
    generatedAt,
    sourceFingerprint,
    provider,
    payload: {
      listing: bundle.listing,
      attom: bundle.attom,
      analysis,
    },
  });
}

async function readAnalysisRecordFromStorage(
  storageRoot: string | null | undefined,
  listingId: string,
  sourceFingerprint: string,
  fallback: PropertyInvestmentAnalysis,
  bundle: PropertyDetailBundle,
) {
  if (!storageRoot) {
    return null;
  }

  try {
    const snapshot = await downloadAgentMemory(storageRoot) as {
      type?: string;
      listingId?: string;
      generatedAt?: number;
      sourceFingerprint?: string;
      provider?: AnalysisRecord['provider'];
      payload?: {
        analysis?: PropertyInvestmentAnalysis;
      };
    };

    if (
      snapshot?.type !== 'property-analysis'
      || String(snapshot.listingId || '') !== listingId
      || String(snapshot.sourceFingerprint || '') !== sourceFingerprint
      || !snapshot.payload?.analysis
    ) {
      return null;
    }

    return {
      listingId,
      sourceFingerprint,
      generatedAt: Number(snapshot.generatedAt || Date.now()),
      provider: snapshot.provider || 'fallback',
      storageRoot,
      analysis: postProcessAnalysis(snapshot.payload.analysis, fallback, bundle),
    } satisfies AnalysisRecord;
  } catch {
    return null;
  }
}

export async function getOrCreatePropertyAnalysis(
  bundle: PropertyDetailBundle,
  existingStorageRoot?: string | null,
): Promise<PropertyAnalysisBundle> {
  const fingerprint = hashPayload(getFingerprintPayload(bundle));
  const listingId = String(bundle.listing.id);
  const fallback = buildFallbackAnalysis(bundle);
  const cached = await readAnalysisRecordFromStorage(
    existingStorageRoot || String(bundle.listing.analysisRoot || ''),
    listingId,
    fingerprint,
    fallback,
    bundle,
  );

  if (cached) {
    return { record: cached, fromCache: true };
  }

  const generated = await generateAnalysis(bundle);
  const record: AnalysisRecord = {
    listingId,
    sourceFingerprint: fingerprint,
    generatedAt: Date.now(),
    provider: generated.provider,
    storageRoot: null,
    analysis: generated.analysis,
  };

  try {
    const storageRoot = await uploadAnalysisRecord(
      bundle,
      listingId,
      fingerprint,
      record.generatedAt,
      generated.provider,
      generated.analysis,
    );
    record.storageRoot = storageRoot;
  } catch (error) {
    console.error('Property analysis storage error', error);
  }

  return { record, fromCache: false };
}