import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Flame, Dumbbell, Wheat, Droplets, Save } from "lucide-react";
import type { NutritionClient } from "@/types/nutrition";

interface MealPlanEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: NutritionClient | null;
  onSaveSuccess?: () => void;
}

export default function MealPlanEditorModal({
  open,
  onOpenChange,
  client,
  onSaveSuccess,
}: MealPlanEditorModalProps) {
  const { toast } = useToast();
  const [targetCalories, setTargetCalories] = useState<number>(2400);
  const [proteinG, setProteinG] = useState<number>(160);
  const [carbsG, setCarbsG] = useState<number>(280);
  const [fatsG, setFatsG] = useState<number>(65);
  const [guidelines, setGuidelines] = useState<string>("");

  useEffect(() => {
    if (client) {
      setTargetCalories(client.target_calories || 2400);
      setProteinG(client.protein_g || 160);
      setCarbsG(client.carbs_g || 280);
      setFatsG(client.fats_g || 65);
      setGuidelines(
        `High-protein intake prioritized around session 1. Maintain hydration to > 3.5L/day. Strictly avoid ${
          client.allergies?.length ? client.allergies.join(", ") : "known allergens"
        }.`
      );
    }
  }, [client]);

  const calculatedProteinCalories = proteinG * 4;
  const calculatedCarbsCalories = carbsG * 4;
  const calculatedFatsCalories = fatsG * 9;
  const totalMacroCalories = calculatedProteinCalories + calculatedCarbsCalories + calculatedFatsCalories;

  const handleSave = () => {
    toast({
      title: "Meal Plan Saved",
      description: `Updated meal plan and macro targets for ${client?.name || "client"}.`,
    });
    if (onSaveSuccess) onSaveSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-card border-border text-foreground p-4 sm:p-6">
        <DialogHeader className="shrink-0 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-xl font-bold flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500 shrink-0" />
              Edit Meal Plan & Target Macros
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure macro goals and clinical dietary instructions for{" "}
            <span className="font-semibold text-foreground">{client?.name}</span> ({client?.uhid}).
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1 flex-1 max-h-[calc(90vh-120px)] space-y-6 py-2">
          {/* Quick Info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div className="text-xs">
              <span className="text-muted-foreground">Goal / Sport: </span>
              <span className="font-semibold text-foreground">{client?.sport_or_goal}</span>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {client?.preference}
            </Badge>
          </div>

          {/* Macro Targets Inputs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Target Calories
              </Label>
              <Input
                type="number"
                value={targetCalories}
                onChange={(e) => setTargetCalories(Number(e.target.value))}
                className="font-mono text-lg font-bold"
              />
              <p className="text-[10px] text-muted-foreground">kcal / day</p>
            </div>

            <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-blue-500" /> Protein (g)
              </Label>
              <Input
                type="number"
                value={proteinG}
                onChange={(e) => setProteinG(Number(e.target.value))}
                className="font-mono text-lg font-bold"
              />
              <p className="text-[10px] text-muted-foreground">
                {calculatedProteinCalories} kcal ({totalMacroCalories > 0 ? Math.round((calculatedProteinCalories / totalMacroCalories) * 100) : 0}%)
              </p>
            </div>

            <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Wheat className="w-3.5 h-3.5 text-emerald-500" /> Carbohydrates (g)
              </Label>
              <Input
                type="number"
                value={carbsG}
                onChange={(e) => setCarbsG(Number(e.target.value))}
                className="font-mono text-lg font-bold"
              />
              <p className="text-[10px] text-muted-foreground">
                {calculatedCarbsCalories} kcal ({totalMacroCalories > 0 ? Math.round((calculatedCarbsCalories / totalMacroCalories) * 100) : 0}%)
              </p>
            </div>

            <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-purple-500" /> Fats (g)
              </Label>
              <Input
                type="number"
                value={fatsG}
                onChange={(e) => setFatsG(Number(e.target.value))}
                className="font-mono text-lg font-bold"
              />
              <p className="text-[10px] text-muted-foreground">
                {calculatedFatsCalories} kcal ({totalMacroCalories > 0 ? Math.round((calculatedFatsCalories / totalMacroCalories) * 100) : 0}%)
              </p>
            </div>
          </div>

          {/* Caloric Distribution Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Macro Split (Sum: {totalMacroCalories} kcal)</span>
              <span>Diff vs Target: {totalMacroCalories - targetCalories} kcal</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
              <div
                style={{ width: `${totalMacroCalories > 0 ? (calculatedProteinCalories / totalMacroCalories) * 100 : 0}%` }}
                className="bg-blue-500 h-full"
                title="Protein"
              />
              <div
                style={{ width: `${totalMacroCalories > 0 ? (calculatedCarbsCalories / totalMacroCalories) * 100 : 0}%` }}
                className="bg-emerald-500 h-full"
                title="Carbs"
              />
              <div
                style={{ width: `${totalMacroCalories > 0 ? (calculatedFatsCalories / totalMacroCalories) * 100 : 0}%` }}
                className="bg-purple-500 h-full"
                title="Fats"
              />
            </div>
          </div>

          {/* Clinical Guidelines */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Special Meal & Timing Instructions</Label>
            <Textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              rows={4}
              placeholder="e.g. Consume 30g protein within 30 mins post-workout. High glycemic carbs during intra-session."
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" /> Save Meal Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
