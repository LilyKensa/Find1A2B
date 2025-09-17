export class Result {
  a = 0;
  b = 0;

  static from(a: number, b: number) {
    let result = new Result();
    result.a = a;
    result.b = b;
    return result;
  }

  static parse(text: string, fallback = true): Result | null {
    let matched = text.trim().match(/(\d+)a(\d+)b/i);
    if (!matched)
      return fallback 
        ? this.parse("0A" + text, false) || this.parse(text + "0B", false) 
        : null;

    return Result.from(Number.parseInt(matched[1]), Number.parseInt(matched[2]));
  }

  toString() {
    return (this.a ? this.a + "A" : "  ") + (this.b ? this.b + "B" : "  ");
  }

  equals(that: Result) {
    return this.a === that.a && this.b === that.b;
  }
}

export interface Guess {
  value: string;
  result: Result;
}

export enum WorkerEvent {
  AddGuess,
  AddGuessDone,
  InitializeCandidates,
  InitializeCandidatesDone,
  ShrinkCandidates,
  ShrinkCandidatesDone
}

export type WorkerEventInit<T extends Record<string, any> = {}> = MessageEvent<T & {
  type: WorkerEvent
}>;

export class Utils {
  static compare(candy: string, target: string) {
    let a = 0;
    let b = 0;
  
    const candyArr = candy.split('');
    const targetArr = target.split('');
  
    // Count A (exact matches)
    for (let i = 0; i < candyArr.length; i++) {
      if (candyArr[i] === targetArr[i]) {
        a++;
      }
    }
  
    // Count total matches (ignoring positions)
    const candyFreq: Record<string, number> = {};
    const targetFreq: Record<string, number> = {};
  
    for (const ch of candyArr) {
      candyFreq[ch] = (candyFreq[ch] || 0) + 1;
    }
    for (const ch of targetArr) {
      targetFreq[ch] = (targetFreq[ch] || 0) + 1;
    }
  
    for (const ch in candyFreq) {
      if (targetFreq[ch]) {
        b += Math.min(candyFreq[ch], targetFreq[ch]);
      }
    }
  
    // B is total matches minus A
    b -= a;
  
    return Result.from(a, b);
  }
}
