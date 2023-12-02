const { Element } = require("./Element");

class Block extends Element {
  #checkIsBlocked = (entity) => false;

  constructor(checkIsBlocked) {
    super();
    this.#checkIsBlocked = checkIsBlocked || this.#checkIsBlocked;
    super.setNextItemStartTime(Number.MAX_SAFE_INTEGER);
    super.setName("Block" + super.getId());
  }

  inAct(entity) {
    super.getNextElement(entity)?.inAct?.(entity);
  }

  isBlocked(entity) {
    return this.#checkIsBlocked(entity);
  }
}

module.exports.Block = Block;
