export const seconds = (howMany: number) => howMany * 1000;
export const minutes = (howMany: number) => seconds(howMany) * 60;
export const hours = (howMany: number) => minutes(howMany) * 60;
export const days = (howMany: number) => hours(howMany) * 24;
export const weeks = (howMany: number) => days(howMany) * 7;
