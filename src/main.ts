import "./style.css";

class Result {
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
    return `${this.a}A${this.b}B`;
  }

  equals(that: Result) {
    return this.a === that.a && this.b === that.b;
  }
}

interface Guess {
  value: string;
  result: Result;
}

let guesses: Guess[] = [];
let candidates: string[] = [];
let length: number;

let page = 0;

let guessInput: HTMLInputElement, resultInput: HTMLInputElement;
let addButton: HTMLButtonElement;

let guessesList: HTMLDivElement, candidatesList: HTMLDivElement;
let guessesTitle: HTMLDivElement, candidatesTitle: HTMLDivElement;
let guessesAppendTarget: HTMLTableSectionElement, candidatesAppendTarget: HTMLDivElement;

function addGuess() {
  let value = guessInput.value;
  let result = Result.parse(resultInput.value);

  if (!value || !value.match(/^\d+$/) || !result || result.a + result.b > value.length) return;

  if (!length) {
    length = value.length;
    initializeCandidates();
  }

  if (value.length !== length) return;

  guesses.push({ value, result });
  refresh();
}

function refresh() {
  guessInput.value = "";
  resultInput.value = "";

  shrinkCandidates();

  reflectGuesses();
  reflectCandidates();
}

function initializeCandidates() {
  const digits = "0123456789";

  function backtrack(current: string) {
    if (current.length === length) {
      candidates.push(current);
      return;
    }

    for (const d of digits) {
      if (!current.includes(d))
        backtrack(current + d);
    }
  }

  backtrack("");
}

function shrinkCandidates() {
  let lastGuess = guesses.at(-1)!;

  let oldCandidates = [...candidates];
  candidates = [];
  for (let c of oldCandidates) {
    if (compare(c, lastGuess.value).equals(lastGuess.result))
      candidates.push(c);
  }
}

function compare(candy: string, target: string) {
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

function reflectGuesses() {
  let lastGuess = guesses.at(-1)!;

  let tr = document.createElement("tr");

  let td1 = document.createElement("td");
  td1.textContent = lastGuess.value;
  tr.appendChild(td1);

  let td2 = document.createElement("td");
  td2.textContent = lastGuess.result.toString();
  tr.appendChild(td2);

  guessesAppendTarget.appendChild(tr);
}

function reflectCandidates() {
  for (let c of candidates) {
    let id = `candidate-${c}`;
    let el = document.querySelector("#" + id);
    
    if (!el) {
      el = document.createElement("span");
      el.id = id;
      el.classList.add("candidate");
      el.textContent = c;
      candidatesAppendTarget.appendChild(el);
    }
  }

  let lookup = new Map<string, boolean>(
    candidates.map(candy => [candy, true])
  );

  let children: HTMLSpanElement[] = [];
  function getRects() {
    children = [...candidatesAppendTarget.children] as HTMLSpanElement[];
    return children.map(e => e.getBoundingClientRect());
  };

  let oldRects = getRects();
  for (let [i, child] of children.entries()) {
    child.setAttribute("data-index", i.toString());

    if (!lookup.has(child.id.split("-")[1])) {
      child.style.width = "0px";
      child.style.padding = "0px";
      child.style.fontSize = "0px";
    }
  }

  let rects = getRects();
  for (let [i, child] of children.entries()) {
    const dx = oldRects[Number.parseInt(child.getAttribute("data-index")!)]!.left - rects[i]!.left || 0;
    const dy = oldRects[Number.parseInt(child.getAttribute("data-index")!)]!.top  - rects[i]!.top  || 0;

    child.style.transition = "none";
    child.style.transform = `translate(${dx}px, ${dy}px)`;
    child.clientHeight; // Reflow
  }

  for (let child of children) {
    child.style.transition = "";
    child.style.transform = "";
  }
}

function handleResize() {
  if (window.innerWidth > 768) {
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
