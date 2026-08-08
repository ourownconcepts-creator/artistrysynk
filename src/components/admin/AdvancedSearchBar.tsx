import { Input } from "@/components/ui/input";
import { Search, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter?: string | string[];
  onRoleFilterChange: (value: string | string[]) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  multiRoleSelect?: boolean;
}

export const SearchBar = ({ 
  searchTerm, 
  onSearchChange, 
  roleFilter, 
  onRoleFilterChange,
  dateRange,
  onDateRangeChange,
  multiRoleSelect = false
}: SearchBarProps) => {
  const roles = ['user', 'admin', 'master_admin', 'super_admin'];
  const selectedRoles = Array.isArray(roleFilter) ? roleFilter : (roleFilter === 'all' || !roleFilter) ? [] : [roleFilter];

  const handleRoleToggle = (role: string) => {
    if (!multiRoleSelect) {
      onRoleFilterChange(role);
      return;
    }

    const newSelection = selectedRoles.includes(role)
      ? selectedRoles.filter(r => r !== role)
      : [...selectedRoles, role];
    
    onRoleFilterChange(newSelection.length === 0 ? 'all' : newSelection);
  };

  const clearRoleFilters = () => {
    onRoleFilterChange('all');
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, username, or email..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {multiRoleSelect && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <Search className="mr-2 h-4 w-4" />
                Roles {selectedRoles.length > 0 && `(${selectedRoles.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px]" align="start">
              <div className="space-y-3">
                <div className="font-semibold text-sm">Filter by roles</div>
                {roles.map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={() => handleRoleToggle(role)}
                    />
                    <Label
                      htmlFor={`role-${role}`}
                      className="text-sm font-normal cursor-pointer capitalize"
                    >
                      {role.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
                {selectedRoles.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRoleFilters}
                    className="w-full"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {onDateRangeChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left">
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                selected={dateRange}
                onSelect={onDateRangeChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Active Filters Display */}
      {(selectedRoles.length > 0 || dateRange?.from) && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedRoles.map((role) => (
            <Badge key={role} variant="secondary" className="gap-1">
              {role.replace('_', ' ')}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => handleRoleToggle(role)}
              />
            </Badge>
          ))}
          {dateRange?.from && (
            <Badge variant="secondary" className="gap-1">
              {dateRange.to 
                ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
                : format(dateRange.from, "MMM dd")}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => onDateRangeChange?.(undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
