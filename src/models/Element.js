const crypto = require("crypto");
const jstat = require("jstat");
const { RandomFunctionGenerator } = require("../helpers");
const utils = require("./utils");

jstat.setRandom(RandomFunctionGenerator(100));

const fieldOrder = {
  uniform: ["rangeStart", "rangeEnd"],
  normal: ["mean", "std"],
  erlang: ["mean", "dof"],
  exponential: ["lambda"],
};

class Element {
  #queues = [];

  #nextElements = [];
  #availableMods = ["default", "priority", "chance"];
  #nextElementSelectMode = "default";

  #availableDistributions = ["uniform", "erlang", "normal", "exponential"];
  #defaultDelayOptions;

  #currentTime;
  #nextItemStartTime;

  #quantity = 0;
  #id = crypto.randomUUID();
  #name = `element${this.#id}`;

  constructor() {
    this.#nextItemStartTime = 0;
    this.#currentTime = this.#nextItemStartTime;
  }

  getDelay(oneTimeOptions) {
    const options = oneTimeOptions || this.#defaultDelayOptions;
    if (!options) {
      throw "Delay options not set!";
    }

    const { distribution } = options;
    const distributionOptions = options[distribution];

    const generateDelay =
      utils?.[distribution]?.sample || jstat?.[distribution]?.sample;

    return generateDelay(
      ...fieldOrder[distribution].map((field) => distributionOptions[field])
    );
  }

  inAct(entity) {}
  outAct() {
    this.#quantity++;
  }

  canIn() {
    return true;
  }

  addNextElement(element, value) {
    return this.#nextElements.push({ element, value });
  }

  getNextElement(entity) {
    const activeNextElements = this.#nextElements.filter(({ element }) => {
      return !element?.isBlocked?.(entity);
    });

    if (this.#nextElementSelectMode === "chance") {
      const random = Math.random() % 1;

      let prevChance = 0;
      for (let i = 0; i < activeNextElements.length; i++) {
        if (random < prevChance + activeNextElements[i].value) {
          return activeNextElements[i]?.element;
        }

        prevChance = prevChance + activeNextElements[i].value;
      }

      return undefined;
    }

    if (this.#nextElementSelectMode === "priority") {
      return activeNextElements.sort((left, right) => {
        if (left.value > right.value) {
          return -1;
        }

        if (left.value < right.value) {
          return 1;
        }

        return 0;
      })[0]?.element;
    }

    return activeNextElements[
      Math.floor(Math.random() * activeNextElements.length)
    ]?.element;
  }

  getQuantity() {
    return this.#quantity;
  }

  getId() {
    return this.#id;
  }

  setCurrentTime(time) {
    this.#currentTime = time;
  }

  getCurrentTime() {
    return this.#currentTime;
  }

  setNextItemStartTime(time) {
    this.#nextItemStartTime = time;
  }

  getNextItemStartTime() {
    return this.#nextItemStartTime;
  }

  setName(name) {
    this.#name = name;
  }

  getName() {
    return this.#name;
  }

  getQueue(index = 0) {
    if (!this.#queues.length) {
      return ;
    }
    return this.#queues[index].queue;
  } 

  getQueues() {
    return this.#queues;
  }

  addQueue(queue, value) {
    this.#queues.push({queue, value});
  }
  
  resetStats() {
    this.#quantity = 0;
  }

  setNextElementSelectMode(value) {
    if (!this.#availableMods.includes(value)) {
      throw "Choose available mode!";
    }
    this.#nextElementSelectMode = value;
  }
  /*
    ----- set options using following example -----
    options = {
        distribution: "uniform" | "erlang" | "normal" | "exponential",
        uniform: {
            rangeStart: * your range start *,
            rangeEnd: * your range end *,   
        },
        normal: {
            mean: * your mean *,
            std: * your std *,   
        },
        erlang: {
            mean: * your mean *,
            dof: * your dof *,   
        },
        exponential: {
            lambda: *your mean*
        }
    }
    ----- end -----
  */

  getNextElementsLength() {
    return this.#nextElements.length;
  }

  set defaultDelayOptions(options) {
    if (
      !this.#availableDistributions.some(
        (value) => value === options.distribution
      )
    ) {
      const err = `Choose correct distribution: ${this.#availableDistributions.join(
        ", "
      )}`;

      throw err;
    }

    this.#defaultDelayOptions = options;
  }
}

module.exports.Element = Element;
