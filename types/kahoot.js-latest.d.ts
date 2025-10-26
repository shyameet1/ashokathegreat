declare module "kahoot.js-latest" {
  export default class Kahoot {
    constructor();
    join(pin: string, name: string): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }
}
