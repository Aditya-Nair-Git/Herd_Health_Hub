import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Sun, CloudRain, Snowflake, AlertTriangle, Syringe, Droplets, ThermometerSun } from 'lucide-react';

type Season = 'spring' | 'summer' | 'monsoon' | 'winter';

function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 6) return 'summer';
  if (month >= 7 && month <= 9) return 'monsoon';
  return 'winter';
}

const seasonConfig: Record<Season, { label: string; icon: typeof Sun; color: string; tips: { title: string; description: string; type: 'warning' | 'info' | 'tip' }[] }> = {
  spring: {
    label: 'Spring',
    icon: Leaf,
    color: 'text-emerald-600',
    tips: [
      { title: 'Deworming Season', description: 'Schedule deworming treatments for all livestock as parasites become more active.', type: 'warning' },
      { title: 'Grazing Management', description: 'Monitor pasture conditions and rotate grazing areas for optimal nutrition.', type: 'tip' },
      { title: 'Vaccination Checkup', description: 'Review vaccination schedules — spring is ideal for booster shots.', type: 'info' },
    ],
  },
  summer: {
    label: 'Summer',
    icon: Sun,
    color: 'text-amber-500',
    tips: [
      { title: 'Heat Stress Prevention', description: 'Ensure adequate shade and ventilation. Watch for panting, drooling, and lethargy.', type: 'warning' },
      { title: 'Hydration Critical', description: 'Increase water availability. Cattle need 30-50% more water in extreme heat.', type: 'warning' },
      { title: 'Fly & Tick Control', description: 'Apply insect repellents and maintain hygiene to prevent vector-borne diseases.', type: 'tip' },
      { title: 'Feed Quality', description: 'Supplement feed with minerals and electrolytes during peak summer months.', type: 'info' },
    ],
  },
  monsoon: {
    label: 'Monsoon',
    icon: CloudRain,
    color: 'text-blue-500',
    tips: [
      { title: 'Foot Rot Risk', description: 'Keep shelters dry and clean. Inspect hooves regularly for signs of infection.', type: 'warning' },
      { title: 'Waterborne Diseases', description: 'Ensure clean drinking water. Stagnant water increases disease risk.', type: 'warning' },
      { title: 'Vaccination Reminder', description: 'Administer FMD and HS vaccines before peak monsoon season.', type: 'info' },
      { title: 'Shelter Hygiene', description: 'Maintain proper drainage and disinfect shelters frequently.', type: 'tip' },
    ],
  },
  winter: {
    label: 'Winter',
    icon: Snowflake,
    color: 'text-sky-500',
    tips: [
      { title: 'Pneumonia Risk', description: 'Keep livestock sheltered from cold winds. Watch for coughing and nasal discharge.', type: 'warning' },
      { title: 'Nutritional Boost', description: 'Increase caloric intake to help animals maintain body temperature.', type: 'tip' },
      { title: 'Newborn Care', description: 'Provide extra warmth for calves and newborns during cold spells.', type: 'info' },
    ],
  },
};

const typeStyles = {
  warning: 'bg-warning/10 border-warning/30 text-warning-foreground',
  info: 'bg-primary/10 border-primary/30 text-primary',
  tip: 'bg-success/10 border-success/30 text-success-foreground',
};

const typeIcons = {
  warning: AlertTriangle,
  info: Syringe,
  tip: Droplets,
};

export function SeasonalAwarenessFeed() {
  const season = getCurrentSeason();
  const config = seasonConfig[season];
  const SeasonIcon = config.icon;

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <SeasonIcon className={`w-5 h-5 ${config.color}`} />
          Seasonal Health Advisory
        </CardTitle>
        <Badge variant="outline" className="capitalize">
          {config.label} Season
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {config.tips.map((tip, i) => {
            const Icon = typeIcons[tip.type];
            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${typeStyles[tip.type]}`}>
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
