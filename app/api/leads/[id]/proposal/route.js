import { notFound } from "next/navigation";
import { calculateProposal } from "../../../../../src/domain/solarCalculator.js";
import { getLead, saveProposal } from "../../../../../src/lib/leadRepository.js";
import { buildProposalPdf } from "../../../../../src/lib/proposalPdf.js";

export async function GET(_request, { params }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const calculation = calculateProposal(lead);
  const onGridOption = calculateProposal({
    ...lead,
    forceMode: "on-grid",
    wantsBattery: false,
    batteryCapacityKwh: null
  });
  const hybridOption = calculateProposal({
    ...lead,
    forceMode: "hibrido",
    wantsBattery: true,
    pretende_bateria: true,
    batteryCapacityKwh: lead.batteryCapacityKwh || lead.capacidade_bateria_desejada_kwh || 10,
    capacidade_bateria_desejada_kwh: lead.capacidade_bateria_desejada_kwh || lead.batteryCapacityKwh || 10
  });
  await saveProposal({ leadId: lead.id, calculation });
  const pdf = buildProposalPdf({
    lead,
    calculation,
    options: {
      onGrid: onGridOption,
      hybrid: hybridOption
    }
  });

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposta-${lead.id}.pdf"`
    }
  });
}
