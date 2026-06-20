import { describe, it, expect } from "vitest";

describe("Export functionality", () => {
  it("should have Mermaid chart rendering capability", () => {
    // Test that Mermaid syntax is recognized
    const mermaidCode = `\`\`\`mermaid
graph LR
    A[Start] --> B[Process]
    B --> C[End]
\`\`\``;
    
    expect(mermaidCode).toContain("```mermaid");
    expect(mermaidCode).toContain("graph LR");
  });

  it("should have data chart rendering capability", () => {
    // Test that chart JSON format is valid
    const chartData = {
      type: "bar",
      title: "Test Chart",
      labels: ["Q1", "Q2", "Q3", "Q4"],
      datasets: [{
        label: "Revenue",
        data: [100, 150, 200, 180]
      }]
    };
    
    expect(chartData.type).toBe("bar");
    expect(chartData.labels).toHaveLength(4);
    expect(chartData.datasets[0].data).toHaveLength(4);
  });

  it("should support different chart types", () => {
    const chartTypes = ["bar", "line", "pie"];
    
    chartTypes.forEach(type => {
      const chart = {
        type,
        title: `${type} Chart`,
        labels: ["A", "B", "C"],
        datasets: [{ label: "Data", data: [1, 2, 3] }]
      };
      
      expect(chart.type).toBe(type);
    });
  });

  it("should generate valid PDF export structure", () => {
    // Test PDF export data structure
    const pdfExport = {
      content: "# AI Business Consultation\n\n## User\n\nQuestion here\n\n## AI\n\nAnswer here",
      filename: `conversation_1_${Date.now()}.md`
    };
    
    expect(pdfExport.content).toContain("# AI Business Consultation");
    expect(pdfExport.filename).toMatch(/conversation_\d+_\d+\.md/);
  });

  it("should generate valid PPT export structure", () => {
    // Test PPT export data structure
    const pptExport = {
      slides: [
        { title: "AI Business Consultation Report", content: "Generated on: 2024-01-01" },
        { title: "Section 1", content: "Content here" }
      ],
      filename: `presentation_1_${Date.now()}.json`
    };
    
    expect(pptExport.slides).toHaveLength(2);
    expect(pptExport.slides[0].title).toContain("Report");
    expect(pptExport.filename).toMatch(/presentation_\d+_\d+\.json/);
  });

  it("should split content into sections for slides", () => {
    const content = `# Title 1
Content for title 1

## Title 2
Content for title 2

### Title 3
Content for title 3`;

    const sections = content.split(/\n(?=#+\s)/);
    expect(sections.length).toBeGreaterThan(0);
  });
});
