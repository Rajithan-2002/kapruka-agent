import { IntelligenceTrace } from "../types/intelligence.types";

export class IntelligenceTracer {
  private traces: IntelligenceTrace[] = [];

  /**
   * Starts a trace for a specific engine and returns an end function.
   * @param engine The name of the engine (e.g., 'IntentEngine', 'SituationAnalyzer')
   * @param inputs Optional inputs passed into the engine
   */
  public startTrace(engine: string, inputs?: any) {
    const startTime = Date.now();

    return {
      end: (outputs: any, confidence: number, reasoning?: string): IntelligenceTrace => {
        const trace: IntelligenceTrace = {
          engine,
          timestamp: Date.now(),
          confidence,
          latencyMs: Date.now() - startTime,
          inputs,
          outputs,
          reasoning
        };
        this.traces.push(trace);
        return trace;
      }
    };
  }

  public getTraces(): IntelligenceTrace[] {
    return [...this.traces];
  }

  public clearTraces(): void {
    this.traces = [];
  }
}
