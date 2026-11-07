import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { parseAssessmentXLS } from "@/components/shared/assessment/XlsParser";
import StrengthOverview from "@/components/shared/assessment/StrengthOverview";

describe("StrengthOverview Component", () => {
  it("renders all categories and allows switching between them for legacy template format", async () => {
    const filePath = path.resolve(__dirname, "../../mock_reports/test_report_RAHUL_LOKESH_2026-06-05_12_42.xls");
    const buffer = fs.readFileSync(filePath);
    const file = new File([buffer], "test_report_RAHUL_LOKESH_2026-06-05_12_42.xls", {
      type: "application/vnd.ms-excel",
    });

    const parsed = await parseAssessmentXLS(file);
    const { container } = render(
      <StrengthOverview strengthSummary={parsed.strengthSummary} activeTestIndex={3} />
    );

    // Default should be Lumbar (has active test 3 data)
    let rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(6);
    expect(container.textContent).toContain("Lumbar Thoracic Extension");

    // Check table headers: should contain % Improvement (vs T1) and (vs T2), but NO Clinical Impression column
    const tableHeader = container.querySelector("thead");
    expect(tableHeader?.textContent).toContain("% Improvement(vs T1)");
    expect(tableHeader?.textContent).toContain("% Improvement(vs T2)");
    expect(tableHeader?.textContent).not.toContain("Clinical Impression");

    // Click Cervical Spine
    const cervicalCard = screen.getByText(/Cervical Spine/i).closest('[role="button"]');
    expect(cervicalCard).toBeTruthy();
    fireEvent.click(cervicalCard!);

    rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(6);
    expect(container.textContent).toContain("Cervical Sagittal Extension");

    // Click Hip and Knee
    const hipCard = screen.getByText(/Hip and Knee/i).closest('[role="button"]');
    expect(hipCard).toBeTruthy();
    fireEvent.click(hipCard!);

    rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(12);
    expect(container.textContent).toContain("Knee Extension Both");
    expect(container.textContent).toContain("Hip Extension Right");

    // Click Shoulder
    const shoulderCard = screen.getByText(/Shoulder/i).closest('[role="button"]');
    expect(shoulderCard).toBeTruthy();
    fireEvent.click(shoulderCard!);

    rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(14);
    expect(container.textContent).toContain("Chest Press Both");
    expect(container.textContent).toContain("Lateral Pulldown");
    expect(container.textContent).toContain("Shoulder Diagonal Abduction");
  });

  it("parses and renders new template format with vs T1 and vs T2 improvements and no Clinical Impression column", async () => {
    const filePath = path.resolve(__dirname, "../../test_report_RAHUL_LOKESH_2026-10-29_15_04.xls");
    const buffer = fs.readFileSync(filePath);
    const file = new File([buffer], "test_report_RAHUL_LOKESH_2026-10-29_15_04.xls", {
      type: "application/vnd.ms-excel",
    });

    const parsed = await parseAssessmentXLS(file);

    expect(parsed.client.name).toBe("RAHUL LOKESH");
    expect(parsed.client.tests.length).toBe(3);

    // Verify all 4 categories parsed properly
    expect(parsed.strengthSummary["Cervical spine"].metrics.length).toBe(6);
    expect(parsed.strengthSummary["Lumbar / Thoracic Spine"].metrics.length).toBe(6);
    expect(parsed.strengthSummary["Hip and knee"].metrics.length).toBe(12);
    expect(parsed.strengthSummary["Shoulder and arm"].metrics.length).toBe(14);

    // Render StrengthOverview with the new parsed format
    const { container } = render(
      <StrengthOverview strengthSummary={parsed.strengthSummary} activeTestIndex={3} />
    );

    // Sublabels for new format should be present
    expect(container.textContent).toContain("Neck");
    expect(container.textContent).toContain("Torso");
    expect(container.textContent).toContain("Upper Limbs");
    expect(container.textContent).toContain("Lower Limbs");

    // Table header checks
    const tableHeader = container.querySelector("thead");
    expect(tableHeader?.textContent).toContain("(vs T1)");
    expect(tableHeader?.textContent).toContain("(vs T2)");
    expect(tableHeader?.textContent).not.toContain("Clinical Impression");

    // Check table rows render
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(6); // Lumbar default
  });
});
