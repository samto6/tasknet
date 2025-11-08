"use client";

type View = "calendar" | "gantt" | "weekly";

type Props = {
  currentView: View;
  onViewChange: (view: View) => void;
};

export default function TimelineNav({ currentView, onViewChange }: Props) {
  const tabs: { id: View; label: string; icon: string }[] = [
    { id: "calendar", label: "Calendar", icon: "📅" },
    { id: "gantt", label: "Timeline", icon: "📊" },
    { id: "weekly", label: "Weekly", icon: "📋" },
  ];

  return (
    <div className="flex gap-2 border-b-2 border-border mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
            currentView === tab.id
              ? "text-sage-green"
              : "text-muted hover:text-foreground"
          }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          {currentView === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage-green" />
          )}
        </button>
      ))}
    </div>
  );
}
