export enum TrainingFocus {
  PHYSICAL = "physical",
  TECHNICAL = "technical",
  TACTICAL = "tactical",
  REST = "rest",
}

export enum Position {
  GK = "GK",
  DF = "DF",
  MF = "MF",
  FW = "FW",
}

export enum StaffRole {
  HEAD_COACH = "head_coach",
  ASSISTANT_COACH = "assistant_coach",
  FITNESS_COACH = "fitness_coach",
  MEDICAL_DOCTOR = "medical_doctor",
  PHYSIOTHERAPIST = "physiotherapist",
  SCOUT = "scout",
  FOOTBALL_DIRECTOR = "football_director",
  EXECUTIVE_DIRECTOR = "executive_director",
}

export enum MatchEventType {
  GOAL = "goal",
  ASSIST = "assist",
  YELLOW_CARD = "yellow_card",
  RED_CARD = "red_card",
  SUBSTITUTION = "substitution",
  INJURY = "injury",
  VAR_CHECK = "var_check",
  PENALTY = "penalty",
  SHOT = "shot",
  SAVE = "save",
  FOUL = "foul",
  CORNER = "corner",
  OFFSIDE = "offside",
  FINISHED = "finished",
  PENALTY_SHOOTOUT = "penalty_shootout",
}

export enum TransferType {
  TRANSFER = "transfer",
  LOAN = "loan",
  FREE = "free",
}

export enum FinancialCategory {
  TICKET_SALES = "ticket_sales",
  TV_RIGHTS = "tv_rights",
  SPONSORS = "sponsors",
  TRANSFER_IN = "transfer_in",
  TRANSFER_OUT = "transfer_out",
  PRIZE = "prize",
  SALARY = "salary",
  STAFF_SALARY = "staff_salary",
  STADIUM_MAINTENANCE = "stadium_maintenance",
  INFRASTRUCTURE = "infrastructure",
}

export enum WeatherCondition {
  SUNNY = "sunny",
  RAINY = "rainy",
  CLOUDY = "cloudy",
  SNOWY = "snowy",
  WINDY = "windy",
}

export enum CompetitionFormat {
  LEAGUE = "league",
  KNOCKOUT = "knockout",
  GROUP_KNOCKOUT = "group_knockout",
}

export enum MatchState {
  NOT_STARTED = "not_started",
  PLAYING = "playing",
  PAUSED = "paused",
  FINISHED = "finished",
}

export enum TransferStatus {
  PENDING = "pending",
  NEGOTIATING = "negotiating",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  WITHDRAWN = "withdrawn",
}

export enum TransferStrategy {
  AGGRESSIVE = "aggressive",
  BALANCED = "balanced",
  YOUTH_FOCUSED = "youth_focused",
  SELLING_CLUB = "selling_club",
  REBUILDING = "rebuilding",
}

export enum InterestLevel {
  OBSERVING = "observing",
  INTERESTED = "interested",
  HIGH_PRIORITY = "high_priority",
  CRITICAL = "critical",
}
