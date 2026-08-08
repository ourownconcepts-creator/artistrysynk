import { Button } from "@/components/ui/button";
import { Download, FileText, Table } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";

interface ExportDataProps {
  dataType: "users" | "activity_logs" | "analytics";
  filters?: any;
}

export const ExportData = ({ dataType, filters }: ExportDataProps) => {
  const fetchData = async () => {
    let data: any[] = [];
    
    if (dataType === "users") {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, created_at');
      data = profiles || [];
    } else if (dataType === "activity_logs") {
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });
      data = logs || [];
    } else if (dataType === "analytics") {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at');
      data = profiles || [];
    }
    
    return data;
  };

  const exportToCSV = async () => {
    try {
      const data = await fetchData();

      if (data.length === 0) {
        toast.error("No data to export");
        return;
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(',')).join('\n');
      const csv = `${headers}\n${rows}`;

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}_export_${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  const exportToPDF = async () => {
    try {
      const data = await fetchData();

      if (data.length === 0) {
        toast.error("No data to export");
        return;
      }

      const doc = new jsPDF();
      const title = `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Report`;
      
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

      const headers = Object.keys(data[0]);
      const rows = data.map(row => Object.values(row)) as RowInput[];

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 85, 105] },
      });

      doc.save(`${dataType}_export_${new Date().toISOString()}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToCSV}>
          <Table className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
