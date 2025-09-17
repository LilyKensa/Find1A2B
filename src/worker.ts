/// <reference lib="webworker" />

import { Utils, WorkerEvent, type Guess, type WorkerEventInit } from "./shared";

type Callback = (data: any) => Promise<Record<string, any> | void>;

interface Job {
  receive: WorkerEvent;
  toss: WorkerEvent;
  callback: Callback;
}

let jobs: Partial<Record<WorkerEvent, Job>> = {};

function addJob(receive: WorkerEvent, toss: WorkerEvent, callback: Callback) {
  jobs[receive] = {
    receive,
    toss,
    callback
  };
}

self.addEventListener("message", async (ev: WorkerEventInit) => {
  let job = jobs[ev.data.type];
  if (!job) return;
  
  self.postMessage({
    ...await job.callback(ev.data),
    type: job.toss,
  });
});

let guesses: Guess[] = [];
let candidates: string[] = [];
let length: number;

addJob(WorkerEvent.AddGuess, WorkerEvent.AddGuessDone, async (data) => {
  guesses.push(data.guess);
  console.log(guesses);
});

async function initializeCandidates() {
  const digits = "0123456789";

  async function backtrack(current: string) {
    if (current.length === length) {
      candidates.push(current);
      return;
    }

    for (const d of digits) {
      if (!current.includes(d))
        await backtrack(current + d);
    }
  }

  await backtrack("");
}

addJob(WorkerEvent.InitializeCandidates, WorkerEvent.InitializeCandidatesDone, async (data) => {
  length = data.length;
  await initializeCandidates();
});

async function shrinkCandidates() {
  let lastGuess = guesses.at(-1)!;

  let oldCandidates = [...candidates];
  candidates = [];
  for (let c of oldCandidates) {
    if (Utils.compare(c, lastGuess.value).equals(lastGuess.result))
      candidates.push(c);
  }
}

addJob(WorkerEvent.ShrinkCandidates, WorkerEvent.ShrinkCandidatesDone, async () => {
  await shrinkCandidates();
  return { candidates };
});
