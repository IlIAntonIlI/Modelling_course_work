const { Element } = require("./Element");
const { Block } = require("./Block");

class Queue extends Element {
  #elements = [];
  #selectFunction = (queue) => queue.shift();
  #maxQueue = Number.MAX_SAFE_INTEGER;
  #queueTotalLength = 0;
  #failures = 0;
  #value = 0;

  constructor(maxQueue, selectFunction, value) {
    super();
    this.#selectFunction = selectFunction || this.#selectFunction;
    this.#maxQueue = maxQueue || this.#maxQueue;
    this.#value = value || this.#value;
    super.setNextItemStartTime(Number.MAX_SAFE_INTEGER);
    super.setName("Queue" + super.getId());
  }

  inAct(entity) {
    if (this.canIn()) {
      const nextElement = super.getNextElement();

      if (nextElement?.canIn?.()) {
        return nextElement.inAct(entity);
      }

      return this.#elements.push(entity);
    }

    this.#failures++;
  }

  outAct() {
    super.outAct();
    const entity = this.#selectFunction(this.#elements);

    const queue = super.getQueue();
    if (queue) {
      this.#elements.push(queue.outAct());
    }

    return entity;
  }

  canIn() {
    return this.#elements.length < this.#maxQueue;
  }

  addNextElement(element) {
    super.addNextElement(element);
    if (element instanceof Block) {
      const blockNextElement = element.getNextElement();
      blockNextElement.addQueue(this, this.#value);
      return ;
    }
    element.addQueue(this, this.#value);
  }

  doStatistics(delta) {
    this.#queueTotalLength =
      this.#queueTotalLength + this.#elements.length * delta;
  }


  resetStats() {
    super.resetStats();
    this.#failures = 0;
    this.#queueTotalLength = 0;
  }

  getFailures() {
    return this.#failures;
  }

  getNextItemStartTime() {
    return Number.MAX_SAFE_INTEGER;
  }

  getQueueTotalLength() {
    return this.#queueTotalLength;
  }

  shift() {
    return this.#elements.shift();
  }

  unshift(element) {
    this.#elements.unshift(element);
  }

  push(element) {
    this.#elements.push(element);
  }

  pop() {
    return this.#elements.pop();
  }

  get length() {
    return this.#elements.length;
  }

  get elements() {
    return this.#elements;
  }
}

module.exports.Queue = Queue;
