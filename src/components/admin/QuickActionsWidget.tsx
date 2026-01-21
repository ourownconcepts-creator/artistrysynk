import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Flag, 
  AlertTriangle, 
  Shield, 
  Briefcase, 
  Mail, 
  FileText, 
  FolderOpen, 
  ShoppingCart,
  ArrowRight,
  Zap
} from "lucide-react";
import { useAdminPendingCounts, PendingCounts } from "@/hooks/useAdminPendingCounts";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickActionItem {
  key: keyof PendingCounts;
  label: string;
  icon: React.ReactNode;
  tab: string;
  priority: "critical" | "high" | "medium";
  description: string;
}

const quickActionItems: QuickActionItem[] = [
  {
    key: "flags",
    label: "Content Flags",
    icon: <Flag className="h-4 w-4" />,
    tab: "flags",
    priority: "critical",
    description: "Reported content needs review",
  },
  {
    key: "appeals",
    label: "Content Appeals",
    icon: <AlertTriangle className="h-4 w-4" />,
    tab: "flags",
    priority: "critical",
    description: "Users appealing hidden content",
  },
  {
    key: "verifications",
    label: "Verifications",
    icon: <Shield className="h-4 w-4" />,
    tab: "verifications",
    priority: "high",
    description: "Identity verification requests",
  },
  {
    key: "careers",
    label: "Career Applications",
    icon: <Briefcase className="h-4 w-4" />,
    tab: "careers",
    priority: "medium",
    description: "Job applicants awaiting review",
  },
  {
    key: "leads",
    label: "Contact Leads",
    icon: <Mail className="h-4 w-4" />,
    tab: "leads",
    priority: "medium",
    description: "Contact form submissions",
  },
  {
    key: "jobApplications",
    label: "Job Applications",
    icon: <FileText className="h-4 w-4" />,
    tab: "jobs",
    priority: "medium",
    description: "Applications to job postings",
  },
  {
    key: "projectApplications",
    label: "Project Applications",
    icon: <FolderOpen className="h-4 w-4" />,
    tab: "projects",
    priority: "medium",
    description: "Collaboration requests",
  },
  {
    key: "serviceOrders",
    label: "Pending Orders",
    icon: <ShoppingCart className="h-4 w-4" />,
    tab: "marketplace",
    priority: "high",
    description: "Marketplace orders awaiting action",
  },
];

const priorityColors = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
};

interface QuickActionsWidgetProps {
  onTabChange?: (tab: string) => void;
}

export const QuickActionsWidget = ({ onTabChange }: QuickActionsWidgetProps) => {
  const { counts, loading } = useAdminPendingCounts();

  // Filter and sort by priority and count
  const urgentItems = quickActionItems
    .filter((item) => counts[item.key] > 0)
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return counts[b.key] - counts[a.key];
    });

  const totalPending = Object.values(counts).reduce((sum, count) => sum + count, 0);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (urgentItems.length === 0) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">All caught up!</p>
            <p className="text-sm text-green-600 dark:text-green-400">
              No pending items require your attention right now.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Quick Actions Required</CardTitle>
              <CardDescription>
                {totalPending} items need your attention
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            {urgentItems.length} categories
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {urgentItems.slice(0, 8).map((item) => (
            <Button
              key={item.key}
              variant="outline"
              className="h-auto p-3 flex flex-col items-start gap-2 hover:bg-background/80 transition-all group"
              onClick={() => onTabChange?.(item.tab)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${priorityColors[item.priority]}`}>
                    {item.icon}
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                <Badge variant="secondary" className="font-bold">
                  {counts[item.key]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                {item.description}
              </p>
              <div className="flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Review now <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
