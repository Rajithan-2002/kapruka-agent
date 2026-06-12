export type CircuitState = "NORMAL" | "DEGRADED" | "EMERGENCY";

export class CircuitBreaker {
  private static failures = 0;
  private static successes = 0;
  private static totalLatency = 0;
  private static lastStateChange = Date.now();
  private static state: CircuitState = "NORMAL";
  
  // Thresholds
  private static readonly FAILURE_THRESHOLD = 3; // consecutive failures for DEGRADED
  private static readonly EMERGENCY_THRESHOLD = 6; // consecutive failures for EMERGENCY
  private static readonly LATENCY_THRESHOLD_MS = 8000; // latency threshold to trigger DEGRADED
  private static readonly RESET_TIMEOUT_MS = 60000; // auto-recovery window (60s)

  public static recordSuccess(latencyMs: number) {
    this.checkRecovery();
    this.successes++;
    this.failures = 0; // reset consecutive failures
    this.totalLatency += latencyMs;
    
    // If latency is very high, force Degraded mode
    if (latencyMs > this.LATENCY_THRESHOLD_MS && this.state === "NORMAL") {
      this.transitionTo("DEGRADED");
    }
  }

  public static recordFailure() {
    this.checkRecovery();
    this.failures++;
    this.successes = 0;

    if (this.failures >= this.EMERGENCY_THRESHOLD) {
      this.transitionTo("EMERGENCY");
    } else if (this.failures >= this.FAILURE_THRESHOLD && this.state === "NORMAL") {
      this.transitionTo("DEGRADED");
    }
  }

  public static getState(): CircuitState {
    this.checkRecovery();
    return this.state;
  }

  public static forceState(newState: CircuitState) {
    this.transitionTo(newState);
  }

  public static reset() {
    this.failures = 0;
    this.successes = 0;
    this.totalLatency = 0;
    this.state = "NORMAL";
    this.lastStateChange = Date.now();
  }

  private static transitionTo(newState: CircuitState) {
    if (this.state !== newState) {
      console.warn(`[CircuitBreaker] Transitioned from ${this.state} to ${newState} (consec failures: ${this.failures})`);
      this.state = newState;
      this.lastStateChange = Date.now();
    }
  }

  private static checkRecovery() {
    // Attempt recovery after cooldown timeout
    if (this.state !== "NORMAL" && Date.now() - this.lastStateChange > this.RESET_TIMEOUT_MS) {
      console.log(`[CircuitBreaker] Cooldown elapsed. Resetting to NORMAL to test system health.`);
      this.reset();
    }
  }
}
