import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ElementType;
  suggestedFeatures?: string[];
}

export function PlaceholderPage({ 
  title, 
  description, 
  icon: Icon, 
  suggestedFeatures = [] 
}: PlaceholderPageProps) {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-ocean-100 rounded-full flex items-center justify-center mb-4">
              <Icon className="h-8 w-8 text-ocean-600" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground text-lg">{description}</p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Construction className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-800">Under Development</span>
              </div>
              <p className="text-sm text-amber-700">
                This feature is currently being built. Continue prompting our AI assistant to help develop this page with the specific functionality you need.
              </p>
            </div>

            {suggestedFeatures.length > 0 && (
              <div className="text-left">
                <h3 className="font-medium mb-3">Suggested Features to Build:</h3>
                <ul className="space-y-2">
                  {suggestedFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-ocean-400 rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button>
                Request Feature Development
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
