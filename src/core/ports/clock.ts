export interface Clock {
  now(): number;
}

export interface IdGenerator {
  newId(): string;
}
