export type ExportFormat = "csv" | "excel" | "pdf" | "json";

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportRequest {
  format: ExportFormat;
  filename: string;
  data: Record<string, unknown>[];
  columns: ExportColumn[];
}

export interface ExportService {
  export(request: ExportRequest): Promise<Blob>;
  getContentType(format: ExportFormat): string;
  getFileExtension(format: ExportFormat): string;
}

export interface ScheduledExportConfig {
  enabled: boolean;
  format: ExportFormat;
  schedule: "daily" | "weekly" | "monthly";
  recipients: string[];
  tenantId?: string;
  metricIds?: string[];
  timezone?: string;
}

class CSVExportService implements ExportService {
  async export(request: ExportRequest): Promise<Blob> {
    const header = request.columns.map((c) => `"${c.label}"`).join(",");
    const rows = request.data.map((row) =>
      request.columns.map((c) => `"${String(row[c.key] ?? "")}"`).join(",")
    );
    const content = [header, ...rows].join("\n");
    return new Blob([content], { type: this.getContentType("csv") });
  }

  getContentType(format: ExportFormat): string {
    void format;
    return "text/csv;charset=utf-8;";
  }

  getFileExtension(format: ExportFormat): string {
    void format;
    return ".csv";
  }
}

class JSONExportService implements ExportService {
  async export(request: ExportRequest): Promise<Blob> {
    const jsonRows = request.data.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const col of request.columns) {
        obj[col.label] = row[col.key];
      }
      return obj;
    });
    const content = JSON.stringify(jsonRows, null, 2);
    return new Blob([content], { type: this.getContentType("json") });
  }

  getContentType(format: ExportFormat): string {
    void format;
    return "application/json;charset=utf-8;";
  }

  getFileExtension(format: ExportFormat): string {
    void format;
    return ".json";
  }
}

class ExcelExportService implements ExportService {
  async export(request: ExportRequest): Promise<Blob> {
    const csv = await csvService.export({ ...request, format: "csv" });
    return new Blob([await csv.text()], { type: this.getContentType("excel") });
  }

  getContentType(format: ExportFormat): string {
    void format;
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  getFileExtension(format: ExportFormat): string {
    void format;
    return ".xlsx";
  }
}

class PDFExportService implements ExportService {
  async export(request: ExportRequest): Promise<Blob> {
    const csv = await csvService.export({ ...request, format: "csv" });
    return new Blob([await csv.text()], { type: this.getContentType("pdf") });
  }

  getContentType(format: ExportFormat): string {
    void format;
    return "application/pdf";
  }

  getFileExtension(format: ExportFormat): string {
    void format;
    return ".pdf";
  }
}

const csvService = new CSVExportService();

export const exportService: Record<ExportFormat, ExportService> = {
  csv: csvService,
  excel: new ExcelExportService(),
  pdf: new PDFExportService(),
  json: new JSONExportService(),
};

export async function exportAnalytics(request: ExportRequest): Promise<Blob> {
  const service = exportService[request.format];
  if (!service) throw new Error(`Unsupported format: ${request.format}`);
  return service.export(request);
}
