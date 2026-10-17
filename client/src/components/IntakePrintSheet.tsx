import type { IntakeFormInput } from "@shared/intake";
import { formatFrenchDate } from "@shared/intake";

type PrintableFiche = IntakeFormInput & { id?: number };

function Mark({ checked, label }: { checked: boolean; label: string }) {
  return <span className="print-choice"><span className="print-box">{checked ? "✓" : ""}</span>{label}</span>;
}

function Value({ children }: { children?: React.ReactNode }) {
  return <span className="print-value">{children || ""}</span>;
}

export function IntakePrintSheet({ fiche }: { fiche: PrintableFiche }) {
  return (
    <article className="print-sheet" aria-label="Fiche d'introduction du projet imprimable">
      <header className="print-header">
        <strong>FICHE D’INTRODUCTION DU PROJET</strong>
        <strong>Date : <Value>{formatFrenchDate(fiche.submissionDate)}</Value></strong>
      </header>
      <h1>PROMOTION IMMOBILIÈRE</h1>

      <section className="print-section">
        <h2>1. IDENTIFICATION DU PROJET</h2>
        <table className="print-table identification-table"><tbody>
          <tr><th>Nom du dossier</th><td><Value>{fiche.projectName}</Value></td></tr>
          <tr><th>Lieu</th><td><Value>{fiche.projectLocation}</Value></td></tr>
        </tbody></table>
      </section>

      <section className="print-section">
        <h2>2. FICHE TECHNIQUE</h2>
        <table className="print-table"><tbody>
          <tr><th>Sous-sols</th><td><Value>{fiche.basements}</Value></td></tr>
          <tr><th>Entre-sol</th><td><Value>{fiche.mezzanines}</Value></td></tr>
          <tr><th>RDC</th><td><Mark checked={fiche.commercialGroundFloor} label="Commercial" /><Mark checked={fiche.residentialGroundFloor} label="Résidentiel" /></td></tr>
          <tr><th>Entresol de service</th><td><Mark checked={fiche.serviceMezzanine} label="Oui" /><Mark checked={!fiche.serviceMezzanine} label="Non" /></td></tr>
          <tr><th>Étages de service</th><td><Value>{fiche.serviceFloors}</Value></td></tr>
          <tr><th>Terrasse aménagée</th><td><Mark checked={fiche.landscapedTerrace} label="Oui" /><Mark checked={!fiche.landscapedTerrace} label="Non" /></td></tr>
          <tr><th>CES</th><td><Value>{fiche.ces}</Value></td></tr>
          <tr><th>COS</th><td><Value>{fiche.cos}</Value></td></tr>
        </tbody></table>
      </section>

      <section className="print-section">
        <h2>3. PROGRAMME DES LOGEMENTS</h2>
        <table className="print-table"><tbody><tr><th>Type d’appartements</th><td className="print-inline"><Mark checked={fiche.housingF2} label="F2" /><Mark checked={fiche.housingF3} label="F3" /><Mark checked={fiche.housingF4} label="F4" /><Mark checked={fiche.housingF5} label="F5" /><Mark checked={fiche.housingDuplex} label="Duplex" /><Mark checked={fiche.housingOther} label="Autre" /></td></tr></tbody></table>
      </section>

      <section className="print-section">
        <h2>4. STANDING</h2>
        <table className="print-table"><tbody><tr><th>Standing</th><td className="print-inline"><Mark checked={fiche.standing === "Normal"} label="Normal" /><Mark checked={fiche.standing === "Moyen"} label="Moyen" /><Mark checked={fiche.standing === "Haut"} label="Haut" /></td></tr></tbody></table>
      </section>

      <section className="print-section">
        <h2>5. ÉQUIPEMENTS &amp; SERVICES</h2>
        <table className="print-table"><tbody>
          <tr><th>Parking</th><td><Mark checked={fiche.parking} label="Oui" /><Mark checked={!fiche.parking} label="Non" /></td></tr>
          <tr><th>Ascenseur</th><td><Mark checked={fiche.elevator} label="Oui" /><Mark checked={!fiche.elevator} label="Non" /></td></tr>
          <tr><th>Aire de jeux</th><td><Mark checked={fiche.playground} label="Oui" /><Mark checked={!fiche.playground} label="Non" /></td></tr>
          <tr><th>Gardiennage</th><td><Mark checked={fiche.security} label="Oui" /><Mark checked={!fiche.security} label="Non" /></td></tr>
          <tr><th>Smart Home</th><td><Mark checked={fiche.smartHome} label="Oui" /><Mark checked={!fiche.smartHome} label="Non" /></td></tr>
          <tr><th>Autre</th><td><Value>{fiche.otherEquipment}</Value></td></tr>
        </tbody></table>
      </section>

      <section className="print-section">
        <h2>6. INSTRUCTIONS SPÉCIALES</h2>
        <table className="print-table instructions-table"><tbody><tr><th>Contraintes / Exigences</th><td><Value>{fiche.specialInstructions}</Value></td></tr></tbody></table>
      </section>

      <section className="print-section">
        <h2>7. DOCUMENTS TRANSMIS</h2>
        <table className="print-table"><tbody>
          <tr><th>Plan cadastral</th><td><Mark checked={fiche.cadastralPlan} label="" /></td></tr>
          <tr><th>Certificat d’urbanisme</th><td><Mark checked={fiche.urbanPlanningCertificate} label="" /></td></tr>
          <tr><th>Acte</th><td><Mark checked={fiche.titleDeed} label="" /></td></tr>
          <tr><th>Livret foncier</th><td><Mark checked={fiche.landRegistryBook} label="" /></td></tr>
          <tr><th>Autre</th><td><Mark checked={fiche.otherDocument} label="" /></td></tr>
        </tbody></table>
      </section>

      <section className="print-section">
        <h2>8. VALIDATION &amp; SIGNATURES</h2>
        <table className="print-table signature-table"><tbody>
          <tr><th>Date de transmission</th><td><Value>{formatFrenchDate(fiche.transmissionDate)}</Value></td></tr>
          <tr><th>Signataire émetteur</th><td><Value>{fiche.senderSignature}</Value></td></tr>
          <tr><th>Date de réception</th><td><Value>{formatFrenchDate(fiche.receptionDate)}</Value></td></tr>
          <tr><th>Signataire récepteur</th><td><Value>{fiche.recipientSignature}</Value></td></tr>
        </tbody></table>
      </section>

      <footer>Document interne — Promotion immobilière</footer>
    </article>
  );
}
