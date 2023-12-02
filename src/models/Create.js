const { Element } = require("./Element");

class Create extends Element {
  #generateInputElement = () => ({});

  constructor(generateInputElement) {
    super();
    this.#generateInputElement =
      generateInputElement || this.#generateInputElement;
    super.setName("Creator" + super.getId());
  }

  outAct() {
    super.outAct();
    super.setNextItemStartTime(super.getCurrentTime() + super.getDelay());

    const newInputElement = this.#generateInputElement();

    super.getNextElement(newInputElement)?.inAct?.(newInputElement);
  }

  printResult() {
    console.log(super.getName() + " quantity = " + this.getQuantity() + "\n");
  }
}

module.exports.Create = Create;
