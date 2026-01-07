import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { UserX, UserCog } from "lucide-react";

interface BulkActionsProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkRoleChange: (newRole: string) => void;
  allowedRoles?: string[];
}

export const BulkActions = ({ selectedCount, onBulkDelete, onBulkRoleChange, allowedRoles = ['user', 'admin'] }: BulkActionsProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState("");

  const handleBulkAction = (action: string) => {
    setBulkAction(action);
    if (action === "delete") {
      setShowDeleteDialog(true);
    } else if (action.startsWith("role_")) {
      const role = action.replace("role_", "");
      onBulkRoleChange(role);
      setBulkAction("");
    }
  };

  const confirmBulkDelete = () => {
    onBulkDelete();
    setShowDeleteDialog(false);
    setBulkAction("");
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="flex items-center gap-4 mb-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
        <span className="text-sm font-medium">
          {selectedCount} user{selectedCount > 1 ? 's' : ''} selected
        </span>
        <div className="flex gap-2 flex-1">
          <Select value={bulkAction} onValueChange={handleBulkAction}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Bulk actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delete">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  Delete Selected
                </div>
              </SelectItem>
              {allowedRoles.map(role => (
                <SelectItem key={role} value={`role_${role}`}>
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4" />
                    Change to {role}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} user{selectedCount > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selectedCount} User{selectedCount > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
