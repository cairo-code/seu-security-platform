export class CapacityError extends Error {
  public readonly statusCode = 503;
  public readonly runningCount: number;
  public readonly maxContainers: number;

  constructor(runningCount: number, maxContainers: number) {
    super(`Container limit reached: ${runningCount}/${maxContainers}`);
    this.name = 'CapacityError';
    this.runningCount = runningCount;
    this.maxContainers = maxContainers;
  }
}