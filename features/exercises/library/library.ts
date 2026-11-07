/**
 * Static exercise vocabulary, ported verbatim from the prototype
 * (docs/workout-prototype-app.md). This is reference data, not user data —
 * it ships as a module, not a Convex table. See exInfo.ts for how it merges
 * with a user's Convex-backed custom exercises.
 */

export const LIBRARY: Record<string, string[]> = {
  Chest: [
    "Bench Press",
    "Incline Bench Press",
    "Decline Bench Press",
    "Dumbbell Bench Press",
    "Chest Fly",
    "Pec Deck",
    "Push-up",
    "Chest Dip",
    "Cable Fly",
    "Floor Press",
  ],
  Shoulders: [
    "Shoulder Press",
    "Arnold Press",
    "Lateral Raise",
    "Front Raise",
    "Rear Delt Fly",
    "Face Pull",
    "Upright Row",
    "Handstand Push-up",
  ],
  Biceps: [
    "Barbell Curl",
    "Dumbbell Curl",
    "Hammer Curl",
    "Concentration Curl",
    "Incline Curl",
    "Preacher Curl",
    "Cable Curl",
    "Spider Curl",
  ],
  Triceps: [
    "Tricep Pushdown",
    "Overhead Extension",
    "Skullcrusher",
    "Close Grip Bench Press",
    "Bench Dips",
    "Tricep Kickback",
    "Rope Pushdown",
    "One-arm Extension",
  ],
  Lats: [
    "Lat Pulldown",
    "Pull-up",
    "Chin-up",
    "Straight-arm Pulldown",
    "Machine Pulldown",
  ],
  "Upper Back": [
    "Barbell Row",
    "Dumbbell Row",
    "Seated Cable Row",
    "Chest Supported Row",
    "Pendlay Row",
    "T-Bar Row",
    "Inverted Row",
  ],
  "Lower Back": [
    "Back Extension",
    "Good Morning",
    "Romanian Deadlift",
    "Deadlift",
    "Superman",
  ],
  Glutes: [
    "Hip Thrust",
    "Glute Bridge",
    "Cable Kickback",
    "Donkey Kick",
    "Bulgarian Split Squat",
    "Step-up",
    "Glute Machine",
    "Lateral Leg Raise",
  ],
  Quadriceps: [
    "Squat",
    "Front Squat",
    "Hack Squat",
    "Leg Press",
    "Leg Extension",
    "Goblet Squat",
    "Walking Lunge",
    "Reverse Lunge",
  ],
  Hamstrings: [
    "Stiff Leg Deadlift",
    "Lying Leg Curl",
    "Seated Leg Curl",
    "Nordic Curl",
    "Single-leg RDL",
  ],
  Calves: [
    "Standing Calf Raise",
    "Seated Calf Raise",
    "Donkey Calf Raise",
    "Single-leg Calf Raise",
  ],
  Core: [
    "Crunch",
    "Cable Crunch",
    "Hanging Leg Raise",
    "Reverse Crunch",
    "Russian Twist",
    "Plank",
    "Bicycle Crunch",
    "Heel Taps",
    "Mountain Climbers",
    "Ab Wheel Rollout",
  ],
  Forearms: [
    "Wrist Curl",
    "Reverse Wrist Curl",
    "Farmer's Walk",
    "Plate Pinch",
    "Behind-the-back Wrist Curl",
  ],
  Traps: ["Barbell Shrug", "Dumbbell Shrug"],
  Neck: ["Neck Flexion", "Neck Extension", "Neck Lateral Flexion"],
  Olympic: [
    "Clean",
    "Clean & Jerk",
    "Snatch",
    "Hang Clean",
    "Hang Snatch",
    "Push Press",
    "Thruster",
    "Overhead Squat",
  ],
};

export const CARDIO: string[] = [
  "StairMaster",
  "Walking",
  "Running",
  "Cycling",
  "Rowing",
  "Elliptical",
  "Swimming",
];

export type MuscleGroup = { id: string; label: string };

/** The 15 fine-grained muscles a user can assign a custom exercise to,
 * ordered alphabetically by label for display. */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: "abs", label: "Abs / core" },
  { id: "biceps", label: "Biceps" },
  { id: "calves", label: "Calves" },
  { id: "chest", label: "Chest" },
  { id: "forearms", label: "Forearms" },
  { id: "glutes", label: "Glutes" },
  { id: "hamstrings", label: "Hamstrings" },
  { id: "lats", label: "Lats" },
  { id: "lower_back", label: "Lower back" },
  { id: "obliques", label: "Obliques" },
  { id: "quadriceps", label: "Quads" },
  { id: "shoulders_side", label: "Shoulders" },
  { id: "traps", label: "Traps" },
  { id: "triceps", label: "Triceps" },
  { id: "upper_back", label: "Upper back" },
];

/** All 19 fine-grained muscle ids (superset of MUSCLE_GROUPS, includes
 * front/rear delt splits and hip flexor/adductor/abductor that only appear
 * as secondary muscles, not as custom-exercise assignment targets). */
export const MUSCLE_LABEL: Record<string, string> = {
  chest: "Chest",
  shoulders_front: "Front delts",
  shoulders_side: "Side delts",
  shoulders_rear: "Rear delts",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  traps: "Traps",
  lats: "Lats",
  upper_back: "Upper back",
  lower_back: "Lower back",
  abs: "Abs",
  obliques: "Obliques",
  glutes: "Glutes",
  quadriceps: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
  hip_flexors: "Hip flexors",
  adductors: "Adductors",
  abductors: "Abductors",
};

export function muscleLabel(id: string): string {
  return MUSCLE_LABEL[id] ?? id;
}

/** Fine-grained muscle id -> broad muscle-group name, used for the
 * Statistics tab's weekly-set-target tracking. */
export const BROAD: Record<string, string> = {
  chest: "Chest",
  shoulders_front: "Shoulders",
  shoulders_side: "Shoulders",
  shoulders_rear: "Shoulders",
  biceps: "Arms",
  triceps: "Arms",
  forearms: "Arms",
  traps: "Back",
  lats: "Back",
  upper_back: "Back",
  lower_back: "Back",
  abs: "Core",
  obliques: "Core",
  hip_flexors: "Core",
  glutes: "Glutes",
  abductors: "Glutes",
  adductors: "Glutes",
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

/**
 * Spokes on the Statistics trends radar. `Legs` is the sum of the four
 * leg groups below; it is not its own weekly set target.
 */
export const RADAR_AXES = ["Back", "Chest", "Core", "Shoulders", "Legs", "Arms"] as const;

export type RadarAxis = (typeof RADAR_AXES)[number];

/** Display order for the 9 broad muscle groups on the Statistics tab. */
export const GROUP_ORDER: string[] = [
  "Glutes",
  "Hamstrings",
  "Quadriceps",
  "Calves",
  "Back",
  "Shoulders",
  "Chest",
  "Arms",
  "Core",
];

/** Fallback weekly [min, max] set targets per broad group, used when the
 * user hasn't set their own via the Statistics tab. */
export const DEFAULT_TARGETS: Record<string, [number, number]> = {
  Glutes: [16, 20],
  Hamstrings: [12, 14],
  Quadriceps: [10, 14],
  Calves: [8, 10],
  Back: [4, 6],
  Shoulders: [6, 8],
  Chest: [6, 8],
  Arms: [6, 8],
  Core: [8, 10],
};
