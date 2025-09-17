import { Result, WorkerEvent, type Guess, type WorkerEventInit } from "./shared";
import "./style.css";
import Worker from "./worker?worker";

let worker = new Worker();

let lastGuess: Guess;
let page = 0;

let guessInput: HTMLInputElement, resultInput: HTMLInputElement;
let addButton: HTMLButtonElement;

let guessesList: HTMLDivElement, candidatesList: HTMLDivElement;
let guessesTitle: HTMLDivElement, candidatesTitle: HTMLDivElement;
let guessesAppendTarget: HTMLTableSectionElement, candidatesAppendTarget: HTMLDivElement;
let loadingOverlay: HTMLDivElement;

async function work<T extends Record<string, any>>(toss: WorkerEvent, receive: WorkerEvent, data?: T) {
  worker.postMessage({
    ...data,
    type: toss
  });
  return new Promise<any>((resolve) => {
    let onMessage = (ev: WorkerEventInit<T>) => {
      if (ev.data.type === receive) {
        worker.removeEventListener("message", onMessage);
        resolve(ev.data);
      }
    }
    worker.addEventListener("message", onMessage);
  });
}

async function addGuess() {
  let value = guessInput.value;
  let result = Result.parse(resultInput.value);

  if (!value || !value.match(/^\d+$/) || !result || result.a + result.b > value.length) return;

  if (!length) {
    length = value.length;
    await work(WorkerEvent.InitializeCandidates, WorkerEvent.InitializeCandidatesDone, { length });
  }

  if (value.length !== length) return;

  lastGuess = { value, result };

  await work(WorkerEvent.AddGuess, WorkerEvent.AddGuessDone, { guess: lastGuess });

  page = 1;
  await refresh();
  handleResize();
}

async function refresh() {
  let showLoading = setTimeout(() => {
    loadingOverlay.classList.add("show");
  }, 10);

  guessInput.value = "";
  resultInput.value = "";

  let candidates: string[] = (await work(
    WorkerEvent.ShrinkCandidates, 
    WorkerEvent.ShrinkCandidatesDone
  )).candidates;

  await reflectGuesses();
  await reflectCandidates(candidates);

  clearTimeout(showLoading);
  loadingOverlay.classList.remove("show");
}

async function reflectGuesses() {
  let tr = document.createElement("tr");

  let td1 = document.createElement("td");
  td1.textContent = lastGuess.value;
  tr.appendChild(td1);

  let td2 = document.createElement("td");
  td2.textContent = lastGuess.result.toString();
  tr.appendChild(td2);

  guessesAppendTarget.appendChild(tr);
}

async function reflectCandidates(candidates: string[]) {
  let isFirst = !candidatesAppendTarget.children.length;

  if (isFirst) {
    for (let c of candidates) {
      let el = document.createElement("span");
      el.id = `candidate-${c}`;
      el.classList.add("candidate");
      el.textContent = c;
      candidatesAppendTarget.appendChild(el);
    }
    return;
  }

  let lookup = new Set<string>(candidates);

  let getChildren = () => [...candidatesAppendTarget.children] as HTMLSpanElement[];
  let children = getChildren();

  interface Rect {
    left: number;
    top: number;
  }

  let oldRects: Rect[] = [], rects: Rect[] = [];

  for (let child of children) {
    if (lookup.has(child.id.split("-")[1])) {
      oldRects.push({ 
        left: child.offsetLeft, 
        top: child.offsetTop 
      });
    }
  }

  for (let child of children) {
    if (!lookup.has(child.id.split("-")[1])) {
      child.remove();
    }
  }

  children = getChildren();

  for (let child of children) {
    rects.push({ 
      left: child.offsetLeft, 
      top: child.offsetTop 
    });
  }

  for (let [ oi, child ] of children.entries()) {
    child.style.transition = "none";
    child.style.position = "absolute";
    child.style.left = oldRects[oi].left + "px";
    child.style.top = oldRects[oi].top + "px";
  }

  await new Promise(window.requestAnimationFrame);

  for (let [i, child] of children.entries()) {
    child.style.transition = "";
    child.style.left = rects[i].left + "px";
    child.style.top = rects[i].top + "px";
  }

  setTimeout(() => {
    for (let child of children) {
      child.style.position = "";
      child.style.left = "";
      child.style.top = "";
    }
  }, 500);
}

function handleResize() {
  if (window.innerWidth >= 768) {
    guessesList.classList.add("show");
    candidatesList.classList.add("show");
  }
  else {
    guessesList.classList[page === 0 ? "add" : "remove"]("show");
    candidatesList.classList[page === 1 ? "add" : "remove"]("show");
  }
}

function main() {
  guessInput = document.querySelector(".guess-input")!;
  resultInput = document.querySelector(".result-input")!;
  addButton = document.querySelector(".add-button")!;

  guessesList = document.querySelector(".guesses-list .list-wrapper")!;
  candidatesList = document.querySelector(".candidates-list .list-wrapper")!;

  guessesTitle = document.querySelector(".guesses-list .title")!;
  candidatesTitle = document.querySelector(".candidates-list .title")!;

  guessesAppendTarget = document.querySelector(".guesses-list tbody")!;
  candidatesAppendTarget = document.querySelector(".candidates-list .list-wrapper > *")!;

  loadingOverlay = document.querySelector(".loading-overlay")!;

  candidatesList.style.height = candidatesList.getBoundingClientRect().height + "px";

  addButton.addEventListener("click", addGuess);

  guessesTitle.addEventListener("click", () => {
    page = 0;
    handleResize();
  });
  candidatesTitle.addEventListener("click", () => {
    page = 1;
    handleResize();
  });

  handleResize();
  window.addEventListener("resize", handleResize);
}

window.addEventListener("load", main);
