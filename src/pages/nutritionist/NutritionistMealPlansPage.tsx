import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Apple, Flame, Dumbbell, Wheat, Droplets, Plus, Search, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NutritionistMealPlansPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const templates = [
    {
      id: "tpl-1",
      name: "High Performance Athlete Fueling (3000 kcal)",
      category: "Athlete Performance",
      calories: 3000,
      protein: 190,
      carbs: 380,
      fats: 75,
      description: "Optimized for high-volume court and endurance sessions. High intra-workout carbohydrate focus.",
      preference: "Non-Vegetarian",
    },
    {
      id: "tpl-2",
      name: "Clean Weight Recomposition (2000 kcal)",
      category: "Fat Loss & Muscle Retention",
      calories: 2000,
      protein: 150,
      carbs: 200,
      fats: 60,
      description: "Moderate caloric deficit with high protein density to maintain lean muscle mass during weight loss.",
      preference: "Vegetarian",
    },
    {
      id: "tpl-3",
      name: "Plant-Based Endurance Stack (2500 kcal)",
      category: "Vegan Performance",
      calories: 2500,
      protein: 140,
      carbs: 340,
      fats: 65,
      description: "100% plant-based macronutrient distribution using pea protein, lentils, quinoa, and nuts.",
      preference: "Vegan",
    },
  ];

  const handleApplyTemplate = (name: string) => {
    toast({
      title: "Template Selected",
      description: `Loaded ${name} template into active meal plan editor.`,
    });
  };

  return (
    <DashboardLayout role="nutritionist">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Flame className="w-6 h-6 text-amber-500" /> Meal Plans & Macro Templates
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Create, customize, and assign clinical dietary templates and macronutrient strategies.
            </p>
          </div>

          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Plus className="w-4 h-4" /> Create Meal Template
          </Button>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="border-border hover:border-primary/50 transition-all flex flex-col justify-between">
              <CardHeader className="space-y-2 pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    {tpl.category}
                  </Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                    {tpl.preference}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold">{tpl.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {tpl.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-muted/40 text-center font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Calories</span>
                    <span className="font-bold text-amber-500">{tpl.calories}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Protein</span>
                    <span className="font-bold text-blue-500">{tpl.protein}g</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Carbs</span>
                    <span className="font-bold text-emerald-500">{tpl.carbs}g</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Fats</span>
                    <span className="font-bold text-purple-500">{tpl.fats}g</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleApplyTemplate(tpl.name)}
                  variant="outline"
                  className="w-full text-xs gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Apply to Client
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
